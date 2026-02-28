import json
from datetime import date, timedelta
from typing import List, Dict

async def generate_work_insights(sessions: List[Dict]) -> str:
    """Analyze work sessions and return AI-generated insights."""
    from services.gemini_service import generate_text

    if not sessions:
        return "Not enough data yet. Log some work sessions to get insights!"

    # Prepare data summary
    total_minutes = sum(s.get("duration_minutes", 0) for s in sessions)
    total_hours = round(total_minutes / 60, 1)

    by_category = {}
    for s in sessions:
        cat = s.get("category", "others")
        mins = s.get("duration_minutes", 0)
        by_category[cat] = by_category.get(cat, 0) + mins

    # Format the summary for the prompt
    data_summary = f"Total Deep Work: {total_hours} hours.\nBreakdown by category:\n"
    for cat, mins in by_category.items():
        data_summary += f"- {cat.capitalize()}: {round(mins / 60, 1)} hours\n"

    # Add context on recent trends (last 7 days) if available
    today = date.today()
    week_ago = today - timedelta(days=7)
    recent_sessions = [
        s for s in sessions 
        if s.get("date") and date.fromisoformat(s["date"]) >= week_ago
    ]
    recent_hours = round(sum(s.get("duration_minutes", 0) for s in recent_sessions) / 60, 1)
    
    data_summary += f"\nIn the past 7 days: {recent_hours} hours of deep work."

    prompt = f"""
    You are an AI productivity coach analyzing deep work data.
    Review the following Pomodoro/Deep Work session summary and provide a short, encouraging, and actionable insight. 
    Focus on trends, balance across categories (e.g., School vs. Job vs. DSA), and suggest how to optimize focus time.
    Keep the response to 2-3 concise paragraphs. Use bullet points if helpful.

    User's Data Summary:
    {data_summary}
    """

    try:
        insight = await generate_text(prompt)
        return insight
    except Exception as e:
        return f"Could not generate insights at this time. (Error: {str(e)})"
