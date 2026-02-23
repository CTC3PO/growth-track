# Multi-Agent Workflow Prompts
This document contains copy-pasteable prompts you can use to spin up independent AI agents to work on specific features of the **Mindful Life AI** project in parallel. 

By assigning one isolated feature to an agent, you prevent cross-file conflicts and ensure focused development.

## 1. Data Engineer Agent (Firestore Integration)
**Goal:** Replace the local JSON storage with Google Cloud Firestore.
```text
Act as an expert backend developer. Your sole task is to implement the persistence layer for the Mindful Life AI project.
1. Review `services/firestore_service.py` (which currently saves to a local JSON folder).
2. Refactor it to connect to a real Google Cloud Firestore instance or Supabase.
3. Ensure all CRUD operations for check-ins, journal entries, and reviews are fully functional.
4. Do NOT modify the UI or other AI agent files. Update any `.env.example` as needed for DB credentials.
```

## 2. Review AI Agent 
**Goal:** Activate the weekly/monthly narrative review generation.
```text
Act as an expert AI integrations developer. Your task is to activate the Review Agent feature.
1. Wire up the `/api/review/weekly` endpoint in `main.py` so the "Generate AI Review" button on the UI functions.
2. The logic in `services/review_agent.py` should gather the past 7 days of DB data, compute streaks, and send it to the Gemini API.
3. Ensure the prompt sent to Gemini effectively generates a summarized narrative review.
4. Do NOT modify any unrelated features or UI unassociated with this specific review flow.
```

## 3. Running Coach AI Agent
**Goal:** Hook up Strava data to Gemini for adaptive training plans.
```text
Act as an expert AI and health-tech developer. Your task is to build the Running Coach Agent.
1. Review the existing Strava POC in `services/strava_service.py`.
2. Connect the fetched Strava data to Gemini via `services/running_coach.py`.
3. The agent should evaluate the user's actual running performance vs. the static Half Marathon plan, and dynamically adjust next week's plan.
4. Expose an endpoint in `main.py` to retrieve the updated plan and display it on the UI's Running tab.
```

## 4. Reading Tracker AI Agent
**Goal:** Implement the Goodreads connection and reading reflection generator.
```text
Act as an expert AI integrations developer. Your task is to build the Reading Tracker Agent.
1. Replace the Goodreads API placeholder in the Reading Tab.
2. Connect to the Google Books API (or a Goodreads scraper/alternative if needed) to fetch current reading progress.
3. Create `services/reading_agent.py` to generate dynamic book-specific reflection questions utilizing Gemini.
4. Wire this up to the frontend so the user sees a personalized question based on their current book.
```

## 5. Journaling & Mindfulness Agent
**Goal:** Build the context-aware journaling prompt engine.
```text
Act as an AI prompt engineer and backend developer. Your task is to implement the Journaling Prompt Engine.
1. Create a `services/journal_agent.py` module.
2. This agent should generate daily journal prompts rooted in Thich Nhat Hanh and Stoic teachings.
3. The prompt must take context (training load, travel, recent reading) and adapt the daily question.
4. Wire up the backend endpoint and ensure the Journal Tab on the UI dynamically fetches today's unique prompt.
```
