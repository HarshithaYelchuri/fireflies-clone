from dataclasses import replace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import get_db, init_db, make_engine
from app.main import app
from app.seed import seed_database
from app.seed.data import DEMO_ACCOUNT, MEETINGS


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Tests must not depend on the developer's backend/.env: Google sign-in starts unconfigured.
    unconfigured = replace(settings, google_client_id=None)
    monkeypatch.setattr("app.auth.settings", unconfigured)
    monkeypatch.setattr("app.routers.auth.settings", unconfigured)

    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    init_db(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with TestSession() as db:
        seed_database(db)

    def override_get_db():
        with TestSession() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)  # not used as a context manager, so the real lifespan never runs
    token = client.post("/api/auth/login", json={"email": DEMO_ACCOUNT["email"], "password": DEMO_ACCOUNT["password"]}).json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client
    app.dependency_overrides.clear()
    engine.dispose()


def test_seed_data_references_are_valid():
    for spec in MEETINGS:
        last = len(spec["transcript"]) - 1
        assert all(0 <= t["from"] <= t["to"] <= last for t in spec["topics"]), spec["title"]
        assert all(0 <= a["segment"] <= last for a in spec["action_items"]), spec["title"]


def test_list_meetings_default_sort_newest_first(client):
    body = client.get("/api/meetings").json()
    assert body["total"] == len(MEETINGS)
    dates = [m["started_at"] for m in body["items"]]
    assert dates == sorted(dates, reverse=True)
    assert body["items"][0]["started_at"].endswith("Z")


def test_search_matches_transcript_text(client):
    body = client.get("/api/meetings", params={"q": "sticky sessions"}).json()
    assert [m["title"] for m in body["items"]] == ["Weekly Engineering Standup"]


def test_filter_by_participant_and_platform(client):
    people = client.get("/api/participants", params={"q": "Noah"}).json()
    body = client.get("/api/meetings", params={"participant_id": people[0]["id"]}).json()
    assert body["total"] == 1
    zoom = client.get("/api/meetings", params={"platform": "zoom", "sort": "title", "order": "asc"}).json()
    assert [m["title"] for m in zoom["items"]] == ["Brightwave — Discovery Call", "Website Redesign Kickoff"]


def test_meeting_detail_is_complete(client):
    meeting_id = client.get("/api/meetings").json()["items"][0]["id"]
    detail = client.get(f"/api/meetings/{meeting_id}").json()
    starts = [s["start_time"] for s in detail["segments"]]
    assert starts == sorted(starts) and detail["segments"][0]["speaker"]["name"]
    assert detail["summary"]["keywords"] and detail["topics"] and detail["action_items"]
    assert detail["duration_seconds"] >= detail["segments"][-1]["end_time"]


def test_create_update_delete_meeting(client):
    created = client.post(
        "/api/meetings",
        json={
            "title": "Design sync",
            "started_at": "2026-10-01T15:00:00Z",
            "platform": "google_meet",
            "participants": [{"name": "Priya Raman", "email": "priya@lumenlabs.io", "role": "host"}],
            "transcript": [
                {"speaker_name": "Priya Raman", "start_time": 0, "text": "Let's review the mocks."},
                {"speaker_name": "New Person", "start_time": 4.5, "text": "Sounds good to me."},
            ],
        },
    )
    assert created.status_code == 201
    meeting = created.json()
    assert {p["name"] for p in meeting["participants"]} == {"Priya Raman", "New Person"}
    assert meeting["segments"][0]["end_time"] == 4.5
    assert meeting["duration_seconds"] > 4

    updated = client.patch(f"/api/meetings/{meeting['id']}", json={"title": "Design sync v2", "is_starred": True})
    assert updated.json()["title"] == "Design sync v2" and updated.json()["is_starred"] is True

    attendees = client.patch(
        f"/api/meetings/{meeting['id']}",
        json={"participants": [{"name": "Priya Raman", "email": "priya@lumenlabs.io"}, {"name": "Marcus Chen"}]},
    ).json()["participants"]
    assert [(p["name"], p["role"]) for p in attendees] == [("Marcus Chen", "attendee"), ("Priya Raman", "attendee")]

    assert client.delete(f"/api/meetings/{meeting['id']}").status_code == 204
    assert client.get(f"/api/meetings/{meeting['id']}").status_code == 404
    assert client.get(f"/api/meetings/{meeting['id']}/segments").status_code == 404


def test_action_item_crud(client):
    meeting = client.get("/api/meetings").json()["items"][0]
    assignee = meeting["participants"][0]["id"]

    created = client.post(
        f"/api/meetings/{meeting['id']}/action-items",
        json={"text": "Follow up with legal", "assignee_id": assignee, "due_date": "2026-10-10"},
    )
    assert created.status_code == 201
    item = created.json()
    assert item["meeting_title"] == meeting["title"] and item["assignee"]["id"] == assignee

    done = client.patch(f"/api/action-items/{item['id']}", json={"is_completed": True, "assignee_id": None})
    assert done.json()["is_completed"] is True and done.json()["assignee"] is None

    open_items = client.get("/api/action-items", params={"completed": False}).json()
    assert item["id"] not in [i["id"] for i in open_items]

    bad = client.post(f"/api/meetings/{meeting['id']}/action-items", json={"text": "x", "assignee_id": 9999})
    assert bad.status_code == 422

    assert client.delete(f"/api/action-items/{item['id']}").status_code == 204
    assert client.get(f"/api/action-items/{item['id']}").status_code == 404


def test_summary_and_topics_persist(client):
    meeting_id = client.get("/api/meetings").json()["items"][0]["id"]
    summary = client.put(
        f"/api/meetings/{meeting_id}/summary",
        json={"overview": "Edited overview", "bullet_points": ["One", " "], "keywords": ["A"]},
    ).json()
    assert summary["overview"] == "Edited overview" and summary["bullet_points"] == ["One"]

    topic = client.post(
        f"/api/meetings/{meeting_id}/topics", json={"title": "Wrap-up", "start_time": 10, "end_time": 20}
    ).json()
    assert client.patch(f"/api/topics/{topic['id']}", json={"end_time": 5}).status_code == 422
    assert client.delete(f"/api/topics/{topic['id']}").status_code == 204


def test_segment_validation(client):
    meeting_id = client.get("/api/meetings").json()["items"][0]["id"]
    response = client.post(
        f"/api/meetings/{meeting_id}/segments", json={"start_time": 10, "end_time": 5, "text": "Hi"}
    )
    assert response.status_code == 422


def test_search_explains_each_match(client):
    items = client.get("/api/meetings", params={"q": "interview"}).json()["items"]
    matches = {m["title"]: m["match"] for m in items}
    assert matches["Interview: Senior Frontend Engineer — Noah Williams"]["field"] == "title"
    kickoff = matches["Website Redesign Kickoff"]  # mentions "customer interviews" in the transcript
    assert kickoff["field"] == "transcript" and kickoff["start_time"] is not None
    assert "interview" in kickoff["snippet"].lower()


def test_search_can_be_limited_to_titles(client):
    items = client.get("/api/meetings", params={"q": "interview", "search_in": "title"}).json()["items"]
    assert [m["title"] for m in items] == ["Interview: Senior Frontend Engineer — Noah Williams"]


def test_profile_persists_updates(client):
    profile = client.get("/api/profile").json()
    assert profile["name"] == "Priya Raman" and profile["participant_id"] is not None

    updated = client.patch("/api/profile", json={"name": "Priya R.", "weekly_digest": True, "language": "fr"}).json()
    assert (updated["name"], updated["weekly_digest"], updated["language"]) == ("Priya R.", True, "fr")
    assert client.get("/api/profile").json()["name"] == "Priya R."

    assert client.patch("/api/profile", json={"email": "not-an-email"}).status_code == 422


def test_rejects_malformed_attendees(client):
    meeting_id = client.get("/api/meetings").json()["items"][0]["id"]
    bad_line = {"participants": [{"name": "Harshitha Y <harshitha@example.com"}]}
    assert client.patch(f"/api/meetings/{meeting_id}", json=bad_line).status_code == 422
    bad_email = {"participants": [{"name": "Harshitha Y", "email": "harshitha@"}]}
    assert client.patch(f"/api/meetings/{meeting_id}", json=bad_email).status_code == 422
    ok = {"participants": [{"name": "Harshitha Y", "email": " Harshitha@Example.com ", "role": "host"}]}
    attendees = client.patch(f"/api/meetings/{meeting_id}", json=ok).json()["participants"]
    assert attendees[0]["email"] == "harshitha@example.com"


def test_export_pdf(client):
    meeting_id = client.get("/api/meetings").json()["items"][0]["id"]
    for content in ("summary", "transcript"):
        response = client.get(f"/api/meetings/{meeting_id}/export.pdf", params={"content": content})
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert f"-{content}.pdf" in response.headers["content-disposition"]
        assert response.content.startswith(b"%PDF")
    assert client.get("/api/meetings/9999/export.pdf").status_code == 404


def test_edit_meeting_like_the_ui_does(client):
    """The edit form always resends started_at; it must be stored as a datetime, not its JSON string."""
    meeting = client.get("/api/meetings").json()["items"][0]
    payload = {
        "title": meeting["title"] + " (edited)",
        "description": None,
        "platform": meeting["platform"],
        "started_at": "2026-10-01T09:15:00.000Z",
        "duration_seconds": 300,
        "participants": [{"name": p["name"], "email": p["email"], "role": p["role"]} for p in meeting["participants"]],
    }
    response = client.patch(f"/api/meetings/{meeting['id']}", json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["started_at"] == "2026-10-01T09:15:00Z"
    assert client.get(f"/api/meetings/{meeting['id']}").json()["title"].endswith("(edited)")



# ── Auth ────────────────────────────────────────────────────────────────────


def test_workspace_requires_sign_in(client):
    anonymous = {"Authorization": ""}
    assert client.get("/api/meetings", headers=anonymous).status_code == 401
    assert client.get("/api/meetings", headers={"Authorization": "Bearer not-a-real-token"}).status_code == 401
    assert client.get("/api/health", headers=anonymous).status_code == 200
    assert client.get("/api/auth/config", headers=anonymous).json() == {"google_client_id": None}


def test_signup_login_logout(client):
    client.headers.pop("Authorization")
    signup = client.post("/api/auth/signup", json={"name": "Dev Shah", "email": "Dev@Example.com", "password": "s3cret-pass"})
    assert signup.status_code == 201
    assert signup.json()["user"]["email"] == "dev@example.com" and signup.json()["user"]["has_password"]
    assert client.post("/api/auth/signup", json={"name": "Dev", "email": "dev@example.com", "password": "another-pass"}).status_code == 409
    assert client.post("/api/auth/signup", json={"name": "Dev", "email": "x@example.com", "password": "short"}).status_code == 422

    assert client.post("/api/auth/login", json={"email": "dev@example.com", "password": "wrong-pass"}).status_code == 401
    token = client.post("/api/auth/login", json={"email": "DEV@example.com", "password": "s3cret-pass"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=headers).json()["name"] == "Dev Shah"
    assert client.get("/api/meetings", headers=headers).status_code == 200

    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_profile_is_per_user(client):
    other = client.post("/api/auth/signup", json={"name": "Lee", "email": "lee@example.com", "password": "password-1"}).json()
    assert other["user"]["participant_id"] is None  # no participant record with this email
    client.patch("/api/profile", json={"job_title": "CEO"})
    assert client.get("/api/profile", headers={"Authorization": f"Bearer {other['token']}"}).json()["job_title"] == ""
    taken = client.patch("/api/profile", json={"email": "lee@example.com"})
    assert taken.status_code == 409


def test_google_sign_in(client, monkeypatch):
    client.headers.pop("Authorization")
    assert client.post("/api/auth/google", json={"credential": "x" * 40}).status_code == 503  # not configured

    from app import auth

    claims = {"sub": "google-123", "email": "priya@lumenlabs.io", "email_verified": "true", "name": "Priya G"}
    monkeypatch.setattr(auth, "verify_google_credential", lambda credential: claims)
    first = client.post("/api/auth/google", json={"credential": "x" * 40}).json()["user"]
    assert first["email"] == "priya@lumenlabs.io" and first["google_linked"] and first["has_password"]  # linked to the demo account

    claims.update(sub="google-456", email="new.person@gmail.com", name="New Person")
    created = client.post("/api/auth/google", json={"credential": "y" * 40}).json()["user"]
    assert created["name"] == "New Person" and not created["has_password"]
    login = client.post("/api/auth/login", json={"email": "new.person@gmail.com", "password": "anything"})
    assert login.status_code == 401 and "Google" in login.json()["detail"]


# ── Notes generation ────────────────────────────────────────────────────────


TRANSCRIPT = [
    {"speaker_name": "Ana Gomez", "start_time": 0, "text": "Welcome everyone. Today we review the onboarding checklist and the invite flow."},
    {"speaker_name": "Ben Ito", "start_time": 8, "text": "Customers love the onboarding checklist, but the invite flow confuses new teams."},
    {"speaker_name": "Ana Gomez", "start_time": 18, "text": "Ben, can you rewrite the invite flow copy by Friday?"},
    {"speaker_name": "Ben Ito", "start_time": 26, "text": "Sure. I'll also share the onboarding checklist metrics with the team tomorrow."},
]


def test_creating_a_meeting_with_a_transcript_generates_notes(client):
    meeting = client.post(
        "/api/meetings",
        json={"title": "Onboarding review", "started_at": "2026-10-07T09:00:00Z", "transcript": TRANSCRIPT},
    ).json()
    summary = meeting["summary"]
    assert summary and summary["overview"].startswith("Ana Gomez and Ben Ito discussed")
    assert any("Onboarding" in k for k in summary["keywords"])
    assert meeting["topics"] and meeting["topics"][0]["start_time"] == 0

    items = {i["text"]: i for i in meeting["action_items"]}
    rewrite = items["Rewrite the invite flow copy by Friday"]
    assert rewrite["assignee"]["name"] == "Ben Ito" and rewrite["due_date"] == "2026-10-09"  # Wed → Fri
    share = items["Share the onboarding checklist metrics with the team tomorrow"]
    assert share["assignee"]["name"] == "Ben Ito" and share["due_date"] == "2026-10-08"


def test_generate_notes_endpoint(client):
    bare = client.post("/api/meetings", json={"title": "No transcript", "started_at": "2026-10-07T09:00:00Z"}).json()
    assert bare["summary"] is None
    assert client.post(f"/api/meetings/{bare['id']}/generate-notes").status_code == 422

    meeting = client.post(
        "/api/meetings", json={"title": "Onboarding review", "started_at": "2026-10-07T09:00:00Z", "transcript": TRANSCRIPT}
    ).json()
    client.put(f"/api/meetings/{meeting['id']}/summary", json={"overview": "edited", "bullet_points": [], "keywords": []})
    regenerated = client.post(f"/api/meetings/{meeting['id']}/generate-notes").json()
    assert regenerated["summary"]["overview"] != "edited"
    assert len(regenerated["action_items"]) == len(meeting["action_items"])  # existing tasks are never duplicated


def test_cors_origins_tolerate_dashboard_formatting():
    from app.config import _origins

    assert _origins(' "https://app.example.com/" , http://localhost:3000/,, ') == [
        "https://app.example.com",
        "http://localhost:3000",
    ]
