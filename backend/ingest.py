"""
ingest.py  —  Data ingestion pipeline (Pandas-based)
Reads the two delivery JSON files, merges them with revision precedence,
enriches with the pre-built analysis data, and persists everything to SQLite.

Usage:
    python ingest.py
"""

import json
import os
import sqlite3
from datetime import datetime, timezone

import pandas as pd

from db import get_connection, init_db

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJ_DIR   = os.path.dirname(BASE_DIR)               # Drive-Project/
DATA_DIR   = os.path.join(PROJ_DIR, 'candidate', 'data')
ANALYSIS_F = os.path.join(PROJ_DIR, 'candidate', 'app', 'data', 'analysis_data.json')

INITIAL_F  = os.path.join(DATA_DIR, '01_initial.json')
UPDATE_F   = os.path.join(DATA_DIR, '02_update.json')


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_key(source_type: str, source_id: str) -> str:
    return f'{source_type}::{source_id}'


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Load raw delivery files ────────────────────────────────────────────────────

def load_delivery(path: str) -> dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


# ── Main ingestion ─────────────────────────────────────────────────────────────

def ingest():
    init_db()
    conn = get_connection()

    # Load analysis enrichment
    analysis: dict = {}
    if os.path.exists(ANALYSIS_F):
        with open(ANALYSIS_F, 'r', encoding='utf-8') as f:
            analysis = json.load(f)

    deliveries = [
        (load_delivery(INITIAL_F), 1, 'batch-initial-001'),
        (load_delivery(UPDATE_F),  2, 'batch-update-002'),
    ]

    for delivery, revision, batch_id in deliveries:
        exported_at = delivery.get('exported_at') or delivery.get('batch_id', '')
        applied_at  = now_iso()

        # Upsert batch
        conn.execute('''
            INSERT OR REPLACE INTO batches (batch_id, revision, exported_at, applied_at)
            VALUES (?, ?, ?, ?)
        ''', (batch_id, revision, exported_at, applied_at))

        records = delivery.get('records', [])
        print(f'[ingest] Processing batch={batch_id}  revision={revision}  records={len(records)}')

        # Build a DataFrame for any Pandas-based enrichment
        df = pd.DataFrame(records)

        for rec in records:
            src_type = rec.get('source_type', '')
            src_id   = rec.get('source_id', '')
            ref      = rec.get('record_ref', '')
            key      = make_key(src_type, src_id)

            payload_json    = json.dumps(rec.get('payload') or {})
            transcript_json = json.dumps(rec.get('transcript_payload') or {})

            # Look up analysis by record_ref
            enrich     = analysis.get(ref, {})
            sug_route  = enrich.get('suggested_route', '')
            anal_json  = json.dumps(enrich)

            # Check existing revision in DB
            existing = conn.execute(
                'SELECT revision FROM records WHERE key = ?', (key,)
            ).fetchone()

            if existing is None:
                # Insert new
                conn.execute('''
                    INSERT INTO records
                    (key, source_type, source_id, record_ref, revision, batch_id,
                     payload_json, transcript_json, suggested_route, analysis_json,
                     created_at, updated_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                ''', (key, src_type, src_id, ref, revision, batch_id,
                      payload_json, transcript_json, sug_route, anal_json,
                      applied_at, applied_at))
            elif revision > existing['revision']:
                # Newer revision replaces source payload and transcript
                conn.execute('''
                    UPDATE records
                    SET revision=?, batch_id=?, payload_json=?, transcript_json=?,
                        suggested_route=?, analysis_json=?, updated_at=?
                    WHERE key=?
                ''', (revision, batch_id, payload_json, transcript_json,
                      sug_route, anal_json, applied_at, key))
            else:
                # Older or same revision — skip (idempotent)
                pass

    conn.commit()

    # ── Summary via Pandas ──────────────────────────────────────────────────
    all_rows = conn.execute('SELECT * FROM records').fetchall()
    df_all   = pd.DataFrame([dict(r) for r in all_rows])
    print(f'\n[ingest] Total records in DB: {len(df_all)}')
    print(df_all[['key','source_type','record_ref','revision','suggested_route']].to_string(index=False))

    conn.close()
    print('\n[ingest] Done.')


if __name__ == '__main__':
    ingest()
