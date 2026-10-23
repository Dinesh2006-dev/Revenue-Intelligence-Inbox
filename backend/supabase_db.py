"""
supabase_db.py — Supabase PostgREST client adapter (Zero-Dependency)
Uses Python built-in urllib.request and ssl context.
Works across any Python environment without requiring external packages.
"""

import os
import json
import ssl
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SUPABASE_URL = "https://glifcwncfpumctskkhli.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsaWZjd25jZnB1bWN0c2traGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjcxNzAxMiwiZXhwIjoyMTA4MjkzMDEyfQ."
    "nWq9ENyHwwYy7yFt5fxJxkvJJqQYXdVHASeKgnsmdLI"
)

# Read .env if present
env_path = os.path.join(BASE_DIR, '.env')
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k == 'SUPABASE_URL':
                    SUPABASE_URL = v.rstrip('/')
                elif k == 'SUPABASE_KEY':
                    SUPABASE_KEY = v

SSL_CTX = ssl.create_default_context()
try:
    SSL_CTX.check_hostname = False
    SSL_CTX.verify_mode = ssl.CERT_NONE
except Exception:
    pass

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY)


def _request(path: str, method: str = 'GET', data=None, timeout: int = 5):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8') if e.fp else ''
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 500, str(e)


def check_connection() -> bool:
    """Test if Supabase tables exist and are reachable."""
    if not is_configured():
        return False
    try:
        status, res = _request("records?limit=1", method='GET', timeout=4)
        return status == 200
    except Exception:
        return False


def get_all_records():
    status, data = _request("records?select=*", method='GET', timeout=8)
    return data if status == 200 and isinstance(data, list) else []


def get_record(key: str):
    import urllib.parse
    encoded_key = urllib.parse.quote(key)
    status, data = _request(f"records?key=eq.{encoded_key}&select=*", method='GET', timeout=5)
    if status == 200 and isinstance(data, list) and data:
        return data[0]
    return None


def get_all_overrides():
    status, data = _request("overrides?select=*", method='GET', timeout=5)
    if status == 200 and isinstance(data, list):
        return {item['key']: item for item in data}
    return {}


def get_all_reviews():
    status, data = _request("review_status?select=*", method='GET', timeout=5)
    if status == 200 and isinstance(data, list):
        return {item['key']: item for item in data}
    return {}


def set_override(key: str, manual_route: str, note: str = ""):
    payload = {
        'key': key,
        'manual_route': manual_route,
        'note': note,
        'updated_at': now_iso()
    }
    status, _ = _request("overrides", method='POST', data=payload, timeout=5)
    return status in (200, 201)


def delete_override(key: str):
    import urllib.parse
    encoded_key = urllib.parse.quote(key)
    status, _ = _request(f"overrides?key=eq.{encoded_key}", method='DELETE', timeout=5)
    return status in (200, 204)


def set_review(key: str, reviewed: bool):
    payload = {
        'key': key,
        'reviewed': 1 if reviewed else 0,
        'updated_at': now_iso()
    }
    status, _ = _request("review_status", method='POST', data=payload, timeout=5)
    return status in (200, 201)


def get_batches():
    status, data = _request("batches?order=revision.asc", method='GET', timeout=5)
    return data if status == 200 and isinstance(data, list) else []
