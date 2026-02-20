"""
Review Agent — generates weekly, monthly, and quarterly life reviews
by aggregating daily check-in data and producing AI-powered insights.
Based on the user's monthly checklist.pdf life integration system.
"""

from datetime import date, timedelta
from services.gemini_service import generate_json
from services.firestore_service import get_documents_by_date_range


def _compute_metrics(checkins: list[dict], runs: list[dict], journals: list[dict], books: list[dict]) -> dict:
    """Compute aggregate metrics from raw data."""
    total_days = len(checkins) if checkins else 1

    # Check-in metrics
    energies = [c.get("energy", 0) for c in checkins if c.get("energy")]
    alignments = [c.get("alignment", 0) for c in checkins if c.get("alignment")]
    sleep_hours = [c.get("sleep_hours", 0) for c in checkins if c.get("sleep_hours")]
    meditation_days = sum(1 for c in checkins if c.get("meditation"))
    deep_work = sum(c.get("deep_work_hours", 0) for c in checkins)
    journal_words = sum(c.get("journal_words", 0) for c in checkins)
    steps_days = sum(1 for c in checkins if (c.get("steps") or 0) >= 9000)

    # Running metrics
    total_km = sum(r.get("distance_km", 0) for r in runs)
    total_runs = len(runs)
    run_types = {}
    for r in runs:
        rt = r.get("run_type", "easy")
        run_types[rt] = run_types.get(rt, 0) + 1

    # Reading metrics
    books_finished = len([b for b in books if b.get("is_finished")])
    genres = {}
    for b in books:
        g = b.get("genre", "other")
        genres[g] = genres.get(g, 0) + 1

    # Journal metrics
    total_journal_entries = len(journals)
    journal_total_words = sum(j.get("word_count", 0) for j in journals)

    return {
        "period_days": total_days,
        "checkins_logged": len(checkins),
        # Energy & Alignment
        "avg_energy": round(sum(energies) / len(energies), 1) if energies else 0,
        "avg_alignment": round(sum(alignments) / len(alignments), 1) if alignments else 0,
        "avg_sleep_hours": round(sum(sleep_hours) / len(sleep_hours), 1) if sleep_hours else 0,
        "avg_sleep": round(sum(sleep_hours) / len(sleep_hours), 1) if sleep_hours else 0,
        # Five Non-Negotiables
        "sleep_consistency_pct": round(sum(1 for s in sleep_hours if s >= 7) / total_days * 100),
        "meditation_days": meditation_days,
        "meditation_pct": round(meditation_days / total_days * 100),
        "steps_9k_days": steps_days,
        "steps_pct": round(steps_days / total_days * 100),
        "deep_work_hours": round(deep_work, 1),
        "deep_work_daily_avg": round(deep_work / total_days, 1),
        "deep_work_pct": round(sum(1 for c in checkins if (c.get("deep_work_hours") or 0) >= 3) / total_days * 100),
        # Running
        "total_km": round(total_km, 1),
        "total_runs": total_runs,
        "run_types": run_types,
        # Reading
        "books_finished": books_finished,
        "genres": genres,
        # Journaling
        "journal_entries": total_journal_entries,
        "journal_total_words": journal_total_words,
    }


def generate_weekly_review(start_date: str, end_date: str) -> dict:
    """
    Generate a weekly review from check-in data.
    Returns metrics + AI-generated narrative.
    """
    checkins = get_documents_by_date_range("checkins", start_date, end_date)
    runs = get_documents_by_date_range("runs", start_date, end_date)
    journals = get_documents_by_date_range("journals", start_date, end_date)
    books = get_documents_by_date_range("books", start_date, end_date)

    metrics = _compute_metrics(checkins, runs, journals, books)

    # Generate AI narrative
    system_prompt = """You are a compassionate life coach who blends Thich Nhat Hanh's mindfulness 
with Stoic philosophy. Generate a weekly review that:
1. Celebrates genuine wins (not forced positivity)
2. Notices patterns honestly
3. Offers one gentle course correction
4. Ends with an integration question for journaling

Respond in JSON with:
- "narrative_summary": 3-4 sentences summarizing the week
- "wins": list of 2-3 genuine wins noticed
- "patterns": list of 1-2 patterns or insights
- "course_correction": one suggestion for next week
- "integration_question": a deep question like "Where did I feel most myself this week?"
- "non_negotiables_check": brief assessment of the Five Non-Negotiables"""

    user_prompt = f"""Weekly review for {start_date} to {end_date}:

METRICS:
- Check-ins logged: {metrics['checkins_logged']}/7 days
- Avg energy: {metrics['avg_energy']}/10
- Avg alignment: {metrics['avg_alignment']}/10
- Avg sleep: {metrics['avg_sleep_hours']} hrs
- Meditation: {metrics['meditation_days']}/7 days ({metrics['meditation_pct']}%)
- Steps ≥9k: {metrics['steps_9k_days']}/7 days
- Deep work: {metrics['deep_work_hours']} hrs ({metrics['deep_work_daily_avg']} hrs/day avg)
- Running: {metrics['total_km']}km across {metrics['total_runs']} runs
- Books finished: {metrics['books_finished']}
- Journal entries: {metrics['journal_entries']} ({metrics['journal_total_words']} words)

Generate an honest, warm weekly review."""

    try:
        ai_review = generate_json(user_prompt, system_instruction=system_prompt)
    except Exception as e:
        ai_review = {
            "narrative_summary": "Review data collected. AI summary unavailable.",
            "wins": [],
            "patterns": [],
            "course_correction": "Keep logging daily check-ins for better insights.",
            "integration_question": "Where did I feel most myself this week?",
            "error": str(e),
        }

    return {
        "period": "weekly",
        "start_date": start_date,
        "end_date": end_date,
        "metrics": metrics,
        "ai_review": ai_review,
    }


def generate_monthly_review(year: int, month: int) -> dict:
    """Generate a monthly review with progress toward yearly goals."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year, 12, 31)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)

    start_str = start.isoformat()
    end_str = end.isoformat()

    checkins = get_documents_by_date_range("checkins", start_str, end_str)
    runs = get_documents_by_date_range("runs", start_str, end_str)
    journals = get_documents_by_date_range("journals", start_str, end_str)
    books = get_documents_by_date_range("books", start_str, end_str)

    metrics = _compute_metrics(checkins, runs, journals, books)

    # Get year-to-date data for progress tracking
    year_start = date(year, 1, 1).isoformat()
    ytd_books = get_documents_by_date_range("books", year_start, end_str)
    ytd_runs = get_documents_by_date_range("runs", year_start, end_str)
    ytd_books_finished = len([b for b in ytd_books if b.get("is_finished")])
    ytd_km = sum(r.get("distance_km", 0) for r in ytd_runs)

    system_prompt = """You are a compassionate life coach for a monthly review.
Assess progress toward yearly goals: 50 books, 3 half marathons + 1 marathon, 
consistent meditation and journaling practice.

Respond in JSON with:
- "narrative_summary": 4-5 sentences summarizing the month
- "goal_progress": assessment of yearly goal progress
- "theme_of_month": what theme emerged this month
- "course_corrections": list of 1-3 adjustments for next month
- "becoming_reflection": response to "Who am I becoming?"
- "next_month_intention": suggested intention for next month"""

    user_prompt = f"""Monthly review for {start.strftime('%B %Y')}:

THIS MONTH:
{_format_metrics(metrics)}

YEAR-TO-DATE PROGRESS:
- Books finished: {ytd_books_finished}/50 ({round(ytd_books_finished/50*100)}%)
- Total running km: {round(ytd_km, 1)}
- Month {month} of 12

Generate a thoughtful monthly review."""

    try:
        ai_review = generate_json(user_prompt, system_instruction=system_prompt)
    except Exception as e:
        ai_review = {"narrative_summary": "Monthly data collected.", "error": str(e)}

    return {
        "period": "monthly",
        "year": year,
        "month": month,
        "metrics": metrics,
        "ytd_books": ytd_books_finished,
        "ytd_km": round(ytd_km, 1),
        "ai_review": ai_review,
    }


def generate_quarterly_review(year: int, quarter: int) -> dict:
    """
    Generate a quarterly review aligned with the user's life tracker.
    Covers Physical, Intellectual, Spiritual, Social, Career dimensions.
    """
    start_month = (quarter - 1) * 3 + 1
    end_month = start_month + 2
    start = date(year, start_month, 1)
    if end_month == 12:
        end = date(year, 12, 31)
    else:
        end = date(year, end_month + 1, 1) - timedelta(days=1)

    start_str = start.isoformat()
    end_str = end.isoformat()

    checkins = get_documents_by_date_range("checkins", start_str, end_str)
    runs = get_documents_by_date_range("runs", start_str, end_str)
    journals = get_documents_by_date_range("journals", start_str, end_str)
    books = get_documents_by_date_range("books", start_str, end_str)

    metrics = _compute_metrics(checkins, runs, journals, books)

    system_prompt = """You are a life integration coach for a quarterly review.
Assess across all dimensions: Physical, Intellectual, Emotional/Spiritual, Social, Career.

The user's quarterly goals include:
- PHYSICAL: Half marathon progress, running consistency, health
- INTELLECTUAL: Books (quarterly goal ~13), courses, certifications
- SPIRITUAL: Retreats, meditation, journaling, inner peace (1-10)
- SOCIAL: Friendships, community
- CAREER: Job/internship, learning

Respond in JSON with:
- "narrative_summary": 5-6 sentence quarterly synthesis
- "physical": assessment of physical dimension
- "intellectual": assessment of intellectual dimension  
- "spiritual": assessment of spiritual dimension
- "social_career": combined social and career assessment
- "who_am_i_becoming": reflection on identity evolution
- "vedic_western_integration": how inner growth is evolving
- "next_quarter_theme": suggested theme for next quarter
- "needs_attention": what needs more focus"""

    user_prompt = f"""Quarterly review for Q{quarter} {year} ({start.strftime('%B')} - {end.strftime('%B')}):

{_format_metrics(metrics)}

Generate a deep quarterly integration review."""

    try:
        ai_review = generate_json(user_prompt, system_instruction=system_prompt)
    except Exception as e:
        ai_review = {"narrative_summary": "Quarterly data collected.", "error": str(e)}

    return {
        "period": "quarterly",
        "year": year,
        "quarter": quarter,
        "metrics": metrics,
        "ai_review": ai_review,
    }


def _format_metrics(metrics: dict) -> str:
    """Format metrics dict into readable text for AI prompts."""
    return f"""- Days tracked: {metrics['checkins_logged']}
- Avg energy: {metrics['avg_energy']}/10
- Avg alignment: {metrics['avg_alignment']}/10
- Avg sleep: {metrics['avg_sleep_hours']} hrs
- Meditation: {metrics['meditation_days']} days ({metrics['meditation_pct']}%)
- Steps ≥9k: {metrics['steps_9k_days']} days ({metrics['steps_pct']}%)
- Deep work: {metrics['deep_work_hours']} hrs
- Running: {metrics['total_km']}km across {metrics['total_runs']} runs
- Books finished: {metrics['books_finished']}
- Journal: {metrics['journal_entries']} entries ({metrics['journal_total_words']} words)"""
