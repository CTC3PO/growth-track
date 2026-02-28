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
    WorkSession,
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

    insight = await generate_work_insights(sessions)
    return {"insight": insight}


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
            for key in ["title", "author", "genre", "status", "is_finished", "rating", "reaction", "cover_url", "pages", "date_started", "date_finished"]:
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
    return get_documents("books", limit=limit)


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

        recent_books = get_documents("books", limit=5)
        if recent_books:
            # find the latest book being read or finished
            book_title = recent_books[0].get("title")
            if book_title:
                context["books_reading"] = book_title

        recent_travel = get_documents("travel_expenses", limit=5)
        if recent_travel:
            # check if there's a recent trip expense
            for expense in recent_travel:
                trip_name = expense.get("trip")
                if trip_name:
                    context["is_traveling"] = True
                    context["city"] = trip_name
                    break

        import calendar
        context["day_of_week"] = calendar.day_name[date.today().weekday()]
    except Exception:
        pass

    prompt = generate_journal_prompt(tradition=tradition, context=context)
    return prompt


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
    doc_id = save_document("travel_expenses", data)
    return {
        "status": "saved",
        "id": doc_id,
        "amount_usd": data.get("amount_usd"),
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
            # Auto-convert to USD
            rate = EXCHANGE_RATES_TO_USD.get(e.get("currency", "USD").upper(), None)
            if rate and e.get("amount"):
                e["amount_usd"] = round(float(e["amount"]) * rate, 2)
            
            eid = e.pop("id", expense_id)
            save_document("travel_expenses", e, doc_id=eid)
            return {"status": "updated", "id": eid, "amount_usd": e.get("amount_usd")}
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
            for key in ["date", "name", "category", "context", "location", "notes", "follow_up"]:
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
