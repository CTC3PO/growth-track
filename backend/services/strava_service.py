import os
import requests
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter()

STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
# For local dev this is localhost, for prod it will be your vercel URL
# The port doesn't matter for the Strava config page, but it does matter for the redirect
REDIRECT_URI = "http://localhost:8080/api/strava/callback"

class StravaTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int
    athlete_id: int

@router.get("/login")
async def strava_login():
    """Returns the URL the frontend should redirect the user to for Strava OAuth."""
    if not STRAVA_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Strava Client ID not configured.")
        
    auth_url = f"https://www.strava.com/oauth/authorize?client_id={STRAVA_CLIENT_ID}&response_type=code&redirect_uri={REDIRECT_URI}&approval_prompt=force&scope=activity:read_all"
    return {"url": auth_url}

@router.get("/callback")
async def strava_callback(code: str, scope: str = None):
    """
    Strava redirects here after the user authorizes the app.
    We exchange the 'code' for a permanent access token.
    """
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code provided.")
        
    try:
        response = requests.post(
            "https://www.strava.com/oauth/token",
            data={
                "client_id": STRAVA_CLIENT_ID,
                "client_secret": STRAVA_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code"
            }
        )
        response.raise_for_status()
        token_data = response.json()
        
        # In a real app, you would save these tokens to your database (e.g. Firestore)
        # associated with the currently logged-in user.
        # For now, we'll just return it so the frontend can store it in localStorage.
        
        return {
            "message": "Successfully authenticated with Strava!",
            "athlete": token_data.get("athlete", {}).get("firstname", "Runner"),
            "access_token": token_data.get("access_token")
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to exchange token with Strava: {str(e)}")

@router.get("/activities")
async def get_strava_activities(access_token: str):
    """Fetches the user's recent activities using their access token."""
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        # Get the 5 most recent activities
        response = requests.get(
            "https://www.strava.com/api/v3/athlete/activities?per_page=5",
            headers=headers
        )
        response.raise_for_status()
        activities = response.json()
        
        # Filter and format the raw data
        runs = []
        for activity in activities:
            if activity.get("type") == "Run":
                # Convert meters to km, m/s to min/km pace
                distance_km = activity.get("distance", 0) / 1000
                moving_time_min = activity.get("moving_time", 0) / 60
                pace_min_per_km = moving_time_min / distance_km if distance_km > 0 else 0
                
                # Format pace as MM:SS array (e.g. 5.5 -> 5:30)
                pace_mins = int(pace_min_per_km)
                pace_secs = int((pace_min_per_km - pace_mins) * 60)
                formatted_pace = f"{pace_mins}:{pace_secs:02d}"
                
                runs.append({
                    "id": activity.get("id"),
                    "name": activity.get("name"),
                    "distance_km": round(distance_km, 2),
                    "moving_time_str": f"{int(moving_time_min)} min",
                    "pace": formatted_pace,
                    "date": activity.get("start_date_local", "").split("T")[0]
                })
                
        return {"runs": runs}
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activities from Strava: {str(e)}")
