from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os

# Initialize Firebase Admin if not already initialized
if not firebase_admin._apps:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Assuming service account key might be stored securely or via env vars in prod
    # For local dev, a mock or actual path is needed. We'll use a placeholder or handle gracefully.
    try:
        cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT", "firebase-adminsdk-key.json"))
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Firebase Admin init warning: {e}. Auth will mock/fail without proper credentials.")
        # Minimal mock initialization for local testing if no key is present
        firebase_admin.initialize_app()

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Verify token with Firebase Admin
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        # Allow requests to pass through in dev mode if Firebase isn't strictly configured yet
        # but warn. In production, this should always raise 401.
        if os.getenv("APP_ENV") == "development":
            print(f"Auth warning (dev mode): {e}")
            return {"uid": "dev-user", "email": "dev@example.com"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
