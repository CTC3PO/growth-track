# Security Audit & Fixes Implementation Plan

This plan addresses the security risks identified in the Mindful Life AI application backend, frontend, and cloud deployment configurations.

## Target Goals
Fix the following security vulnerabilities:
1. **Open CORS Policy**: The FastAPI backend currently allows any origin `["*"]` which exposes the API to Cross-Origin requests from malicious sites.
2. **Lack of Authentication**: All `/api/*` endpoints are completely public without any authentication, allowing anyone with the URL to read, write, or delete personal data (journals, runs, health stats).
3. **Container Security**: The Dockerfile runs the application as the default `root` user, which is a security anti-pattern. If a vulnerability is found in the app, the attacker gains root access inside the container.

## Proposed Changes

### Backend (Security & API)
- Modify `backend/main.py` to use a restricted CORS setup based on an `ALLOWED_ORIGINS` environment variable (falling back to common localhost ports for local dev).
- Implement a global API Key dependency in `backend/main.py`. This will check for an `x-api-key` request header matches the `APP_SECRET_KEY` environment variable. This protects all `/api/*` routes (except public ones like health checks or webhooks).
- Update `backend/.env.template` to include `ALLOWED_ORIGINS` and `APP_SECRET_KEY`.

### Frontend (Authentication Integration)
- Modify `frontend/app.js` to read `app_api_key` from `localStorage` and inject it as the `x-api-key` header in both `apiGet()` and `apiPost()` fetch wrappers.
- Update the mock "Login" function in `frontend/app.js` to actually prompt the user to input their secure `API Key`, saving it to `localStorage`, thereby unlocking the app instead of just mocking a login.

### Cloud / Container
- Update `Dockerfile` to create a dedicated non-root user (e.g., `appuser`) and switch to it before running the application, following container security best practices.

## Verification Plan

### Automated Tests
- N/A for these changes as this requires checking HTTP Headers and CORS responses.

### Manual Verification
1. Open the app locally on `http://localhost:8080`.
2. Attempt to view data or save a check-in without logging in (should fail or show 401 Unauthorized in Network tab).
3. "Login" with the correct API key (set in `.env` as `APP_SECRET_KEY`), and verify the app successfully loads and saves data.
4. Check the Docker build logs to verify the non-root user creation.
