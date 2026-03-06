# Frontend Refactoring Plan: Monolith to Next.js

## Goal Description
The current frontend is a massive monolith (`index.html` is ~1.4k lines, `app.js` is ~4.7k lines) handling everything from routing to API calls and DOM manipulation. This creates merge conflicts and is extremely difficult for AI agents to context-load.

We will refactor this into a modern stack (Next.js App Router, React, Tailwind CSS, TypeScript) following the **Feature-Sliced Design** architecture as dictated by `best-protocol.html`. The existing Python FastAPI backend (`main.py`) will remain intact, and the new Next.js app will consume its endpoints.

## User Review Required
> [!IMPORTANT]
> **Tech Stack Confirmation:** We are using **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Zustand** (for state like the Pomodoro timer and Auth). The backend will remain the Python FastAPI server on port 8080.
> **Please confirm if this is the desired stack and if I should proceed with Phase 1.**

---

## Agent Breakdown & Phased Execution

The refactor is broken down into sequential and parallelable phases. Different agents will pick these up.

### Phase 1: Project Setup & Foundation (Architect Agent)
**Goal:** Establish the codebase structure and design system.
- **[NEW]** Initialize Next.js app in `/growth-track/frontend-next` (leaving the old frontend intact for reference).
- **[NEW]** Configure `tailwind.config.ts` using the CSS variables from `style.css` (e.g., `var(--accent)`, `var(--bg-card)`).
- **[NEW]** Set up the Feature-Sliced folder structure (`src/features`, `src/shared/components`, `src/shared/api`, `src/shared/types`).
- **[NEW]** Base layout and Tab Navigation (Sidebar/Bottom Bar), implementing active tab persistence.

---

### Phase 2: Shared UI & Authentication (Frontend / API Agent)
**Goal:** Build the reusable LEGO blocks and secure the app.
- **[NEW]** `src/shared/components`: `Card`, `Button`, `Input`, `Toast`, `ThemeToggle`, `Pill`.
- **[NEW]** `src/features/auth`: Login/Signup forms, Zustand Auth Store, and API integration.
- **[NEW]** `src/shared/api/client.ts`: Wrapper around standard `fetch` that automatically injects auth headers.

---

### Phase 3: Feature Migration (Parallel Execution by Frontend/API Agents)
Since components are isolated, these can be built rapidly without conflict.

#### Phase 3A: Daily Check-in & Summary
- **[NEW]** `src/features/checkin`: Morning Planning, Exercise List, Daily Sliders.
- **[NEW]** `src/features/summary`: Year Progress Bar, Scorecards, AI Insights, Checklists.

#### Phase 3B: Journaling & AI Prompts
- **[NEW]** `src/features/journal`: Side-by-side layout, Voice recording button, Mix Tab, 100 Prompts list.

#### Phase 3C: Work & Activity Planner (Tiimo-Style)
- **[NEW]** `src/features/work`: Pomodoro Timer (global state via Zustand), Task Pills, Auto-logging to calendar.

#### Phase 3D: Running, Reading, & Social
- **[NEW]** `src/features/running`: Strava OAuth integration card, run logs.
- **[NEW]** `src/features/reading`: Book search, rating system.
- **[NEW]** `src/features/social`: Connection logging with duration fields.

---

### Phase 4: Cleanup & Handoff (QA Agent)
**Goal:** Ensure 1:1 parity with the monolith and verify production readiness.
- Run through the UI testing flows outlined in `walkthrough.md`.
- Ensure all offline behavior / calendar rendering works correctly.

## Verification Plan
1. **Automated Verifications:** TypeScript compilation will ensure that API responses match the expected `types` interfaces.
2. **Manual Verifications:** Testing the application in the browser. 
   - I will use the browser subagent to record a webp video of logging a run, creating a journal entry, and starting a Pomodoro timer.
   - You will verify the Next.js visual fidelity matches your existing monolithic design.
