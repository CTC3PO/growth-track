# Security Audit Walkthrough

## What was Accomplished
A comprehensive security review of the backend, frontend, and deployment configurations was performed. The following actions were taken to resolve identified issues:

### 1. CORS Restrictions (Cross-Origin Resource Sharing)
**Issue:** The FastAPI backend (`main.py`) had a wildcard CORS policy (`allow_origins=["*"]`), which allowed any website to make unauthorized requests to the API.
**Fix:** Introduced the `ALLOWED_ORIGINS` environment variable in `.env.template` (defaulting to localhost ports) and updated the `CORSMiddleware` in `main.py` to strictly limit cross-origin access.

### 2. Docker Container Security
**Issue:** The `/Dockerfile` ran the application process using the default `root` user. Running containers as root is a major security risk, as it grants unnecessary privileges if the application is compromised.
**Fix:** Created a new non-root user `appuser`, assigned proper ownership of the `/app` directory, and switched to using the `appuser` before exposing the port and running the application.

### 3. API Authentication
**Issue/Decision:** The API currently lacks authentication. During the audit, an `x-api-key` middleware was proposed to protect the `/api/*` endpoints. However, based on user feedback that this is a private project solely for personal use, this change was intentionally reverted to keep the application simple and overhead-free. No hardcoded or sensitive API keys were found exposed in the frontend source code.

## Validation Results
- The application's `backend/main.py` properly references the new `ALLOWED_ORIGINS` environment configuration.
- The `Dockerfile` structure correctly sets up an isolated user environment for production deployment.
- No accidental secrets were exposed during the audit.
