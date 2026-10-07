"""PDF exports of a meeting's AI notes or transcript (fpdf2 with the built-in Helvetica font)."""

from datetime import timezone

from fpdf import FPDF

from app import models, schemas

BRAND = (105, 56, 239)  # Fireflies violet, #6938ef
TEXT = (16, 24, 40)
MUTED = (102, 112, 133)

PLATFORM_LABELS = {
    "zoom": "Zoom",
    "google_meet": "Google Meet",
    "microsoft_teams": "Microsoft Teams",
    "webex": "Webex",
    "upload": "Upload",
}


def _safe(text: str) -> str:
    """Built-in PDF fonts cover Windows-1252 only; replace other characters instead of failing."""
    return text.encode("cp1252", "replace").decode("cp1252")


def _timestamp(seconds: float) -> str:
    s = int(seconds)
    hours, minutes = divmod(s // 60, 60)
    return f"{hours}:{minutes:02d}:{s % 60:02d}" if hours else f"{minutes}:{s % 60:02d}"


class _MeetingPDF(FPDF):
    def __init__(self, title: str):
        super().__init__(format="A4")
        self.core_fonts_encoding = "cp1252"
        self.doc_title = title
        self.set_title(_safe(title))
        self.set_creator("Hersheys.ai")
        self.set_margins(18, 18, 18)
        self.set_auto_page_break(True, margin=18)

    def footer(self):
        self.set_y(-12)
        self.set_font("helvetica", size=8)
        self.set_text_color(*MUTED)
        self.cell(0, 6, _safe(f"{self.doc_title} · Page {self.page_no()} of {{nb}}"), align="C")

    def write_block(self, text: str, *, size: float = 10, style: str = "", color=TEXT, height: float = 5.5):
        self.set_font("helvetica", style=style, size=size)
        self.set_text_color(*color)
        self.multi_cell(0, height, _safe(text), new_x="LMARGIN", new_y="NEXT")

    def heading(self, text: str):
        self.ln(5)
        self.write_block(text, size=12, style="B", color=BRAND, height=7)
        self.ln(1)

    def bullet(self, text: str, marker: str = "•"):
        self.set_font("helvetica", size=10)
        self.set_text_color(*TEXT)
        self.cell(6, 5.5, _safe(marker))
        self.multi_cell(0, 5.5, _safe(text), new_x="LMARGIN", new_y="NEXT")
        self.ln(0.8)


def _write_header(pdf: _MeetingPDF, meeting: models.Meeting, subtitle: str):
    started = meeting.started_at.replace(tzinfo=meeting.started_at.tzinfo or timezone.utc)
    minutes = max(1, round(meeting.duration_seconds / 60))
    pdf.write_block(subtitle.upper(), size=8, style="B", color=BRAND)
    pdf.ln(1)
    pdf.write_block(meeting.title, size=18, style="B", height=8)
    pdf.ln(1)
    meta = f"{started:%a, %b %d, %Y · %H:%M} UTC · {minutes} min · {PLATFORM_LABELS.get(meeting.platform, meeting.platform)}"
    pdf.write_block(meta, size=9, color=MUTED)
    names = [a.participant.name for a in sorted(meeting.attendances, key=lambda a: a.role != "host")]
    if names:
        pdf.write_block("Participants: " + ", ".join(names), size=9, color=MUTED)
    pdf.ln(2)


def _write_summary(pdf: _MeetingPDF, meeting: models.Meeting):
    summary = meeting.summary
    if summary and summary.keywords:
        pdf.heading("Keywords")
        pdf.write_block(" · ".join(summary.keywords))
    if summary and summary.overview:
        pdf.heading("Overview")
        pdf.write_block(summary.overview)
    if summary and summary.bullet_points:
        pdf.heading("Notes")
        for point in summary.bullet_points:
            pdf.bullet(point)
    if not summary or not (summary.keywords or summary.overview or summary.bullet_points):
        pdf.heading("AI notes")
        pdf.write_block("No AI notes have been written for this meeting.", color=MUTED)

    if meeting.topics:
        pdf.heading("Outline")
        for topic in meeting.topics:
            pdf.write_block(f"{_timestamp(topic.start_time)}  {topic.title}", style="B")
            if topic.summary:
                pdf.write_block(topic.summary, color=MUTED)
            pdf.ln(1.5)

    pdf.heading("Action items")
    if not meeting.action_items:
        pdf.write_block("No action items.", color=MUTED)
    for item in meeting.action_items:
        details = [item.assignee.name if item.assignee else "Unassigned"]
        if item.due_date:
            details.append(f"due {item.due_date:%b %d, %Y}")
        pdf.bullet(f"{item.text}  ({', '.join(details)})", marker="[x]" if item.is_completed else "[ ]")


def _write_transcript(pdf: _MeetingPDF, meeting: models.Meeting):
    pdf.heading("Transcript")
    if not meeting.segments:
        pdf.write_block("This meeting has no transcript.", color=MUTED)
    for segment in meeting.segments:
        speaker = segment.speaker.name if segment.speaker else "Unknown speaker"
        if pdf.get_y() > pdf.page_break_trigger - 18:
            pdf.add_page()  # keep the speaker label on the same page as at least two lines of its text
        pdf.set_font("helvetica", style="B", size=10)
        pdf.set_text_color(*BRAND)
        pdf.cell(pdf.get_string_width(_safe(speaker)) + 3, 5.5, _safe(speaker))
        pdf.write_block(_timestamp(segment.start_time), size=9, color=MUTED)
        pdf.write_block(segment.text)
        pdf.ln(2.5)


def render_meeting_pdf(meeting: models.Meeting, content: schemas.ExportContent) -> bytes:
    pdf = _MeetingPDF(meeting.title)
    pdf.add_page()
    if content == "summary":
        _write_header(pdf, meeting, "Meeting notes")
        _write_summary(pdf, meeting)
    else:
        _write_header(pdf, meeting, "Transcript")
        _write_transcript(pdf, meeting)
    return bytes(pdf.output())
