"""
db.py  —  SQLite schema bootstrap
Creates all tables if they do not yet exist.
Run this once before starting the Flask server.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'volopay.db')


def get_connection():
    """Return a thread-safe SQLite connection with row_factory."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA foreign_keys=ON;')
    return conn


def init_db():
    """Create tables (idempotent)."""
    conn = get_connection()
    c = conn.cursor()

    # ── Delivery batches ──────────────────────────────────────────────────────
    c.execute('''
        CREATE TABLE IF NOT EXISTS batches (
            batch_id    TEXT PRIMARY KEY,
            revision    INTEGER NOT NULL,
            exported_at TEXT,
            applied_at  TEXT NOT NULL
        )
    ''')

    # ── Raw source records ────────────────────────────────────────────────────
    c.execute('''
        CREATE TABLE IF NOT EXISTS records (
            key              TEXT PRIMARY KEY,   -- "{source_type}::{source_id}"
            source_type      TEXT NOT NULL,      -- "call" | "meeting"
            source_id        TEXT NOT NULL,
            record_ref       TEXT,
            revision         INTEGER NOT NULL DEFAULT 1,
            batch_id         TEXT,
            payload_json     TEXT NOT NULL,
            transcript_json  TEXT,
            suggested_route  TEXT,
            analysis_json    TEXT,
            created_at       TEXT NOT NULL,
            updated_at       TEXT NOT NULL
        )
    ''')

    # ── Manual route overrides ────────────────────────────────────────────────
    c.execute('''
        CREATE TABLE IF NOT EXISTS overrides (
            key          TEXT PRIMARY KEY,
            manual_route TEXT NOT NULL,
            note         TEXT,
            updated_at   TEXT NOT NULL
        )
    ''')

    # ── Review status per record ──────────────────────────────────────────────
    c.execute('''
        CREATE TABLE IF NOT EXISTS review_status (
            key         TEXT PRIMARY KEY,
            reviewed    INTEGER NOT NULL DEFAULT 0,  -- 0=pending 1=reviewed
            updated_at  TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()
    print(f'[db] Database initialised at: {DB_PATH}')


if __name__ == '__main__':
    init_db()
