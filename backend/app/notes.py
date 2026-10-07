"""Built-in meeting-notes generator: keywords, overview, notes, chapters and action items from a transcript.

Deterministic and offline (standard library only), so every meeting gets notes without an API key:

- keywords   most frequent content words and two-word phrases (names, numbers and filler excluded)
- overview   who met and what they discussed, plus the highest-scoring statements
- notes      the next best statements, attributed to their speaker
- chapters   transcript split where the vocabulary of neighbouring lines changes most (TextTiling-style)
- actions    commitments ("I'll …"), requests ("Ben, can you …") and team actions ("let's …", "we need to …"),
             with an assignee and a due date when one is mentioned ("by Friday", "by October twentieth")
"""

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, timedelta

STOPWORDS = frozenset(
    """a about above after again against all also am an and any are as at be because been before being below
    between both but by can cannot could did do does doing down during each few for from further had has have
    having he her here hers herself him himself his how i if in into is it its itself me more most my myself
    no nor not of off on once only or other ought our ours ourselves out over own same she should so some
    such than that the their theirs them themselves then there these they this those through to too under
    until up very was we were what when where which while who whom why with would you your yours yourself
    yourselves don't doesn't didn't isn't aren't wasn't weren't won't wouldn't can't couldn't shouldn't i'm
    i'll i've i'd you're you'll you've you'd we're we'll we've we'd they're they'll they've it's that's
    there's let's what's here's he's she's yeah yes okay ok right just really like um uh well actually
    basically think know mean thing things got get getting going gonna want need lot maybe sure great good
    thanks thank hi hello everyone guys kind sort probably pretty still even much many way make made said say
    see look let us now today will might something anything everything perfect sounds absolutely definitely
    exactly totally quite already able per via etc speaker morning afternoon evening last next first second
    third time times week weeks day days month months year years minute minutes hour hours seconds percent
    one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred thousand
    half couple few lots use used using start started done doing come came went take took give gave put send
    new people end discussed meet together joining join believe productive reasonable straightforward
    conversation question questions awesome nice glad happy affirmative""".split()
)

FILLER = re.compile(
    r"^(?:(?:so|okay|ok|yeah|yes|well|right|alright|great|perfect|sure|affirmative|excellent|hi|hey|thanks|"
    r"thank you|good|cool|got it|understood|absolutely|definitely)[,.!]?\s+)+",
    re.IGNORECASE,
)
CUES = re.compile(
    r"\b(decid|agree|plan|priorit|deadline|launch|ship|commit|next step|action item|risk|budget|goal|"
    r"target|blocker|by (?:monday|tuesday|wednesday|thursday|friday|the end)|\d)",
    re.IGNORECASE,
)
# "Thanks, Alex." / "Morning, Alex" / "Marcus, can you …": people addressed by name aren't topics.
VOCATIVE = re.compile(
    r"\b(?:hi|hey|hello|thanks|thank you|morning|afternoon|evening|okay|ok|sorry|welcome)\W+([A-Z][a-z]+)\b"
    r"|(?:^|[.!?]\s+)([A-Z][a-z]+),\s",
)

COMMITMENT = re.compile(r"\b(?:i'll|i will|i'm going to|i am going to|i can|let me)\s+(?P<task>.+)", re.IGNORECASE)
REQUEST = re.compile(
    r"(?:^|[.!?]\s+)(?:(?P<name>[A-Z][a-z]+),\s+)?(?:can|could|would|will) you(?: please)?\s+(?P<task>.+)",
    re.IGNORECASE,
)
TEAM_ACTION = re.compile(
    r"\b(?:let's|let us|we need to|we should|we'll need to|we have to|next step is to|action item is to)\s+(?P<task>.+)",
    re.IGNORECASE,
)
# Verbs after "I'll …" / "can you …" / "let's …" that don't describe a task ("I can hear you", "I'll need …").
NOT_TASKS = {"think", "hear", "see", "say", "agree", "guess", "imagine", "understand", "tell", "be", "help",
             "confirm", "answer", "ask", "talk", "speak", "try", "do", "need", "have", "want", "like", "love",
             "wrap", "move", "keep", "go", "get", "hope", "start", "begin", "not"}
LEADING_ADVERBS = {"also", "just", "still", "probably", "definitely", "actually", "really", "then", "now", "quickly"}

WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october",
          "november", "december"]
ORDINALS = {word: i for i, word in enumerate(
    "first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth "
    "fifteenth sixteenth seventeenth eighteenth nineteenth twentieth".split(), start=1)}
ORDINALS |= {f"twenty {w}": 20 + i for w, i in list(ORDINALS.items())[:9]}
ORDINALS |= {"thirtieth": 30, "thirty first": 31}
STOPWORDS = STOPWORDS | {word for ordinal in ORDINALS for word in ordinal.split()}
MAX_ACTION_ITEMS = 8


@dataclass
class Line:
    """One transcript segment, as the generator sees it."""

    speaker: str
    speaker_id: int | None
    start: float
    end: float
    text: str


@dataclass
class GeneratedTopic:
    title: str
    summary: str
    start_time: float
    end_time: float


@dataclass
class GeneratedActionItem:
    text: str
    assignee_id: int | None
    timestamp: float
    due_date: date | None


@dataclass
class GeneratedNotes:
    overview: str
    bullet_points: list[str]
    keywords: list[str]
    topics: list[GeneratedTopic] = field(default_factory=list)
    action_items: list[GeneratedActionItem] = field(default_factory=list)


# ── Text helpers ────────────────────────────────────────────────────────────


def _tokens(text: str) -> list[str]:
    return [t.removesuffix("'s") for t in re.findall(r"[a-z][a-z0-9'-]*", text.lower())]


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _clean(sentence: str) -> str:
    sentence = FILLER.sub("", sentence.strip())
    return sentence[:1].upper() + sentence[1:]


def _truncate(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[: text.rfind(" ", 0, limit)].rstrip(",;:") + "…"


def _join(items: list[str]) -> str:
    return items[0] if len(items) == 1 else f"{', '.join(items[:-1])} and {items[-1]}"


def _cosine(a: Counter, b: Counter) -> float:
    dot = sum(a[k] * b[k] for k in a.keys() & b.keys())
    norm = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return dot / norm if norm else 0.0


class _Vocabulary:
    """Content words of a transcript, how they're usually written, and which words to ignore."""

    def __init__(self, lines: list[Line], names: set[str]):
        addressed = {m.group(1) or m.group(2) for line in lines for m in VOCATIVE.finditer(line.text)}
        self.ignore = {t for name in names | addressed for t in _tokens(name)}
        # Most common spelling of each word when it isn't the first word of a sentence ("SOC", "Slack").
        forms: dict[str, Counter] = {}
        for line in lines:
            for sentence in _sentences(line.text):
                for word in re.findall(r"[A-Za-z][A-Za-z0-9'-]*", sentence)[1:]:
                    forms.setdefault(word.lower().removesuffix("'s"), Counter())[word.removesuffix("'s")] += 1
        self.forms = {w: c.most_common(1)[0][0] for w, c in forms.items()}

    def content(self, text: str) -> list[str]:
        return [t for t in _tokens(text) if t not in STOPWORDS and t not in self.ignore and len(t) > 2]

    def pairs(self, text: str) -> list[str]:
        """Adjacent content-word pairs, never across punctuation ("goals, scope" is not a phrase)."""
        found = []
        for clause in re.split(r"[,.;:!?()\"]+", text):
            tokens = _tokens(clause)
            found += [f"{a} {b}" for a, b in zip(tokens, tokens[1:]) if self._phrase_word(a) and self._phrase_word(b)]
        return found

    def _phrase_word(self, token: str) -> bool:
        if token in STOPWORDS or token in self.ignore:
            return False
        return len(token) >= 4 or self.forms.get(token, "").isupper()  # short words only as acronyms ("SOC")

    def display(self, term: str) -> str:
        return " ".join(self.forms.get(word, word) for word in term.split())


# ── Generator ───────────────────────────────────────────────────────────────


def _keywords(lines: list[Line], vocab: _Vocabulary, limit: int = 6) -> tuple[list[str], Counter]:
    words = Counter(t for line in lines for t in vocab.content(line.text))
    pairs = Counter(p for line in lines for p in vocab.pairs(line.text))
    # Two-word phrases that recur beat single words; ties go to longer (more specific) terms.
    candidates = [(count * 2.5 + len(p) / 100, p) for p, count in pairs.items() if count >= 2]
    candidates += [(count + len(w) / 100, w) for w, count in words.items()]
    chosen: list[str] = []
    chosen_words: set[str] = set()
    for _, term in sorted(candidates, reverse=True):
        parts = set(term.split())
        if parts & chosen_words:  # don't repeat a word already covered by another keyword
            continue
        chosen.append(term)
        chosen_words |= parts
        if len(chosen) == limit:
            break
    return chosen, words


def _score(sentence: str, weights: Counter, vocab: _Vocabulary) -> float:
    content = vocab.content(sentence)
    if len(sentence.split()) < 6 or not content:
        return 0.0
    top = max(weights.values(), default=1)
    score = sum(weights[t] / top for t in content) / math.sqrt(len(content) + 1)
    if CUES.search(sentence):
        score += 0.5
    if sentence.rstrip().endswith("?"):
        score *= 0.5
    return score


def _chapter_title(chunk: list[Line], words: Counter, weight, vocab: _Vocabulary, keywords: list[str], position: str) -> str:
    """A recurring phrase, else the chapter's most distinctive repeated words, else a meeting keyword it mentions."""
    pairs = Counter(p for line in chunk for p in vocab.pairs(line.text))
    recurring = [p for p, count in pairs.items() if count >= 2]
    repeated = sorted((w for w in words if words[w] >= 2), key=lambda w: (weight(w), len(w)), reverse=True)
    mentioned = [k for k in keywords if all(part in words for part in k.split())]
    if recurring:
        title = vocab.display(max(recurring, key=lambda p: (pairs[p], sum(weight(w) for w in p.split()))))
    elif repeated:
        title = _join([vocab.display(w) for w in repeated[:2]])
    elif mentioned:
        title = vocab.display(mentioned[0])
    else:  # nothing distinctive: usually the greetings at the start or the wrap-up at the end
        title = {"first": "Introductions", "last": "Wrap-up and next steps"}.get(position, "Discussion")
    return title[:1].upper() + title[1:]


def _chapters(lines: list[Line], vocab: _Vocabulary, keywords: list[str]) -> list[GeneratedTopic]:
    n = len(lines)
    count = 1 if n < 6 else min(6, max(2, round(n / 6)))
    bags = [Counter(vocab.content(line.text)) for line in lines]

    # Similarity of the 3 lines before vs. after each gap; topic shifts sit where it's lowest.
    def similarity(gap: int) -> float:
        return _cosine(sum(bags[max(0, gap - 3) : gap], Counter()), sum(bags[gap : gap + 3], Counter()))

    boundaries: list[int] = []
    for gap in sorted(range(2, n - 1), key=similarity):
        if len(boundaries) == count - 1:
            break
        if all(abs(gap - b) >= 3 for b in boundaries):
            boundaries.append(gap)
    edges = [0, *sorted(boundaries), n]
    chunks = [lines[a:b] for a, b in zip(edges, edges[1:])]

    chunk_words = [Counter(w for line in chunk for w in vocab.content(line.text)) for chunk in chunks]
    document_freq = Counter(w for words in chunk_words for w in words)
    topics, used = [], set()
    for index, (chunk, words) in enumerate(zip(chunks, chunk_words)):
        def weight(w: str, words=words) -> float:  # tf-idf: frequent here, rare in other chapters
            return words[w] * math.log(1 + len(chunks) / document_freq[w])

        position = "first" if index == 0 else "last" if index == len(chunks) - 1 else "middle"
        title = _chapter_title(chunk, words, weight, vocab, keywords, position)
        if title.lower() in used:
            title = f"{title} (continued)"
        used.add(title.lower())
        statements = [s for line in chunk for s in _sentences(line.text) if not s.endswith("?")]
        best = max(statements or [chunk[0].text], key=lambda s: _score(s, words, vocab))
        topics.append(GeneratedTopic(title, _truncate(_clean(best), 180), chunk[0].start, chunk[-1].end))
    return topics


def _due_date(task: str, meeting_day: date) -> date | None:
    text = task.lower()
    month_day = re.search(rf"\b({'|'.join(MONTHS)})\s+(\d{{1,2}})(?:st|nd|rd|th)?\b", text) or re.search(
        rf"\b({'|'.join(MONTHS)})\s+({'|'.join(sorted(ORDINALS, key=len, reverse=True))})\b", text
    )
    if month_day:
        month = MONTHS.index(month_day.group(1)) + 1
        day = int(month_day.group(2)) if month_day.group(2).isdigit() else ORDINALS[month_day.group(2)]
        try:
            due = date(meeting_day.year, month, day)
        except ValueError:
            return None
        return due if due >= meeting_day else due.replace(year=due.year + 1)
    end_of_month = re.search(rf"\bend of ({'|'.join(MONTHS)}|the month|this month)\b", text)
    if end_of_month:
        name = end_of_month.group(1)
        month = MONTHS.index(name) + 1 if name in MONTHS else meeting_day.month
        year = meeting_day.year + (month < meeting_day.month)
        return date(year + month // 12, month % 12 + 1, 1) - timedelta(days=1)
    for i, day in enumerate(WEEKDAYS):
        if re.search(rf"\b{day}\b", text):
            return meeting_day + timedelta(days=(i - meeting_day.weekday()) % 7 or 7)
    if "tomorrow" in text:
        return meeting_day + timedelta(days=1)
    if re.search(r"\b(today|end of (the )?day|tonight)\b", text):
        return meeting_day
    if re.search(r"\b(end of (the|this) week|this week)\b", text):
        return meeting_day + timedelta(days=(4 - meeting_day.weekday()) % 7)
    if "next week" in text:
        return meeting_day + timedelta(days=7)
    return None


def _task_text(raw: str) -> str | None:
    task = re.split(r"(?<=[.!?])\s", raw.strip())[0].strip().rstrip(".!?,; ")
    task = re.sub(r"\s+(?:as well|too|then|now)$", "", task, flags=re.IGNORECASE)
    words = task.split()
    while words and (words[0].lower() in LEADING_ADVERBS or words[0].lower().endswith("ly")):
        words = words[1:]  # "I'll also send …" / "I'll mostly be …"
    if len(words) < 3 or words[0].lower() in NOT_TASKS:
        return None
    task = " ".join(words)
    if sum(1 for t in _tokens(task) if t not in STOPWORDS and len(t) > 2) < 2:  # too vague: "lock that in"
        return None
    return task[:1].upper() + task[1:]


def _action_items(lines: list[Line], first_names: dict[str, int], meeting_day: date) -> list[GeneratedActionItem]:
    items: list[GeneratedActionItem] = []
    seen: set[str] = set()
    for index, line in enumerate(lines):
        for sentence in _sentences(line.text):
            assignee: int | None = None
            if match := REQUEST.search(sentence):
                name = (match.group("name") or "").lower()
                if name in first_names:
                    assignee = first_names[name]
                else:  # asked to the room: whoever answers next is the likely owner
                    nxt = next((other for other in lines[index + 1 :] if other.speaker_id != line.speaker_id), None)
                    assignee = nxt.speaker_id if nxt else None
            elif match := COMMITMENT.search(sentence):
                assignee = line.speaker_id
            elif match := TEAM_ACTION.search(sentence):
                assignee = None
            else:
                continue
            task = _task_text(match.group("task"))
            if not task or task.lower() in seen:
                continue
            seen.add(task.lower())
            items.append(GeneratedActionItem(task, assignee, line.start, _due_date(task, meeting_day)))
    return items[:MAX_ACTION_ITEMS]


def generate_notes(lines: list[Line], meeting_day: date, attendee_names: dict[int, str]) -> GeneratedNotes:
    """Generate notes for a transcript. `attendee_names` maps participant id → full name."""
    lines = sorted((line for line in lines if line.text.strip()), key=lambda line: line.start)
    if not lines:
        return GeneratedNotes(overview="", bullet_points=[], keywords=[])

    vocab = _Vocabulary(lines, {line.speaker for line in lines} | set(attendee_names.values()))
    keywords, weights = _keywords(lines, vocab)

    # Rank every statement once. The overview prefers statements that aren't first-person asides.
    ranked: list[tuple[float, int, str, str]] = []
    for order, line in enumerate(lines):
        for sentence in _sentences(line.text):
            score = _score(sentence, weights, vocab)
            if score > 0 and not sentence.endswith("?"):
                ranked.append((score, order, line.speaker, _clean(sentence)))
    ranked.sort(key=lambda r: r[0], reverse=True)
    impersonal = [r for r in ranked if not re.match(r"(?:I|I'm|I'll|I'd|I've|My)\b", r[3])]
    overview_picks = sorted((impersonal or ranked)[:2], key=lambda r: r[1])
    note_picks = sorted([r for r in ranked if r not in overview_picks][:5], key=lambda r: r[1])

    speakers = list(dict.fromkeys(line.speaker for line in lines))
    who = _join(speakers if len(speakers) <= 3 else [*speakers[:2], "others"])
    topics = [vocab.display(k) for k in keywords[:3]]
    intro = f"{who} discussed {_join(topics)}." if topics else f"{who} met."
    overview = " ".join([intro, *(_truncate(r[3], 240) for r in overview_picks)])

    first_names = {name.split()[0].lower(): pid for pid, name in attendee_names.items() if name.split()}
    return GeneratedNotes(
        overview=overview,
        bullet_points=[f"{r[2]}: {_truncate(r[3], 220)}" for r in note_picks],
        keywords=[(lambda d: d[:1].upper() + d[1:])(vocab.display(k)) for k in keywords],
        topics=_chapters(lines, vocab, keywords),
        action_items=_action_items(lines, first_names, meeting_day),
    )
