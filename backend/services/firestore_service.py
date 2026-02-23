"""
Firestore Service — handles all database operations.
For the POC, falls back to in-memory storage if Firestore is not configured.
"""

import os
import json
from datetime import date, datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# In-memory fallback store for local development
_local_store: dict[str, list[dict]] = {}
_LOCAL_DATA_DIR = Path(__file__).parent.parent / "local_data"


def _get_firestore_client():
    """Try to get Firestore client, return None if not available."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT_ID")
        if not project_id:
            return None
        from google.cloud import firestore
        return firestore.Client(project=project_id)
    except Exception as e:
        print(f"🔥 Firestore Connection Error: {e}")
        return None


def _serialize_dates(data: dict) -> dict:
    """Convert date objects to ISO strings for JSON storage."""
    result = {}
    for k, v in data.items():
        if isinstance(v, (date, datetime)):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = _serialize_dates(v)
        elif isinstance(v, list):
            result[k] = [_serialize_dates(i) if isinstance(i, dict) else i for i in v]
        else:
            result[k] = v
    return result


def save_document(collection: str, data: dict, doc_id: str = None) -> str:
    """Save a document to Firestore or local JSON fallback."""
    data = _serialize_dates(data)
    data["created_at"] = datetime.now().isoformat()

    db = _get_firestore_client()
    if db:
        prefix = os.getenv("FIRESTORE_COLLECTION_PREFIX", "mindful_life")
        full_collection = f"{prefix}_{collection}"
        if doc_id:
            db.collection(full_collection).document(doc_id).set(data)
            return doc_id
        else:
            doc_ref = db.collection(full_collection).add(data)
            return doc_ref[1].id
    else:
        # Local JSON fallback
        _LOCAL_DATA_DIR.mkdir(exist_ok=True)
        file_path = _LOCAL_DATA_DIR / f"{collection}.json"
        if file_path.exists():
            existing = json.loads(file_path.read_text())
        else:
            existing = []

        if doc_id:
            data["id"] = doc_id
        else:
            doc_id = f"{collection}_{len(existing)+1}"
            data["id"] = doc_id

        # Update if exists, else append
        updated = False
        for i, doc in enumerate(existing):
            if doc.get("id") == doc_id:
                existing[i] = data
                updated = True
                break
        if not updated:
            existing.append(data)

        file_path.write_text(json.dumps(existing, indent=2, default=str))
        return doc_id


def get_documents(collection: str, limit: int = 100) -> list[dict]:
    """Get all documents from a collection."""
    db = _get_firestore_client()
    if db:
        prefix = os.getenv("FIRESTORE_COLLECTION_PREFIX", "mindful_life")
        full_collection = f"{prefix}_{collection}"
        docs = db.collection(full_collection).order_by(
            "created_at", direction="DESCENDING"
        ).limit(limit).get()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    else:
        file_path = _LOCAL_DATA_DIR / f"{collection}.json"
        if file_path.exists():
            data = json.loads(file_path.read_text())
            return sorted(data, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]
        return []


def get_documents_by_date_range(collection: str, start_date: str, end_date: str) -> list[dict]:
    """Get documents within a date range."""
    db = _get_firestore_client()
    if db:
        prefix = os.getenv("FIRESTORE_COLLECTION_PREFIX", "mindful_life")
        full_collection = f"{prefix}_{collection}"
        docs = (
            db.collection(full_collection)
            .where("date", ">=", start_date)
            .where("date", "<=", end_date)
            .order_by("date")
            .get()
        )
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    else:
        all_docs = get_documents(collection, limit=1000)
        return [
            d for d in all_docs
            if start_date <= d.get("date", "") <= end_date
        ]
