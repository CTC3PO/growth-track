"""
Summary Agent — AI-powered summarization of journal entries and activity data.
Uses Gemini to generate thematic summaries with mood trends and insights.
"""

from datetime import date, timedelta
from services.firestore_service import get_documents, get_documents_by_date_range
from services.gemini_service import generate_text


def generate_summary(days: int = 7, summary_type: str = "all") -> dict:
    """
    Generate an AI summary of recent journals and/or activities.

    Args:
        days: Number of days to look back (default 7)
        summary_type: 'journals', 'activities', or 'all'

    Returns:
        dict with summary text, key themes, and metadata
    """
    end_date = date.today().isoformat()
    start_date = (date.today() - timedelta(days=days)).isoformat()

    context_parts = []
    metadata = {"days": days, "type": summary_type, "start_date": start_date, "end_date": end_date}

    # ── Gather journal entries ──────────────────────────────────
    if summary_type in ("journals", "all"):
        journals = get_documents_by_date_range("journals", start_date, end_date)
        metadata["journal_count"] = len(journals)
        if journals:
            context_parts.append("=== JOURNAL ENTRIES ===")
            for j in journals:
                entry_date = j.get("date", "unknown")
                content = j.get("content", "")
                mood = j.get("mood", "")
                tradition = j.get("tradition", "")
                entry_line = f"[{entry_date}]"
                if mood:
                    entry_line += f" (mood: {mood})"
                if tradition:
                    entry_line += f" (tradition: {tradition})"
                entry_line += f": {content}"
                context_parts.append(entry_line)

    # ── Gather activity data ────────────────────────────────────
    if summary_type in ("activities", "all"):
        # Check-ins
        checkins = get_documents_by_date_range("checkins", start_date, end_date)
        metadata["checkin_count"] = len(checkins)
        if checkins:
            context_parts.append("\n=== DAILY CHECK-INS ===")
            for c in checkins:
                parts = [f"[{c.get('date', 'unknown')}]"]
                if c.get("energy"):
                    parts.append(f"energy: {c['energy']}/5")
                if c.get("alignment"):
                    parts.append(f"alignment: {c['alignment']}/5")
                if c.get("meditation"):
                    parts.append("meditated ✓")
                if c.get("deep_work_hours"):
                    parts.append(f"deep work: {c['deep_work_hours']}h")
                if c.get("gratitude"):
                    parts.append(f"grateful for: {c['gratitude']}")
                context_parts.append(" | ".join(parts))

        # Runs
        runs = get_documents_by_date_range("runs", start_date, end_date)
        metadata["run_count"] = len(runs)
        if runs:
            context_parts.append("\n=== RUNNING LOG ===")
            total_km = 0
            for r in runs:
                dist = r.get("distance_km", 0)
                total_km += dist
                parts = [f"[{r.get('date', 'unknown')}]"]
                parts.append(f"{dist}km")
                if r.get("duration_min"):
                    parts.append(f"{r['duration_min']}min")
                if r.get("notes"):
                    parts.append(f"notes: {r['notes']}")
                context_parts.append(" | ".join(parts))
            metadata["total_km"] = round(total_km, 1)

        # Books
        books = get_documents_by_date_range("books", start_date, end_date)
        metadata["book_count"] = len(books)
        if books:
            context_parts.append("\n=== READING LOG ===")
            for b in books:
                parts = [f"{b.get('title', 'Unknown')} by {b.get('author', 'Unknown')}"]
                if b.get("is_finished"):
                    parts.append("(finished)")
                if b.get("rating"):
                    parts.append(f"rating: {b['rating']}/5")
                if b.get("reaction"):
                    parts.append(f"reaction: {b['reaction']}")
                context_parts.append(" | ".join(parts))

    # ── No data case ────────────────────────────────────────────
    if not context_parts:
        return {
            "summary": f"No data found for the last {days} days. Start logging check-ins, journal entries, or runs to get AI-powered summaries!",
            "themes": [],
            "metadata": metadata,
        }

    # ── Build the Gemini prompt ─────────────────────────────────
    data_block = "\n".join(context_parts)

    system_instruction = """You are Mindful Life AI, a personal life integration assistant specializing in
thoughtful, insightful summaries. You help users reflect on their patterns, celebrate progress,
and identify areas for growth. Be warm, specific, and honest. Reference actual data points."""

    prompt = f"""Summarize the following {days} days of personal life data into a cohesive, insightful narrative.

DATA:
{data_block}

Please provide:
1. **Overview** (2-3 sentences capturing the overall period)
2. **Key Themes** (3-5 recurring patterns or notable observations)
3. **Mood & Energy Trends** (if check-in data is available)
4. **Wins & Progress** (specific accomplishments to celebrate)
5. **Growth Opportunities** (gentle, actionable suggestions)
6. **One Question to Reflect On** (a thought-provoking question based on the data)

Format the response in clean markdown. Be specific — reference actual entries, dates, and numbers."""

    try:
        summary_text = generate_text(prompt, system_instruction=system_instruction, temperature=0.7)
    except Exception as e:
        return {
            "summary": f"Could not generate summary: {str(e)}",
            "themes": [],
            "metadata": metadata,
            "error": True,
        }

    return {
        "summary": summary_text,
        "metadata": metadata,
    }
