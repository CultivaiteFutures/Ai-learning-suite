"""
Hand-rolled RFC 5545 (iCalendar) writer for the calendar export/subscribe
feature (GET /calendar/export.ics and GET /calendar/sync/{token}.ics).

No external `icalendar` dependency: every event here is a simple timed
VEVENT with no recurrence, no attendees, and no timezone components beyond
UTC, so a small hand-rolled writer is enough and keeps this dependency-free.
"""
from datetime import datetime, timezone
from typing import Iterable, Optional


def _escape_ics_text(value: Optional[str]) -> str:
    if not value:
        return ""
    value = value.replace("\\", "\\\\")
    value = value.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\n")
    value = value.replace(",", "\\,").replace(";", "\\;")
    return value


def _fold_line(line: str) -> str:
    """RFC 5545 requires content lines to be folded at 75 octets."""
    if len(line) <= 75:
        return line
    parts = []
    remaining = line
    while len(remaining) > 75:
        parts.append(remaining[:75])
        remaining = " " + remaining[75:]
    parts.append(remaining)
    return "\r\n".join(parts)


def _dt_stamp(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def build_ics(events: Iterable[dict], calendar_name: str = "Academic Calendar") -> str:
    """
    events: iterable of dicts with keys `uid`, `title`, `dt` (a datetime),
    and optionally `description` and `category`. Produces a full VCALENDAR
    document, CRLF-terminated per spec.
    """
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI Learning Platform//Academic Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        _fold_line(f"X-WR-CALNAME:{_escape_ics_text(calendar_name)}"),
    ]
    now_stamp = _dt_stamp(datetime.now(timezone.utc))

    for ev in events:
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{ev['uid']}@ai-learning-platform")
        lines.append(f"DTSTAMP:{now_stamp}")
        lines.append(f"DTSTART:{_dt_stamp(ev['dt'])}")
        lines.append(_fold_line(f"SUMMARY:{_escape_ics_text(ev['title'])}"))
        if ev.get("description"):
            lines.append(_fold_line(f"DESCRIPTION:{_escape_ics_text(ev['description'])}"))
        if ev.get("category"):
            lines.append(f"CATEGORIES:{_escape_ics_text(ev['category'].upper())}")
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"
