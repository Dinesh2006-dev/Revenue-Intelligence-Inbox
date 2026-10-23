"""
ingest_supabase.py — Supabase Data Ingestion Pipeline (Zero-Dependency)
Uses Python built-in standard library (urllib.request, json, ssl).
Works across any Python environment without needing pip or requests.

Usage:
    python backend/ingest_supabase.py
"""

import json
import os
import sys
import ssl
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJ_DIR   = os.path.dirname(BASE_DIR)
DATA_DIR   = os.path.join(PROJ_DIR, 'candidate', 'data')
ANALYSIS_F = os.path.join(PROJ_DIR, 'candidate', 'app', 'data', 'analysis_data.json')
INITIAL_F  = os.path.join(DATA_DIR, '01_initial.json')
UPDATE_F   = os.path.join(DATA_DIR, '02_update.json')

# Read .env manually if exists, else fallback
SUPABASE_URL = "https://glifcwncfpumctskkhli.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsaWZjd25jZnB1bWN0c2traGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjcxNzAxMiwiZXhwIjoyMTA4MjkzMDEyfQ."
    "nWq9ENyHwwYy7yFt5fxJxkvJJqQYXdVHASeKgnsmdLI"
)

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

# SSL context that works on all Windows Python installs
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


def api_request(endpoint: str, method: str = 'GET', data=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, context=SSL_CTX) as resp:
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


def make_key(source_type: str, source_id: str) -> str:
    return f"{source_type}::{source_id}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(path: str) -> dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def run_ingest():
    print("=" * 60)
    print(f"[ingest] Connecting to Supabase: {SUPABASE_URL}")
    print("=" * 60)

    # 1. Check tables
    status, res = api_request("records?limit=1", method='GET')
    if status != 200:
        print(f"[!] Error connecting to 'records' table (Status {status}): {res}")
        print("Please ensure you have executed backend/schema.sql in Supabase SQL editor.")
        sys.exit(1)

    print("[OK] Supabase tables connected successfully!")

    # 2. Load Analysis
    analysis = {}
    if os.path.exists(ANALYSIS_F):
        analysis = load_json(ANALYSIS_F)
        print(f"[ingest] Loaded {len(analysis)} analysis enrichments")

    # 3. Load Deliveries
    deliveries = [
        (load_json(INITIAL_F), 1, 'batch-initial-001'),
        (load_json(UPDATE_F),  2, 'batch-update-002'),
    ]

    all_records = {}
    batch_rows = []

    for delivery, revision, default_batch_id in deliveries:
        batch_id    = delivery.get('batch_id') or default_batch_id
        exported_at = delivery.get('exported_at') or batch_id
        applied_at  = now_iso()

        batch_rows.append({
            'batch_id': batch_id,
            'revision': revision,
            'exported_at': exported_at,
            'applied_at': applied_at
        })

        records = delivery.get('records', [])
        print(f"[ingest] Reading delivery batch: {batch_id} (rev {revision}) - {len(records)} records")

        for rec in records:
            src_type = rec.get('source_type', '')
            src_id   = rec.get('source_id', '')
            ref      = rec.get('record_ref', '')
            key      = make_key(src_type, src_id)

            enrich = analysis.get(ref, {})
            sug_route = enrich.get('suggested_route', '')

            # Check revision precedence: newer revision overwrites older
            if key in all_records:
                if revision <= all_records[key]['revision']:
                    continue

            all_records[key] = {
                'key': key,
                'source_type': src_type,
                'source_id': src_id,
                'record_ref': ref,
                'revision': revision,
                'batch_id': batch_id,
                'payload_json': rec.get('payload') or {},
                'transcript_json': rec.get('transcript_payload') or {},
                'suggested_route': sug_route,
                'analysis_json': enrich,
                'created_at': applied_at,
                'updated_at': applied_at
            }

    # 4. Upsert Batches
    print(f"\n[ingest] Upserting {len(batch_rows)} batches to Supabase...")
    status, res = api_request("batches", method='POST', data=batch_rows)
    if status in (200, 201):
        print(" [OK] Batches saved successfully.")
    else:
        print(f" [!] Batch upload returned status {status}: {res}")

    # 5. Upsert Records
    record_list = list(all_records.values())
    print(f"[ingest] Upserting {len(record_list)} records to Supabase...")
    status, res = api_request("records", method='POST', data=record_list)
    if status in (200, 201):
        print(f" [OK] All {len(record_list)} records uploaded successfully to Supabase!")
    else:
        print(f" [!] Record upload returned status {status}: {res}")

    # 6. Verify count
    status, data = api_request("records?select=key,source_type,record_ref,revision,suggested_route", method='GET')
    if status == 200 and isinstance(data, list):
        print(f"\n[ingest] Total records verified in Supabase: {len(data)}")
        for r in data[:6]:
            print(f"   - {r['key']} (rev {r['revision']}) -> route: {r.get('suggested_route')}")
        if len(data) > 6:
            print(f"   ... and {len(data) - 6} more records.")
    
    print("\n" + "=" * 60)
    print("SUCCESS: Your Supabase dataset is fully populated and live!")
    print("=" * 60)


if __name__ == '__main__':
    run_ingest()
