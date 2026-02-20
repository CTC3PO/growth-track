"""
Mindful Life AI — FastAPI Backend
POC focused on: Review Agent + Journaling Prompt Engine + Simple Trackers
"""

import os
import sys
from datetime import date, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Add backend dir to path for imports
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

from models.schemas import (
    DailyCheckIn, RunLog, BookEntry, JournalEntry,
    ChatMessage, ChatResponse, ReviewRequest,
)
from services.firestore_service import save_document, get_documents, get_documents_by_date_range
from agents.journaling_agent import generate_journal_prompt, generate_reflection_prompts_for_book
from agents.review_agent import generate_weekly_review, generate_monthly_review, generate_quarterly_review


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

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/api/checkins")
async def get_checkins(limit: int = 30):
    """Get recent check-ins."""
    return get_documents("checkins", limit=limit)


# ─── Running ─────────────────────────────────────────────────────────

@app.post("/api/runs")
async def log_run(run: RunLog):
    """Log a run."""
    doc_id = save_document("runs", run.model_dump())
    return {"status": "saved", "id": doc_id, "message": f"Run logged: {run.distance_km}km 🏃"}


@app.get("/api/runs")
async def get_runs(limit: int = 30):
    """Get recent runs."""
    return get_documents("runs", limit=limit)


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


@app.get("/api/books")
async def get_books(limit: int = 50):
    """Get book entries."""
    return get_documents("books", limit=limit)


@app.get("/api/books/stats")
async def get_reading_stats():
    """Get reading progress toward 50/year goal."""
    year_start = date(date.today().year, 1, 1).isoformat()
    year_end = date(date.today().year, 12, 31).isoformat()
    books = get_documents_by_date_range("books", year_start, year_end)
    finished = [b for b in books if b.get("is_finished")]

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


@app.get("/api/journal/prompt")
async def get_journal_prompt(tradition: str = "blended"):
    """Generate a context-aware journal prompt."""
    # Gather context from recent data
    context = {}
    try:
        recent_checkins = get_documents("checkins", limit=3)
        if recent_checkins:
            latest = recent_checkins[0]
            context["energy"] = latest.get("energy")
            context["alignment"] = latest.get("alignment")
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
            last_journal_date = recent_journals[0].get("date", "")
            if last_journal_date:
                try:
                    from datetime import datetime
                    last_date = datetime.fromisoformat(last_journal_date).date()
                    gap = (date.today() - last_date).days
                    if gap > 1:
                        context["journal_gap_days"] = gap
                except Exception:
                    pass

        import calendar
        context["day_of_week"] = calendar.day_name[date.today().weekday()]
    except Exception:
        pass

    prompt = generate_journal_prompt(tradition=tradition, context=context)
    return prompt


# ─── Reviews ─────────────────────────────────────────────────────────

@app.get("/api/review/weekly")
async def get_weekly_review(start_date: str = None):
    """Generate a weekly review. Defaults to current week."""
    if not start_date:
        today = date.today()
        start = today - timedelta(days=today.weekday())
        start_date = start.isoformat()
    end_date = (date.fromisoformat(start_date) + timedelta(days=6)).isoformat()

    return generate_weekly_review(start_date, end_date)


@app.get("/api/review/monthly")
async def get_monthly_review(year: int = None, month: int = None):
    """Generate a monthly review."""
    today = date.today()
    year = year or today.year
    month = month or today.month
    return generate_monthly_review(year, month)


@app.get("/api/review/quarterly")
async def get_quarterly_review(year: int = None, quarter: int = None):
    """Generate a quarterly review."""
    today = date.today()
    year = year or today.year
    quarter = quarter or ((today.month - 1) // 3 + 1)
    return generate_quarterly_review(year, quarter)


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

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dir, "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("APP_PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
