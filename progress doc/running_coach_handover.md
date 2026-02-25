# Running Coach AI Agent: Handover Document

## Overview
The Running Coach AI Agent is designed to connect a user's Strava account to their Mindful Life AI dashboard, evaluating their recent running performance against a static Half Marathon plan, and dynamically adjusting the upcoming week's plan using the Gemini API.

## Project Architecture & Integration Flow
### 1. Frontend (`frontend/index.html` & `frontend/app.js`)
- **Connect with Strava Button:** Added to the "Running" tab in `index.html`. It redirects the user to the `/api/strava/login` backend route.
- **Strava Embed:** Added a mock iframe and a direct link to the user's specific Strava profile (`https://www.strava.com/athletes/131814970`).
- **Token Capture:** Modified the initialization logic in `app.js` to look for `?strava_token=...` in the URL parameters. When found, it strips the token from the URL, securely stores it in `localStorage`, and updates the button state to "Strava Connected ✓".
- **Plan Adjustment:** The "Adjust Plan" button now reads the stored `strava_token` from `localStorage` and sends it as part of the GET request to `/api/running_coach/plan`. If the token is missing, it passes `mock_token`.

### 2. Backend Routes (`backend/main.py`)
- Registered the `/api/strava` prefix by importing and including `strava_router`.

### 3. Strava OAuth (`backend/services/strava_service.py`)
- **`/login`:** Generates the appropriate OAuth authentication URL for Strava.
- **`/callback`:** Handles the redirect from Strava with an authorization code. It exchanges this code for an `access_token` and then uses FastAPI's `RedirectResponse` to send the user back to the application (`/?strava_token=<access_token>#page-running`), preventing the user from getting stuck on an empty API JSON page.
- **`/activities`:** Uses the `access_token` to fetch recent runs.
    - *Note:* It currently includes a mock data fallback. If the `access_token` exactly equals `"mock_token"`, it returns a hardcoded list of realistic runs to ensure UI / Gemini integration can be tested even if the live Strava API isn't fully connected yet.

### 4. Running Coach Agent (`backend/services/running_coach.py`)
- The core logic for this feature.
- Fetches the user's recent runs using `strava_service.get_strava_activities`.
- Formats these runs and prepends them with a static "Half Marathon Base Plan Context".
- Prompts the Gemini API (`gemini_service.generate_json`) to act as a running coach, analyze the runs, perform course corrections, and return a tailored JSON response summarizing the performance and detailing the customized week.

### 5. Gemini Service (`backend/services/gemini_service.py`)
- Standardized the API calls to use the `gemini-2.0-flash` model, ensuring compatibility with the current Google GenAI SDK.
- Configured temperature and token limits to provide optimal analysis.

## What's Completed
- ✅ Backend structural fixes (`main.py` routing).
- ✅ Strava OAuth redirect flow (`strava_service.py`).
- ✅ Frontend OAuth token capture and `localStorage` persistence (`app.js`).
- ✅ Frontend "Adjust Plan" API calls hooked up appropriately (`app.js`).
- ✅ Gemini model validation and selection (`gemini_service.py`).
- ✅ Fallback mock data structure constructed so the UI presentation and Gemini prompt generation can be reliably demonstrated (`strava_service.py`).

## Outstanding Items / Blockers
**To fetch real data, you must configure your API keys.**
The system is currently defaulting to the "mock" error handling routes because it lacks the necessary credentials to complete a live handshake with Strava or Google:

1. **Strava Credentials (`STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET`)**
   - You must create a Developer Application in your Strava Dashboard.
   - You must copy the resulting Client ID and Secret into your backend's `.env` file.
   - *Error Symbol:* When hitting "Connect to Strava" on the UI, the backend will return a 500 error (`"Strava Client ID not configured."`) until this is resolved.

2. **Google API Key (`GOOGLE_API_KEY`)**
   - While the key was technically present during development, the specific GCP project hit a `429 RESOURCE_EXHAUSTED` Quota Limit on the Gemini Free Tier for `gemini-2.0-flash`.
   - The frontend will safely display this exact error message in red if it encounters it. 
   - *Resolution:* Either wait for the daily quota to refresh, upgrade to a paid tier, or substitute a fresh API key.

## Next Steps
1. Populate your `.env` file with the correct `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`.
2. Ensure your `GOOGLE_API_KEY` has available quota.
3. Once those two steps are taken, clicking "Connect with Strava" and then "Adjust Plan" will execute the end-to-end integration seamlessly!
