"""
Mindful Life AI — FastAPI Backend
POC focused on: Review Agent + Journaling Prompt Engine + Simple Trackers
"""

import os
import sys
from datetime import date, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Add backend dir to path for imports
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

from models.schemas import (
    DailyCheckIn, RunLog, BookEntry, JournalEntry,
    ChatMessage, ChatResponse, ReviewRequest, TravelExpense, SocialConnection,
    WorkSession, WorkTask, ReadingProgressEntry, BookNote, ReviewChecklist,
)
from services.firestore_service import save_document, get_documents, get_documents_by_date_range, delete_document
from services.journal_agent import generate_journal_prompt
from services.reading_agent import generate_reflection_prompts_for_book
from services.review_agent import generate_weekly_review, generate_monthly_review, generate_quarterly_review
from services.summary_agent import generate_summary
from services.strava_service import router as strava_router
from services.transcription_service import transcribe_audio
from services.work_agent import generate_work_insights


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("🧘 Mindful Life AI starting up...")
    print(f"   Environment: {os.getenv('APP_ENV', 'development')}")
    print(f"   GCP Project: {os.getenv('GOOGLE_CLOUD_PROJECT_ID', 'not set')}")
    yield
    print("🙏 Mindful Life AI shutting down...")


app = FastAPI(
    title="Mindful Life AI",
    description="Personal life integration AI assistant with review agent and journaling prompt engine",
    version="0.1.0",
    lifespan=lifespan,
)

from fastapi.responses import JSONResponse

# CORS for frontend
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")] if allowed_origins_str else ["http://localhost:8080", "http://127.0.0.1:8080"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the new Strava router
app.include_router(strava_router, prefix="/api/strava")


# ─── Health Check ────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Mindful Life AI",
        "version": "0.1.0",
        "gcp_project": os.getenv("GOOGLE_CLOUD_PROJECT_ID", "not configured"),
    }


# ─── Daily Check-In ─────────────────────────────────────────────────

@app.post("/api/checkin")
async def create_checkin(checkin: DailyCheckIn):
    """Log a daily check-in (2-minute form)."""
    doc_id = save_document("checkins", checkin.model_dump(), doc_id=f"checkin_{checkin.date}")
    return {"status": "saved", "id": doc_id, "message": "Daily check-in logged 🧘"}


@app.get("/api/checkin/{date_str}")
async def get_checkin_by_date(date_str: str):
    """Get a check-in by its date string (YYYY-MM-DD)."""
    checkins = get_documents("checkins", limit=1000)
    for c in checkins:
        if c.get("date") == date_str:
            return c
    return None


@app.get("/api/checkins")
async def get_checkins(limit: int = 30):
    """Get recent check-ins."""
    return get_documents("checkins", limit=limit)


@app.put("/api/checkins/{checkin_id}")
async def update_checkin(checkin_id: str, updates: dict):
    """Update a check-in entry."""
    checkins = get_documents("checkins", limit=1000)
    for c in checkins:
        if c.get("id") == checkin_id:
            for key in ["date", "sleep_time", "wake_time", "sleep_hours", "steps",
                        "meditation", "meditation_minutes", "journal_words",
                        "deep_work_hours", "energy", "alignment", "notes",
                        "morning_activities", "intention"]:
                if key in updates:
                    c[key] = updates[key]
            cid = c.pop("id", checkin_id)
            save_document("checkins", c, doc_id=cid)
            return {"status": "updated", "id": cid}
    raise HTTPException(status_code=404, detail="Check-in not found")


@app.delete("/api/checkins/{checkin_id}")
async def delete_checkin(checkin_id: str):
    """Delete a check-in entry."""
    if delete_document("checkins", checkin_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Check-in not found")


# ─── Running ─────────────────────────────────────────────────────────

@app.post("/api/runs")
async def log_run(run: RunLog):
    """Log a run."""
    doc_id = save_document("runs", run.model_dump())
    return {"status": "saved", "id": doc_id, "message": f"Run logged: {run.distance_km}km 🏃"}

@app.put("/api/runs/{run_id}")
async def update_run(run_id: str, updates: dict):
    runs = get_documents("runs", limit=1000)
    for r in runs:
        if r.get("id") == run_id:
            for key in ["date", "distance_km", "duration_minutes", "run_type", "notes"]:
                if key in updates:
                    r[key] = updates[key]
            rid = r.pop("id", run_id)
            save_document("runs", r, doc_id=rid)
            return {"status": "updated", "id": rid}
    raise HTTPException(status_code=404, detail="Run not found")

@app.delete("/api/runs/{run_id}")
async def delete_run(run_id: str):
    if delete_document("runs", run_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Run not found")


@app.get("/api/runs")
async def get_runs(limit: int = 30):
    """Get recent runs."""
    return get_documents("runs", limit=limit)


@app.get("/api/running_coach/plan")
async def get_running_plan(access_token: str):
    """Get a dynamically adjusted running plan based on Strava data."""
    from services.running_coach import generate_adjusted_plan
    try:
        plan = await generate_adjusted_plan(access_token)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Work ────────────────────────────────────────────────────────────

@app.post("/api/work")
async def log_work_session(session: WorkSession):
    """Log a deep work session."""
    doc_id = save_document("work", session.model_dump())
    return {"status": "saved", "id": doc_id, "message": f"Work session logged: {session.duration_minutes}m ⏱️"}

@app.put("/api/work/{work_id}")
async def update_work_session(work_id: str, updates: dict):
    sessions = get_documents("work", limit=1000)
    for s in sessions:
        if s.get("id") == work_id:
            for key in ["date", "duration_minutes", "category", "notes"]:
                if key in updates:
                    s[key] = updates[key]
            sid = s.pop("id", work_id)
            save_document("work", s, doc_id=sid)
            return {"status": "updated", "id": sid}
    raise HTTPException(status_code=404, detail="Session not found")

@app.delete("/api/work/{work_id}")
async def delete_work_session(work_id: str):
    if delete_document("work", work_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Session not found")


@app.get("/api/work")
async def get_work_sessions(limit: int = 50):
    """Get recent work sessions."""
    return get_documents("work", limit=limit)

@app.get("/api/work/insights")
async def get_work_insights():
    """Generate productivity insights from recent work sessions."""
    # Get last 50 work sessions for the user to generate insights
    sessions = get_documents("work", limit=50)
    
    if not sessions:
        return {"insight": "Not enough data yet. Log some work sessions to get insights!"}

    insight = generate_work_insights(sessions)
    return {"insight": insight}


# ─── Work Tasks (Activity Planner) ───────────────────────────────────

@app.post("/api/work/tasks")
async def create_work_task(task: WorkTask):
    """Create a new work task for the daily planner."""
    doc_id = save_document("work_tasks", task.model_dump())
    return {"status": "saved", "id": doc_id, "message": f"Task added: {task.name} ✅"}


@app.get("/api/work/tasks")
async def get_work_tasks(date_str: str = None, limit: int = 50):
    """Get work tasks, optionally filtered by date."""
    tasks = get_documents("work_tasks", limit=limit)
    if date_str:
        tasks = [t for t in tasks if t.get("date") == date_str]
    # Sort by order then time_slot
    tasks.sort(key=lambda t: (t.get("order", 0), t.get("time_slot", "")))
    return tasks


@app.put("/api/work/tasks/{task_id}")
async def update_work_task(task_id: str, updates: dict):
    """Update a work task (toggle completion, edit fields)."""
    tasks = get_documents("work_tasks", limit=1000)
    for t in tasks:
        if t.get("id") == task_id:
            for key in ["name", "time_slot", "category", "completed", "duration_minutes", "order", "date"]:
                if key in updates:
                    t[key] = updates[key]
            tid = t.pop("id", task_id)
            save_document("work_tasks", t, doc_id=tid)
            return {"status": "updated", "id": tid}
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/api/work/tasks/{task_id}")
async def delete_work_task(task_id: str):
    """Delete a work task."""
    if delete_document("work_tasks", task_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Task not found")


# ─── Reading ─────────────────────────────────────────────────────────

@app.post("/api/books")
async def add_book(book: BookEntry):
    """Add or update a book entry."""
    doc_id = save_document("books", book.model_dump())
    result = {"status": "saved", "id": doc_id, "message": f"Book logged: {book.title} 📚"}

    # If book is finished, generate reflection prompts
    if book.is_finished and book.rating:
        try:
            prompts = generate_reflection_prompts_for_book(
                book.title, book.author, book.genre.value,
                book.reaction or ""
            )
            result["reflection_prompts"] = prompts
        except Exception:
            pass

    return result


@app.put("/api/books/{book_id}")
async def update_book(book_id: str, updates: dict):
    """Update a book entry (status, is_finished, etc)."""
    books = get_documents("books", limit=1000)
    for b in books:
        if b.get("id") == book_id:
            for key in ["title", "author", "genre", "status", "is_finished", "rating", "reaction", "cover_url", "pages", "pages_read", "date_started", "date_finished"]:
                if key in updates:
                    b[key] = updates[key]
            bid = b.pop("id", book_id)
            save_document("books", b, doc_id=bid)
            return {"status": "updated", "id": bid}
    raise HTTPException(status_code=404, detail="Book not found")

@app.delete("/api/books/{book_id}")
async def delete_book(book_id: str):
    if delete_document("books", book_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Book not found")


@app.get("/api/books/search")
async def search_books(q: str):
    """Search for books via OpenLibrary API."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://openlibrary.org/search.json?q={q}&limit=5")
            data = response.json()
            results = []
            for doc in data.get("docs", []):
                results.append({
                    "title": doc.get("title", ""),
                    "author": doc.get("author_name", [""])[0] if doc.get("author_name") else "",
                    "cover_i": doc.get("cover_i")
                })
            return {"status": "success", "results": results}
    except Exception as e:
        return {"status": "error", "message": f"Failed to search books: {str(e)}"}


@app.get("/api/books")
async def get_books(limit: int = 50):
    """Get book entries."""
    books = get_documents("books", limit=limit)
    # Enrich with total pages read from progress log
    for b in books:
        book_id = b.get("id")
        if book_id:
            progress = get_documents("reading_progress", limit=1000)
            total = sum(p.get("pages_read", 0) for p in progress if p.get("book_id") == book_id)
            if total > 0:
                b["pages_read"] = total
    return books


@app.post("/api/books/{book_id}/progress")
async def add_reading_progress(book_id: str, entry: ReadingProgressEntry):
    """Log pages read for a book on a specific date."""
    data = entry.model_dump()
    data["book_id"] = book_id
    doc_id = save_document("reading_progress", data)
    # Also update the book's pages_read total
    books = get_documents("books", limit=1000)
    for b in books:
        if b.get("id") == book_id:
            current = b.get("pages_read", 0) or 0
            b["pages_read"] = current + entry.pages_read
            bid = b.pop("id", book_id)
            save_document("books", b, doc_id=bid)
            break
    return {"status": "saved", "id": doc_id, "message": f"+{entry.pages_read} pages logged 📖"}


@app.get("/api/books/{book_id}/progress")
async def get_reading_progress(book_id: str):
    """Get reading progress entries for a book."""
    progress = get_documents("reading_progress", limit=1000)
    book_progress = [p for p in progress if p.get("book_id") == book_id]
    return book_progress


@app.post("/api/books/{book_id}/notes")
async def add_book_note(book_id: str, note: BookNote):
    """Add a note or annotation to a book."""
    data = note.model_dump()
    data["book_id"] = book_id
    doc_id = save_document("book_notes", data)
    return {"status": "saved", "id": doc_id, "message": "Note added 📝"}


@app.get("/api/books/{book_id}/notes")
async def get_book_notes(book_id: str):
    """Get notes for a specific book."""
    notes = get_documents("book_notes", limit=1000)
    book_notes = [n for n in notes if n.get("book_id") == book_id]
    return book_notes


@app.get("/api/books/stats")
async def get_reading_stats():
    """Get reading progress toward 50/year goal."""
    books = get_documents("books", limit=1000)
    current_year = str(date.today().year)
    
    # Filter for books finished this year (fallback to created_at if date_finished is missing)
    finished = []
    for b in books:
        if b.get("is_finished") or b.get("status") == "read":
            stamp = b.get("date_finished") or b.get("created_at", "")
            if stamp.startswith(current_year):
                finished.append(b)

    genres = {}
    for b in finished:
        g = b.get("genre", "other")
        genres[g] = genres.get(g, 0) + 1

    books_count = len(finished)
    day_of_year = (date.today() - date(date.today().year, 1, 1)).days + 1
    expected = round(50 * day_of_year / 365, 1)

    return {
        "books_finished": books_count,
        "yearly_goal": 50,
        "pace_pct": round(books_count / 50 * 100, 1),
        "expected_by_now": expected,
        "on_track": books_count >= expected,
        "genres": genres,
    }


# ─── Journaling ──────────────────────────────────────────────────────
@app.post("/api/journal")
async def create_journal_entry(entry: JournalEntry):
    """Save a journal entry."""
    entry.word_count = len(entry.content.split())
    doc_id = save_document("journals", entry.model_dump())
    return {"status": "saved", "id": doc_id, "word_count": entry.word_count}


@app.get("/api/journal")
async def get_journal_entries(limit: int = 20):
    """Get recent journal entries."""
    return get_documents("journals", limit=limit)


@app.put("/api/journal/{journal_id}")
async def update_journal_entry(journal_id: str, updates: dict):
    """Update a journal entry."""
    journals = get_documents("journals", limit=1000)
    for j in journals:
        if j.get("id") == journal_id:
            for key in ["date", "content", "prompt_used", "mood", "tags", "themes"]:
                if key in updates:
                    j[key] = updates[key]
            # Recalculate word count if content changed
            if "content" in updates:
                j["word_count"] = len(updates["content"].split())
            jid = j.pop("id", journal_id)
            save_document("journals", j, doc_id=jid)
            return {"status": "updated", "id": jid}
    raise HTTPException(status_code=404, detail="Journal entry not found")


@app.delete("/api/journal/{journal_id}")
async def delete_journal_entry(journal_id: str):
    """Delete a journal entry."""
    if delete_document("journals", journal_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Journal entry not found")


@app.post("/api/gratitude")
async def create_gratitude_entry(entry: dict):
    """Save a gratitude entry."""
    from datetime import date
    if "date" not in entry:
        entry["date"] = date.today().isoformat()
    # Support list of items
    doc_id = save_document("gratitude", entry)
    return {"status": "saved", "id": doc_id}


@app.get("/api/gratitude")
async def get_gratitude_entries(limit: int = 50):
    """Get recent gratitude entries."""
    return get_documents("gratitude", limit=limit)


@app.put("/api/gratitude/{gratitude_id}")
async def update_gratitude_entry(gratitude_id: str, updates: dict):
    """Update a gratitude entry."""
    entries = get_documents("gratitude", limit=1000)
    for g in entries:
        if g.get("id") == gratitude_id:
            for key in ["date", "items", "content"]:
                if key in updates:
                    g[key] = updates[key]
            gid = g.pop("id", gratitude_id)
            save_document("gratitude", g, doc_id=gid)
            return {"status": "updated", "id": gid}
    raise HTTPException(status_code=404, detail="Gratitude entry not found")


@app.delete("/api/gratitude/{gratitude_id}")
async def delete_gratitude_entry(gratitude_id: str):
    """Delete a gratitude entry."""
    if delete_document("gratitude", gratitude_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Gratitude entry not found")


@app.get("/api/journal/prompt")
async def get_journal_prompt(tradition: str = "blended", mode: str = "daily", seed_prompts: str = ""):
    """Generate a context-aware journal prompt."""
    # Gather context from recent data
    context = {}
    try:
        recent_checkins = get_documents("checkins", limit=3)
        if recent_checkins:
            latest = recent_checkins[0]
            context["energy"] = latest.get("energy")
            context["alignment"] = latest.get("alignment")
            context["sleep_hours"] = latest.get("sleep_hours")
            context["steps"] = latest.get("steps")
            context["meditation_streak"] = sum(
                1 for c in recent_checkins if c.get("meditation")
            )

        recent_runs = get_documents("runs", limit=7)
        if recent_runs:
            context["recent_run_km"] = round(
                sum(r.get("distance_km", 0) for r in recent_runs), 1
            )

        recent_journals = get_documents("journals", limit=1)
        if recent_journals:
            last = recent_journals[0]
            context["last_journal_mood"] = last.get("mood")
            context["last_journal_themes"] = last.get("themes", [])
            last_journal_date = last.get("date", "")
            if last_journal_date:
                try:
                    from datetime import datetime
                    last_date = datetime.fromisoformat(last_journal_date).date()
                    gap = (date.today() - last_date).days
                    context["journal_gap_days"] = gap
                except Exception:
                    pass

        recent_books = get_documents("books", limit=5)
        if recent_books:
            # find the latest book being read or finished
            book_title = recent_books[0].get("title")
            if book_title:
                context["books_reading"] = book_title

        recent_social = get_documents("social_connections", limit=5)
        if recent_social:
            latest = recent_social[0]
            context["recent_social_connection"] = latest.get("person", "")
            context["recent_social_activity"] = latest.get("activity", "")
            
        recent_work = get_documents("work", limit=5)
        if recent_work:
            work_hours = sum(w.get("duration_minutes", 0) for w in recent_work) / 60
            context["recent_work_hours"] = round(work_hours, 1)

        import calendar
        context["day_of_week"] = calendar.day_name[date.today().weekday()]
        if mode == "mix":
            # Aggregate weekly context
            weekly_checkins = get_documents("checkins", limit=7)
            weekly_runs = get_documents("runs", limit=10)
            weekly_social = get_documents("social_connections", limit=15)
            weekly_work = get_documents("work", limit=20)
            
            context["weekly_stats"] = {
                "total_km": round(sum(r.get("distance_km", 0) for r in weekly_runs), 1),
                "avg_sleep": round(sum(c.get("sleep_hours", 0) for c in weekly_checkins) / len(weekly_checkins), 1) if weekly_checkins else 0,
                "total_steps": sum(c.get("steps", 0) for c in weekly_checkins),
                "social_count": len(weekly_social),
                "work_hours": round(sum(w.get("duration_minutes", 0) for w in weekly_work) / 60, 1)
            }
            context["seed_prompts"] = seed_prompts.split("||") if seed_prompts else []
    except Exception:
        pass

    prompt_data = generate_journal_prompt(tradition=tradition, context=context, mode=mode)
    return {**prompt_data, "context_data": context}


@app.post("/api/journal/transcribe")
async def transcribe_journal_audio(audio: UploadFile = File(...)):
    """Transcribe uploaded audio using Gemini multimodal AI."""
    # Validate file type
    allowed_types = [
        "audio/webm", "audio/wav", "audio/mp3", "audio/mpeg",
        "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac",
        "video/webm",  # MediaRecorder sometimes uses video/webm
    ]
    content_type = audio.content_type or "audio/webm"
    if content_type not in allowed_types:
        raise HTTPException(400, f"Unsupported audio type: {content_type}. Supported: {allowed_types}")

    # Read audio bytes (limit to 25MB)
    audio_bytes = await audio.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(400, "Audio file too large. Maximum 25MB.")
    if len(audio_bytes) == 0:
        raise HTTPException(400, "Empty audio file.")

    result = transcribe_audio(audio_bytes, mime_type=content_type)

    if not result["success"]:
        raise HTTPException(500, f"Transcription failed: {result.get('error', 'Unknown error')}")

    return result


# ─── Reviews ─────────────────────────────────────────────────────────

@app.get("/api/review/weekly")
async def get_weekly_review(start_date: str = None, generate: bool = False):
    """Generate a weekly review. Defaults to current week."""
    if not start_date:
        today = date.today()
        start = today - timedelta(days=today.weekday())
        start_date = start.isoformat()
    end_date = (date.fromisoformat(start_date) + timedelta(days=6)).isoformat()

    return generate_weekly_review(start_date, end_date, generate_ai=generate)


@app.get("/api/review/monthly")
async def get_monthly_review(year: int = None, month: int = None, generate: bool = False):
    """Generate a monthly review."""
    today = date.today()
    year = year or today.year
    month = month or today.month
    return generate_monthly_review(year, month, generate_ai=generate)


@app.get("/api/review/quarterly")
async def get_quarterly_review(year: int = None, quarter: int = None, generate: bool = False):
    """Generate a quarterly review."""
    today = date.today()
    year = year or today.year
    quarter = quarter or ((today.month - 1) // 3 + 1)
    return generate_quarterly_review(year, quarter, generate_ai=generate)


# ─── Review Checklists ──────────────────────────────────────────────

def _generate_checklist_template(period: str) -> dict:
    """Generate a structured checklist template based on the user's PDF categories."""
    base_body = [
        {"id": "body_sleep", "text": "Sleep 10:30 PM - 6:00 AM consistently", "category": "body"},
        {"id": "body_steps", "text": "9k steps before 9 AM", "category": "body"},
        {"id": "body_running", "text": "Running training on schedule", "category": "body"},
        {"id": "body_gym", "text": "Gym or cross-training session(s)", "category": "body"},
        {"id": "body_nutrition", "text": "Meal prep and mindful eating", "category": "body"},
    ]
    base_mind = [
        {"id": "mind_deepwork", "text": "Deep work block (minimum 3 hours/day)", "category": "mind"},
        {"id": "mind_reading", "text": "Reading progress (pages/books)", "category": "mind"},
        {"id": "mind_courses", "text": "Course study (AWS/ML/DSA)", "category": "mind"},
        {"id": "mind_journal_words", "text": "Journaling consistency", "category": "mind"},
    ]
    base_spirit = [
        {"id": "spirit_meditation", "text": "Morning meditation (6:00-6:30)", "category": "spirit"},
        {"id": "spirit_journaling", "text": "Morning journaling (6:30-7:00)", "category": "spirit"},
        {"id": "spirit_alignment", "text": "Alignment score reflection", "category": "spirit"},
        {"id": "spirit_gratitude", "text": "Gratitude practice", "category": "spirit"},
        {"id": "spirit_sangha", "text": "Sangha/community activity", "category": "spirit"},
    ]
    base_social = [
        {"id": "social_friends", "text": "Quality time with friends", "category": "social"},
        {"id": "social_family", "text": "Family call (Vietnam)", "category": "social"},
        {"id": "social_networking", "text": "Networking or professional connection", "category": "social"},
        {"id": "social_therapy", "text": "Weekly therapy or check-in call", "category": "social"},
    ]
    base_career = [
        {"id": "career_progress", "text": "Career/job progress toward goals", "category": "career"},
        {"id": "career_budget", "text": "Budget and expense tracking", "category": "career"},
        {"id": "career_learning", "text": "Professional development", "category": "career"},
    ]

    if period == "monthly":
        base_body.append({"id": "body_month_km", "text": "Monthly running km target met", "category": "body"})
        base_body.append({"id": "body_health_check", "text": "Health transformation progress", "category": "body"})
        base_mind.append({"id": "mind_books_month", "text": "Books finished this month toward goal", "category": "mind"})
        base_mind.append({"id": "mind_cert_progress", "text": "Certification progress review", "category": "mind"})
        base_spirit.append({"id": "spirit_retreat", "text": "Retreat or extended practice planned", "category": "spirit"})
        base_spirit.append({"id": "spirit_inner_peace", "text": "Inner peace score (1-10)", "category": "spirit"})
        base_social.append({"id": "social_new_friends", "text": "New meaningful connections made", "category": "social"})
        base_career.append({"id": "career_month_review", "text": "Monthly financial summary review", "category": "career"})
        base_career.append({"id": "career_mentors", "text": "Mentorship progress", "category": "career"})
    elif period == "quarterly":
        base_body.append({"id": "body_marathon", "text": "Half-marathon/marathon progress vs plan", "category": "body"})
        base_body.append({"id": "body_consistency", "text": "Running consistency %", "category": "body"})
        base_mind.append({"id": "mind_graduation", "text": "Academic/graduation progress", "category": "mind"})
        base_mind.append({"id": "mind_books_quarter", "text": "Books read vs quarterly goal (3/quarter)", "category": "mind"})
        base_spirit.append({"id": "spirit_retreat_q", "text": "Retreat attended (1/quarter goal)", "category": "spirit"})
        base_spirit.append({"id": "spirit_meditation_q", "text": "Meditation practice consistency", "category": "spirit"})
        base_social.append({"id": "social_friendships", "text": "Quality friendships deepened", "category": "social"})
        base_career.append({"id": "career_job", "text": "Job/internship status", "category": "career"})
        base_career.append({"id": "career_certs_q", "text": "AWS certs progress (X/2)", "category": "career"})

    return {
        "body": base_body,
        "mind": base_mind,
        "spirit": base_spirit,
        "social": base_social,
        "career": base_career,
    }


@app.get("/api/reviews/checklist")
async def get_checklist_template(period: str = "weekly", date_str: str = None):
    """Get a checklist template for a given period."""
    if period not in ("weekly", "monthly", "quarterly"):
        raise HTTPException(400, "period must be weekly, monthly, or quarterly")

    today = date.today()
    if period == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
    elif period == "monthly":
        start = today.replace(day=1)
        import calendar
        _, last_day = calendar.monthrange(today.year, today.month)
        end = today.replace(day=last_day)
    else:
        q = (today.month - 1) // 3
        start = date(today.year, q * 3 + 1, 1)
        end_month = q * 3 + 3
        import calendar
        _, last_day = calendar.monthrange(today.year, end_month)
        end = date(today.year, end_month, last_day)

    # Check if a saved checklist exists for this period
    saved = get_documents("review_checklists", limit=100)
    for s in saved:
        if s.get("period") == period and s.get("start_date") == start.isoformat():
            return s

    # Generate fresh template
    template = _generate_checklist_template(period)
    return {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "categories": template,
        "completed_items": [],
        "notes": None,
    }


@app.post("/api/reviews/checklist")
async def save_checklist(checklist: ReviewChecklist):
    """Save or update a completed checklist."""
    doc_id = f"checklist_{checklist.period}_{checklist.start_date}"
    data = checklist.model_dump()
    saved_id = save_document("review_checklists", data, doc_id=doc_id)
    return {"status": "saved", "id": saved_id}


@app.get("/api/reviews/checklists")
async def list_checklists(period: str = None, limit: int = 20):
    """List saved checklists, optionally filtered by period."""
    checklists = get_documents("review_checklists", limit=limit)
    if period:
        checklists = [c for c in checklists if c.get("period") == period]
    return checklists


# ─── AI Summary ──────────────────────────────────────────────────────

@app.get("/api/summary")
async def get_summary(days: int = 7, type: str = "all"):
    """Generate an AI-powered summary of recent journals and activities."""
    if days < 1 or days > 90:
        raise HTTPException(400, "days must be between 1 and 90")
    if type not in ("journals", "activities", "all"):
        raise HTTPException(400, "type must be 'journals', 'activities', or 'all'")
    try:
        return generate_summary(days=days, summary_type=type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Travel / Expenses ──────────────────────────────────────────────

# Static exchange rates (updated periodically, avoids external API dependency)
EXCHANGE_RATES_TO_USD = {
    "USD": 1.0,
    "VND": 0.000039,
    "EUR": 1.08,
    "GBP": 1.26,
    "JPY": 0.0067,
    "THB": 0.028,
    "KRW": 0.00074,
    "SGD": 0.74,
    "AUD": 0.65,
    "CAD": 0.74,
    "CHF": 1.11,
    "CNY": 0.14,
    "INR": 0.012,
    "MYR": 0.22,
    "PHP": 0.018,
    "TWD": 0.031,
    "IDR": 0.000063,
    "LAK": 0.000046,
    "KHR": 0.00024,
    "MMK": 0.00048,
}


@app.post("/api/travel/expenses")
async def add_expense(expense: TravelExpense):
    """Log a travel expense."""
    data = expense.model_dump()
    # Auto-convert to USD
    rate = EXCHANGE_RATES_TO_USD.get(expense.currency.upper(), None)
    if rate:
        data["amount_usd"] = round(expense.amount * rate, 2)
    # Auto-convert to VND
    vnd_rate = EXCHANGE_RATES_TO_USD.get("VND")
    if rate and vnd_rate and expense.currency.upper() != "VND":
        data["amount_vnd"] = round(expense.amount * rate / vnd_rate, 0)
    elif expense.currency.upper() == "VND":
        data["amount_vnd"] = expense.amount
    doc_id = save_document("travel_expenses", data)
    return {
        "status": "saved",
        "id": doc_id,
        "amount_usd": data.get("amount_usd"),
        "amount_vnd": data.get("amount_vnd"),
        "message": f"Expense logged: {expense.amount} {expense.currency} 🧳",
    }

@app.put("/api/travel/expenses/{expense_id}")
async def update_expense(expense_id: str, updates: dict):
    expenses = get_documents("travel_expenses", limit=1000)
    for e in expenses:
        if e.get("id") == expense_id:
            for key in ["date", "amount", "currency", "category", "description", "trip"]:
                if key in updates:
                    e[key] = updates[key]
            # Auto-convert to USD and VND
            rate = EXCHANGE_RATES_TO_USD.get(e.get("currency", "USD").upper(), None)
            vnd_rate = EXCHANGE_RATES_TO_USD.get("VND")
            if rate and e.get("amount"):
                e["amount_usd"] = round(float(e["amount"]) * rate, 2)
                if e.get("currency", "").upper() != "VND" and vnd_rate:
                    e["amount_vnd"] = round(float(e["amount"]) * rate / vnd_rate, 0)
                elif e.get("currency", "").upper() == "VND":
                    e["amount_vnd"] = float(e["amount"])

            eid = e.pop("id", expense_id)
            save_document("travel_expenses", e, doc_id=eid)
            return {"status": "updated", "id": eid, "amount_usd": e.get("amount_usd"), "amount_vnd": e.get("amount_vnd")}
    raise HTTPException(status_code=404, detail="Expense not found")

@app.delete("/api/travel/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    if delete_document("travel_expenses", expense_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Expense not found")


@app.get("/api/travel/expenses")
async def get_expenses(trip: str = None, limit: int = 50):
    """Get travel expenses, optionally filtered by trip name."""
    expenses = get_documents("travel_expenses", limit=limit)
    if trip:
        expenses = [e for e in expenses if e.get("trip", "").lower() == trip.lower()]

    total_usd = sum(e.get("amount_usd", 0) for e in expenses)
    by_category = {}
    for e in expenses:
        cat = e.get("category", "other")
        by_category[cat] = round(by_category.get(cat, 0) + e.get("amount_usd", 0), 2)

    return {
        "expenses": expenses,
        "total_usd": round(total_usd, 2),
        "by_category": by_category,
        "count": len(expenses),
    }


@app.get("/api/travel/convert")
async def convert_currency(amount: float, from_curr: str = "VND", to_curr: str = "USD"):
    """Convert between currencies using static rates."""
    from_rate = EXCHANGE_RATES_TO_USD.get(from_curr.upper())
    to_rate = EXCHANGE_RATES_TO_USD.get(to_curr.upper())
    if not from_rate or not to_rate:
        supported = list(EXCHANGE_RATES_TO_USD.keys())
        raise HTTPException(400, f"Unsupported currency. Supported: {supported}")

    usd_amount = amount * from_rate
    converted = round(usd_amount / to_rate, 2)
    return {
        "from_amount": amount,
        "from_currency": from_curr.upper(),
        "to_amount": converted,
        "to_currency": to_curr.upper(),
        "rate": round(from_rate / to_rate, 8),
    }


@app.get("/api/travel/currencies")
async def list_currencies():
    """List supported currencies."""
    return {"currencies": list(EXCHANGE_RATES_TO_USD.keys())}


# ─── Social ─────────────────────────────────────────────────────────

@app.post("/api/social")
async def log_social(connection: SocialConnection):
    """Log a social interaction."""
    doc_id = save_document("social", connection.model_dump())
    return {"status": "saved", "id": doc_id, "message": f"Connection logged: {connection.name} 🤝"}

@app.put("/api/social/{social_id}")
async def update_social(social_id: str, updates: dict):
    connections = get_documents("social", limit=1000)
    for c in connections:
        if c.get("id") == social_id:
            for key in ["date", "name", "category", "context", "location", "notes", "follow_up", "duration_minutes"]:
                if key in updates:
                    c[key] = updates[key]
            cid = c.pop("id", social_id)
            save_document("social", c, doc_id=cid)
            return {"status": "updated", "id": cid}
    raise HTTPException(status_code=404, detail="Connection not found")

@app.delete("/api/social/{social_id}")
async def delete_social(social_id: str):
    if delete_document("social", social_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Connection not found")


@app.get("/api/social")
async def get_social(limit: int = 50):
    """Get social connections."""
    return get_documents("social", limit=limit)


@app.get("/api/social/stats")
async def get_social_stats(start_date: str = None, end_date: str = None):
    """Get social stats for a date range."""
    if not start_date:
        today_d = date.today()
        start_date = (today_d - timedelta(days=30)).isoformat()
        end_date = today_d.isoformat()

    connections = get_documents_by_date_range("social", start_date, end_date)
    by_category = {}
    unique_people = set()
    for c in connections:
        cat = c.get("category", "friend")
        by_category[cat] = by_category.get(cat, 0) + 1
        unique_people.add(c.get("name", "").lower().strip())

    return {
        "total_interactions": len(connections),
        "unique_people": len(unique_people),
        "by_category": by_category,
        "connections": connections,
    }


# ─── Chat (general AI interaction) ──────────────────────────────────

@app.post("/api/chat")
async def chat(message: ChatMessage):
    """Free-form chat with the AI assistant."""
    from services.gemini_service import generate_text

    system = """You are Mindful Life AI, a personal life integration assistant.
You help with: running training (3 half marathons + 1 marathon/year), 
reading goals (50 books/year), journaling (rooted in Thich Nhat Hanh 
and Stoic philosophy), travel planning, and weekly/monthly/quarterly life reviews.
Be warm, honest, and insightful. Keep responses concise."""

    response_text = generate_text(message.message, system_instruction=system)
    return ChatResponse(
        response=response_text,
        agent=message.agent or "general",
        suggestions=["Log a check-in", "Get journal prompt", "View weekly review"],
    )


# ─── Serve Frontend ─────────────────────────────────────────────────

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/manifest.json")
    async def serve_manifest():
        return FileResponse(os.path.join(frontend_dir, "manifest.json"))

    @app.get("/sw.js")
    async def serve_sw():
        return FileResponse(
            os.path.join(frontend_dir, "sw.js"),
            media_type="application/javascript",
        )

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dir, "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("APP_PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
