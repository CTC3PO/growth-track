# Journaling Prompt Engine Task List

- [x] Planning
  - [x] Review `backend` and `frontend` codebase.
  - [x] Formulate `implementation_plan.md` for Journaling Agent.
  - [x] Get user approval for the implementation plan.
- [/] Execution
  - [x] Implement `backend/services/journal_agent.py` to interact with Gemini API.
    - [x] Add context gathering (training load, travel, recent reading).
    - [x] Create system prompts for Thich Nhat Hanh and Stoic teachings.
  - [x] Add API endpoint `/api/journal/prompt` to `backend/main.py` or a dedicated router.
  - [x] Update frontend `index.html` and `app.js` to fetch and display the generated prompt dynamically.
  - [x] Add Random Prompt UI tab and Logic to `index.html` and `app.js`.
  - [x] Add 100 Prompts List tab and Logic to `index.html` and `app.js`.
  - [x] Append custom Stoicism and Thich Nhat Hanh prompts to `templatePrompts` in `app.js`.
- [x] Verification
  - [x] Test the API endpoint locally.
  - [x] Verify the frontend displays the prompt correctly on the Journal Tab.

## Phase: Journaling Themes
- [x] UI Update
  - [x] Add theme selection pills to `frontend/index.html` journal entry form (Mindfulness, Professional Development, Family, Relationships, etc.).
- [x] Configuration Update
  - [x] Add Firebase env variables to `backend/.env.template`.
  - [x] Ensure `firebase-admin` is in `backend/requirements.txt`.

## Phase: Review AI Agent
- [x] Refactor Code Structure
  - [x] Move `review_agent.py` to `backend/services/`.
- [x] Update API Endpoints
  - [x] Update imports in `backend/main.py` for `/api/review/...` endpoints.
- [x] Verification
  - [x] Test the UI "Generate AI Review" buttons for Weekly, Monthly, and Quarterly views.
- [x] Frontend Logic
  - [x] Update `frontend/app.js` to allow selecting up to 3 themes and include them in the POST request.
- [x] Backend Update
  - [x] Update `backend/models/schemas.py` and POST `/api/journal` to accept and save the `themes` array.

## Phase: Reading Tracker Agent
- [x] Refactor Code Structure
  - [x] Create `backend/services/reading_agent.py`.
  - [x] Move `generate_reflection_prompts_for_book` out of `journal_agent.py`.
- [x] Update API Endpoints
  - [x] Update import in `backend/main.py` to pull from `services.reading_agent`.
- [x] Verification
  - [x] Run isolated Python test for `reading_agent.py`.

## Phase: Running Coach Agent
- [x] Strava Integration
  - [x] Ensure `backend/services/strava_service.py` handles OAuth routes (`/login`, `/callback`, `/activities`).
  - [x] Verify `/activities` properly falls back to a realistic mock token workflow when real tokens aren't available.
- [x] AI Coaching Logic
  - [x] Verify `backend/services/running_coach.py` successfully analyzes recent Strava data (mocked or real) against a Half Marathon base plan.
- [x] Frontend Wiring
  - [x] Confirm `app.js` captures `strava_token` from URL parameters and sets `localStorage`.
  - [x] Confirm "Adjust Plan" button sends the token parameter to the `GET /api/running_coach/plan` endpoint.
- [x] Verification
  - [x] Triggered mock API request successfully. Live test relies on active API Keys.
