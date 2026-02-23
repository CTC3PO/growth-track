"""
Running Coach Agent — uses Strava data to dynamically adjust the user's
Half Marathon training plan using the Gemini API.
"""

from services.gemini_service import generate_json
from services.strava_service import get_strava_activities

async def generate_adjusted_plan(access_token: str) -> dict:
    """
    Fetch recent runs from Strava and ask Gemini to adjust the upcoming week's
    Half Marathon training plan based on performance.
    """
    # 1. Fetch recent runs from Strava
    try:
        strava_data = await get_strava_activities(access_token)
        recent_runs = strava_data.get("runs", [])
    except Exception as e:
        return {"error": f"Failed to fetch Strava data: {str(e)}"}

    if not recent_runs:
        return {
            "error": "No recent runs found on Strava to analyze.",
            "runs": []
        }

    # 2. Base plan context
    base_plan = """
    Current Goal: Half Marathon (21.1 km)
    Current Phase: Week 2 of 6 (Base Building transitioning to Speed)
    
    Standard Weekly Template:
    - Tuesday: Easy Run (5-7 km) @ 6:00-6:30 min/km
    - Thursday: Speed/Intervals (6 km total with 6x400m intervals)
    - Saturday: Long Run (12-14 km) @ 6:30-7:00 min/km
    - Sunday: Active Recovery/Cross Training
    """

    # 3. Format recent runs for the prompt
    runs_text = "\\n".join([
        f"- {r['date']}: {r['name']} | {r['distance_km']}km in {r['moving_time_str']} (Pace: {r['pace']} min/km)"
        for r in recent_runs
    ])

    # 4. Generate AI Adjustment
    system_prompt = """You are an expert running coach specializing in half marathon training.
You analyze a runner's recent Strava data and dynamically adjust their upcoming training week.

Consider:
- Are they hitting their targetpaces?
- Is their volume too high/low? (Overtraining vs Undertraining risk)
- Should the long run distance increase or decrease?

Respond in JSON format with exactly these keys:
- "assessment": A 2-3 sentence encouraging but honest analysis of their recent runs.
- "adjustments_made": A list of 1-3 specific changes made to the base plan (e.g., "Reduced Thursday speed work volume due to slow pace on last run").
- "adjusted_plan": An object with keys "tuesday", "thursday", "saturday", "sunday", where each value is a string describing the recommended workout.
"""

    user_prompt = f"""Analyze these recent runs and adjust the upcoming week's plan:

BASE PLAN CONTEXT:
{base_plan}

RECENT RUNS (Strava):
{runs_text}

Provide the adjusted training plan for the upcoming week in the requested JSON format.
"""

    try:
        ai_response = generate_json(user_prompt, system_instruction=system_prompt)
        ai_response["runs"] = recent_runs  # Include raw runs for the UI Context
        return ai_response
    except Exception as e:
        return {
            "error": f"AI Generation failed: {str(e)}",
            "runs": recent_runs
        }
