# Implementation Plan — March 5th, 2026

## Context
The Mindful Life app's frontend is **monolithic** — `app.js` (3699 lines), `index.html` (~1000 lines), `style.css` (30KB). Multiple agents editing these files simultaneously **will** create merge conflicts. Therefore, work is organized into **sequential phases** where each phase can be handled by a separate chat/agent, but must be **committed and merged before the next phase starts**.

Login/Auth is **deferred** to a future stage per user request.

---

## Phase 1 — Quick Fixes (Agent A)
**Files touched:** `app.js`, `index.html`
**No conflicts:** This phase runs first, all other phases branch from its commit.

### 1A. Active Tab Persistence on Reload
- In the navigation click handler (`app.js` L10–28), save the active page to `localStorage`.
- On `DOMContentLoaded` (`app.js` L277), read `localStorage` and activate the saved page instead of defaulting to `page-checkin`.

### 1B. Rename "Deep Work" → "Work"
- `index.html`: Replace all 5 instances of "Deep Work" with "Work" (lines 148, 782, 881, 926, and any labels).
- `app.js`: Replace all 5 toast/label strings referencing "deep work" (lines 3004, 3007, 3060, 3086, 3137).

### 1C. Journal Theme Multi-Select Bug Fix
- The JS logic (`app.js` L2085–2108) already supports selecting up to 3 themes. Investigate why only 1 theme is actually selectable — likely a CSS issue where `.theme-pill.active` styles aren't visible, or a `pointer-events` / z-index issue blocking clicks on already-selected pills.
- Fix the CSS or HTML so visual feedback (`.active` class styling) works correctly, allowing 3 selections.

---

## Phase 2 — Social & Work Tab Enhancements (Agent B)
**Files touched:** `app.js` (Work section ~L2960–3150, Social section ~L3300+), `index.html` (Work tab `page-work`, Social tab `page-social`), `style.css`
**Prerequisite:** Phase 1 committed.

### 2A. Social Tab — Duration Input
- Add `duration_minutes` field to the social log form in `index.html`.
- Show duration input conditionally when category is "social events" or similar.
- Update `app.js` social form submit handler to include duration.
- Update backend `main.py` `SocialConnection` model and `update_social` to accept `duration_minutes`.

### 2B. Work Tab — Tiimo-Style Activity Planner (Combined View)
- **Combine "Log Work" and "Today's Plan"**: Merge the traditional manual "Log Work" form with the new "Today's Plan" activity planner, as they serve the same function.
- **Graphic Task List & Dial Checkboxes**: 
  - Refine the UI to be highly graphic, clean, and inspired by the Tiimo screenshots.
  - **Spacing & Layout**: Spread the tasks/activities out vertically. Place the scheduled time visually distinct and bold the task name.
- **Custom Pomodoro Tracking per Task**: 
  - Inside each task card, add an input field to manually record how many Pomodoros (e.g., 4, 5) were completed for that specific task.
  - Use a separate "Mark as Done" button on the task card to complete it.
- **Auto-Log to Work History**: 
  - Instead of logging a set 25 minutes on checkoff, the app will read the custom Pomodoro input (multiplying by 25 mins) and log *that* specific duration when "Mark as Done" is clicked.
- **Global Pomodoro Timer**: Keep the main Pomodoro timer separate but assignable to a task (when you click Focus, it remembers what task you are timing).

---

## Phase 3 — Daily Log Aggregation & Summary Tab (Agent C)
**Files touched:** `app.js` (Check-in section ~L534–800, Review/Summary section), `index.html` (Daily Log tab, Summary tab), `style.css`
**Prerequisite:** Phase 2 committed.

### 3A. Daily Log — Exercise & Meditation Inputs
- Add activity type dropdown to the exercise section in the Daily Log: walking, biking, strength training (in addition to running which is in the Run tab).
- Add duration inputs (hours/minutes) for each activity and for meditation.
- Update the check-in form submit handler in `app.js` to include these new fields.
- Update backend `main.py` check-in model to accept `exercises` (list) and `meditation_minutes`.

### 3B. Daily Log — Aggregation Card
- Build a summary card in the Daily Log that fetches and displays today's data from:
  - **Run tab**: today's runs (distance, duration)
  - **Reading tab**: pages read today
  - **Work tab**: work hours logged today
  - **Social tab**: interactions logged today
  - **Expense tab**: today's spend
- Display as a compact dashboard at the top of the Daily Log page.
- Add a JS function `loadDailySummary()` that calls the relevant API endpoints filtered by today's date.

### 3C. Summary Tab — Year Progress Bar
- Replace the placeholder content in the Summary/Review tab.
- Build a cascading progress bar: Year → Quarters → Months.
- Highlight current month/week with color shading; gray out past periods.
- Make each month clickable to reveal weekly checklists.
- Add "see more" toggle for collapsing past periods.
- When a week is clicked, fetch its checklist from `GET /api/reviews/checklist?period=weekly&date_str=...` (API already exists).

### 3D. Summary Tab — Checklist Forms
- Build form UI for weekly/monthly/quarterly checklists (referencing checklist PDF categories: Body, Mind, Spirit, Social, Career).
- The backend already generates templates with `_generate_checklist_template()` in `main.py` L582–643.
- Open checklist forms as modal overlays or in a dedicated view.
- Wire save to `POST /api/reviews/checklist` (API already exists).

---

## Phase 4 — AI & Journal Refinements (Agent D)
**Files touched:** `app.js` (Journal section ~L2085–2300), `backend/services/journal_agent.py`, `backend/main.py` (journal prompt endpoint)
**Prerequisite:** Phase 3 committed.

### 4A. AI Prompt — Cross-Tab Context
- Update `GET /api/journal/prompt` in `main.py` (L460–517) to also pull:
  - Recent social interactions (already partially done with travel)
  - Reading progress/current book (already done)
  - Work session patterns
  - **Skip expenses** per user request.
- Update journal prompt generation in `journal_agent.py` to use this broader context for higher-level reflective prompts.

---

## Verification Plan

### Browser Testing (per phase)
After each phase is committed, verify in the browser:

1. **Phase 1:**
   - Reload the page from any non-default tab → verify it stays on that tab.
   - Check the Work tab for any remaining "Deep Work" text → should all say "Work".
   - Go to Journal → Writing card → click multiple theme pills → verify 2–3 can be selected with visual feedback.

2. **Phase 2:**
   - Log a social event with category "social events" → verify duration input appears and saves.
   - In Work tab, add tasks with time slots → verify they render, can be checked off, and show Pomodoro timer.

3. **Phase 3:**
   - Log activities across multiple tabs for today → verify Daily Log aggregation card shows all.
   - Go to Summary tab → verify progress bar renders with current week/month highlighted.
   - Click into a week → verify checklist form loads with Body/Mind/Spirit/Social/Career categories.
   - Fill and save a checklist → reload → verify it persists.

4. **Phase 4:**
   - Request a journal prompt → verify the AI response references recent running/reading/social activity.

### Manual Verification
- User deploys to Vercel after all phases and manually tests the full flow on production.

---

## Parallel Work Strategy

> [!IMPORTANT]
> Because the frontend is monolithic (3 files), agents **cannot** work in parallel on frontend changes. Each phase must be committed before the next begins.

However, **backend-only work can overlap with frontend work** if it doesn't touch `main.py` at the same time. Practically:

| Phase | Can run in parallel with | Must wait for |
|-------|--------------------------|---------------|
| **Phase 1 (Agent A)** | Nothing — goes first | — |
| **Phase 2 (Agent B)** | — | Phase 1 commit |
| **Phase 3 (Agent C)** | — | Phase 2 commit |
| **Phase 4 (Agent D)** | — | Phase 3 commit |

**Recommendation:** Start Phase 1 in this chat (it's small — ~30 min of work), then hand off Phase 2/3/4 to separate chats sequentially.
