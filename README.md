# Mindful Life AI

A personal life integration AI assistant deployed on Google Cloud Platform.

## Features (POC)
- **Daily Check-in Tracker** — Log sleep, steps, meditation, energy, alignment
- **Running Log** — Track runs with distance, pace, feel, and notes
- **Book Tracker** — Log books with reading progress toward 50/year goal
- **Journaling Prompt Engine** — AI-powered prompts from Thich Nhat Hanh and Stoicism
- **Review Agent** — Weekly, monthly, and quarterly life reviews with AI insights

## Tech Stack
- **Backend:** Python + FastAPI
- **AI:** Google Gemini 2.5 Pro (via Google AI Studio)
- **Database:** Google Cloud Firestore (local JSON fallback for dev)
- **Deployment:** Google Cloud Run
- **IaC:** Terraform
- **CI/CD:** GitHub Actions

## Local Development

```bash
cd backend
cp .env.template .env
# Edit .env with your API keys

pip install -r requirements.txt
python main.py
```

Open http://localhost:8080

## GCP Deployment

```bash
# Build and deploy to Cloud Run
gcloud run deploy mindful-life-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/checkin` | Log daily check-in |
| POST | `/api/runs` | Log a run |
| POST | `/api/books` | Log a book |
| POST | `/api/journal` | Save journal entry |
| GET | `/api/journal/prompt` | Get AI journal prompt |
| GET | `/api/review/weekly` | Weekly review |
| GET | `/api/review/monthly` | Monthly review |
| GET | `/api/review/quarterly` | Quarterly review |
| POST | `/api/chat` | Chat with AI assistant |
