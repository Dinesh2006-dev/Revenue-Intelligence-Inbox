"""
app.py  —  Flask REST API for SpendNest Revenue Intelligence Inbox
Endpoints:
  GET  /api/health                      → server status
  GET  /api/records                     → filtered list of records
  GET  /api/records/<key>               → single record detail
  PUT  /api/records/<key>/override      → set/update manual route override
  DELETE /api/records/<key>/override    → remove override
  PUT  /api/records/<key>/review        → mark reviewed / pending
  GET  /api/metrics                     → dashboard headline numbers
  GET  /api/export/json                 → manifest as JSON (download)
  GET  /api/export/csv                  → manifest as CSV (download)
  POST /api/import                      → ingest a new delivery JSON batch
  GET  /api/batches                     → list applied delivery batches
"""

import csv
import io
import json
import os
import sys
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, jsonify, request, Response, send_from_directory
from flask_cors import CORS

# Allow importing sibling modules from backend/
sys.path.insert(0, os.path.dirname(__file__))
from db import get_connection, init_db
import supabase_db

# ── App setup ─────────────────────────────────────────────────────────────────

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
PROJ_DIR    = os.path.dirname(BASE_DIR)
FRONTEND_DIR = os.path.join(PROJ_DIR, 'candidate', 'app')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app, resources={r'/api/*': {'origins': '*'}})


# ── Utility ───────────────────────────────────────────────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()


def row_to_dict(row):
    """sqlite3.Row or dict → plain dict with parsed JSON fields."""
    d = dict(row)
    for field in ('payload_json', 'transcript_json', 'analysis_json'):
        val = d.get(field)
        target = field.replace('_json', '')
        if val is not None:
            if isinstance(val, str):
                try:
                    d[target] = json.loads(val)
                except Exception:
                    d[target] = {}
            elif isinstance(val, dict):
                d[target] = val
            d.pop(field, None)
        else:
            d.pop(field, None)
    return d


def get_effective_route(record_dict, override_dict):
    """Return the route to display: manual override takes precedence."""
    if override_dict:
        return override_dict.get('manual_route') or record_dict.get('suggested_route', '')
    return record_dict.get('suggested_route', '')


# ── Unified Data Access (Supabase primary, SQLite fallback) ───────────────────

def is_supabase_active():
    return supabase_db.check_connection()


def get_data_backend():
    return 'supabase' if is_supabase_active() else 'sqlite'


def fetch_all_records():
    if is_supabase_active():
        return supabase_db.get_all_records()
    conn = get_connection()
    rows = conn.execute('SELECT * FROM records').fetchall()
    conn.close()
    return rows


def fetch_record_by_key(key):
    if is_supabase_active():
        return supabase_db.get_record(key)
    conn = get_connection()
    row = conn.execute('SELECT * FROM records WHERE key = ?', (key,)).fetchone()
    conn.close()
    return row


def fetch_all_overrides():
    if is_supabase_active():
        return supabase_db.get_all_overrides()
    conn = get_connection()
    rows = conn.execute('SELECT * FROM overrides').fetchall()
    conn.close()
    return {r['key']: dict(r) for r in rows}


def fetch_all_reviews():
    if is_supabase_active():
        return supabase_db.get_all_reviews()
    conn = get_connection()
    rows = conn.execute('SELECT * FROM review_status').fetchall()
    conn.close()
    return {r['key']: dict(r) for r in rows}


def persist_override(key, route, note):
    if is_supabase_active():
        return supabase_db.set_override(key, route, note)
    conn = get_connection()
    conn.execute('''
        INSERT OR REPLACE INTO overrides (key, manual_route, note, updated_at)
        VALUES (?, ?, ?, ?)
    ''', (key, route, note, now_iso()))
    conn.commit()
    conn.close()
    return True


def remove_override(key):
    if is_supabase_active():
        return supabase_db.delete_override(key)
    conn = get_connection()
    conn.execute('DELETE FROM overrides WHERE key = ?', (key,))
    conn.commit()
    conn.close()
    return True


def persist_review(key, reviewed):
    if is_supabase_active():
        return supabase_db.set_review(key, reviewed)
    conn = get_connection()
    conn.execute('''
        INSERT OR REPLACE INTO review_status (key, reviewed, updated_at)
        VALUES (?, ?, ?)
    ''', (key, int(reviewed), now_iso()))
    conn.commit()
    conn.close()
    return True


def fetch_all_batches():
    if is_supabase_active():
        return supabase_db.get_batches()
    conn = get_connection()
    rows = [dict(r) for r in conn.execute('SELECT * FROM batches ORDER BY revision').fetchall()]
    conn.close()
    return rows


# ── Health & Status ───────────────────────────────────────────────────────────

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'backend': get_data_backend(),
        'supabase_configured': supabase_db.is_configured(),
        'supabase_connected': is_supabase_active(),
        'time': now_iso()
    })


# ── Records ───────────────────────────────────────────────────────────────────

@app.route('/api/records')
def list_records():
    source = request.args.get('source_type', 'all')
    route  = request.args.get('route', 'all')
    has_tx = request.args.get('has_transcript', 'all')
    review = request.args.get('review', 'all')
    rep    = request.args.get('rep', 'all')
    search = request.args.get('q', '').strip().lower()
    sort   = request.args.get('sort', 'date:desc')

    rows      = fetch_all_records()
    overrides = fetch_all_overrides()
    reviews   = fetch_all_reviews()

    results = []
    for row in rows:
        rec = row_to_dict(row)
        key = rec['key']
        ov  = overrides.get(key)
        rv  = reviews.get(key)
        rec['active_route']      = get_effective_route(rec, ov)
        rec['is_overridden']     = bool(ov)
        rec['manual_override']   = ov
        rec['review']            = rv
        rec['is_reviewed']       = bool(rv and rv.get('reviewed'))

        # Has transcript
        payload = rec.get('payload') or {}
        tx_pay  = rec.get('transcript') or {}
        if rec['source_type'] == 'call':
            rec['has_transcript'] = bool((payload.get('transcript') or '').strip())
        else:
            rec['has_transcript'] = bool(tx_pay.get('turns'))

        # Filters
        if source != 'all' and rec['source_type'] != source:
            continue
        if route != 'all' and rec['active_route'] != route:
            continue
        if has_tx == 'yes' and not rec['has_transcript']:
            continue
        if has_tx == 'no' and rec['has_transcript']:
            continue
        if review == 'reviewed' and not rec['is_reviewed']:
            continue
        if review == 'pending' and rec['is_reviewed']:
            continue
        if review == 'overridden' and not rec['is_overridden']:
            continue

        # Rep/organizer filter
        p = rec.get('payload') or {}
        record_rep = p.get('rep_name') or p.get('organizer_email') or ''
        if rep != 'all' and rep.lower() not in record_rep.lower():
            continue

        # Full-text search
        if search:
            haystack = json.dumps(rec).lower()
            if search not in haystack:
                continue

        results.append(rec)

    # Sort
    field, direction = (sort.split(':') + ['asc'])[:2]
    reverse = (direction == 'desc')
    if field == 'date':
        def date_key(r):
            p = r.get('payload') or {}
            return p.get('started_at') or p.get('starts_at') or ''
        results.sort(key=date_key, reverse=reverse)
    elif field == 'ref':
        results.sort(key=lambda r: r.get('record_ref') or '', reverse=reverse)
    elif field == 'route':
        results.sort(key=lambda r: r.get('active_route') or '', reverse=reverse)

    return jsonify({'records': results, 'total': len(results)})


@app.route('/api/records/<path:key>')
def get_record(key):
    row = fetch_record_by_key(key)
    if not row:
        return jsonify({'error': 'Not found'}), 404
    rec = row_to_dict(row)
    overrides = fetch_all_overrides()
    reviews   = fetch_all_reviews()
    ov = overrides.get(key)
    rv = reviews.get(key)
    rec['manual_override'] = dict(ov) if ov else None
    rec['review']          = dict(rv) if rv else None
    rec['active_route']    = get_effective_route(rec, dict(ov) if ov else None)
    rec['is_overridden']   = bool(ov)
    rec['is_reviewed']     = bool(rv and rv.get('reviewed'))
    return jsonify(rec)


# ── Overrides ─────────────────────────────────────────────────────────────────

@app.route('/api/records/<path:key>/override', methods=['PUT'])
def set_override(key):
    body  = request.get_json(force=True) or {}
    route = body.get('manual_route', '').strip()
    note  = body.get('note', '').strip()
    if not route:
        return jsonify({'error': 'manual_route is required'}), 400

    row = fetch_record_by_key(key)
    if not row:
        return jsonify({'error': 'Record not found'}), 404

    persist_override(key, route, note)
    return jsonify({'success': True, 'key': key, 'manual_route': route})


@app.route('/api/records/<path:key>/override', methods=['DELETE'])
def delete_override(key):
    remove_override(key)
    return jsonify({'success': True})


# ── Review status ─────────────────────────────────────────────────────────────

@app.route('/api/records/<path:key>/review', methods=['PUT'])
def set_review(key):
    body     = request.get_json(force=True) or {}
    reviewed = bool(body.get('reviewed', True))
    persist_review(key, reviewed)
    return jsonify({'success': True, 'key': key, 'reviewed': reviewed})


# ── Metrics ───────────────────────────────────────────────────────────────────

@app.route('/api/metrics')
def metrics():
    import pandas as pd
    raw_rows  = fetch_all_records()
    overrides = fetch_all_overrides()

    if not raw_rows:
        return jsonify({'total': 0, 'calls': 0, 'meetings': 0,
                        'coverage': 0, 'connect_rate': 0,
                        'route_distribution': {}, 'rep_distribution': {}})

    rows = [row_to_dict(r) for r in raw_rows]
    df = pd.DataFrame(rows)

    total    = len(df)
    calls    = int((df['source_type'] == 'call').sum())
    meetings = int((df['source_type'] == 'meeting').sum())

    # Transcript coverage
    def has_tx(r):
        try:
            payload = r.get('payload') or {}
            if r['source_type'] == 'call':
                return bool((payload.get('transcript') or '').strip())
            tx = r.get('transcript') or {}
            return bool(tx.get('turns'))
        except Exception:
            return False

    df['has_tx'] = [has_tx(r) for r in rows]
    coverage = round(df['has_tx'].sum() / total * 100, 1) if total else 0

    # Connected-call rate
    call_rows = [r for r in rows if r['source_type'] == 'call']
    connected_count = 0
    non_null_count  = 0
    for r in call_rows:
        try:
            p = r.get('payload') or {}
            val = p.get('is_connected')
            if val is not None:
                non_null_count += 1
                if val is True:
                    connected_count += 1
        except Exception:
            pass
    connect_rate = round(connected_count / non_null_count * 100, 1) if non_null_count else 0

    # Route distribution (active route = override or suggested)
    route_dist: dict[str, int] = {}
    for r in rows:
        ov    = overrides.get(r['key'])
        route = (ov['manual_route'] if ov else None) or r.get('suggested_route', 'unknown')
        route_dist[route] = route_dist.get(route, 0) + 1

    # Rep distribution
    rep_dist: dict[str, int] = {}
    for r in rows:
        try:
            p   = r.get('payload') or {}
            rep = p.get('rep_name') or p.get('organizer_email') or 'Unknown'
        except Exception:
            rep = 'Unknown'
        rep_dist[rep] = rep_dist.get(rep, 0) + 1

    return jsonify({
        'total': total,
        'calls': calls,
        'meetings': meetings,
        'with_transcript': int(df['has_tx'].sum()),
        'coverage_pct': coverage,
        'connected_calls': connected_count,
        'non_null_calls': non_null_count,
        'connect_rate_pct': connect_rate,
        'route_distribution': route_dist,
        'rep_distribution': rep_dist,
    })


# ── Batches ───────────────────────────────────────────────────────────────────

@app.route('/api/batches')
def list_batches():
    return jsonify({'batches': fetch_all_batches()})


# ── Import ────────────────────────────────────────────────────────────────────

@app.route('/api/import', methods=['POST'])
def import_batch():
    """Accept a delivery JSON file upload and ingest it."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file supplied'}), 400
    f    = request.files['file']
    data = json.loads(f.read().decode('utf-8'))

    import sys
    sys.path.insert(0, BASE_DIR)
    from ingest import make_key, now_iso as _now

    revision  = int(data.get('revision', 9))
    batch_id  = data.get('batch_id', f'uploaded-{_now()}')
    records   = data.get('records', [])
    applied   = _now()

    conn = get_connection()
    conn.execute('''
        INSERT OR REPLACE INTO batches (batch_id, revision, exported_at, applied_at)
        VALUES (?, ?, ?, ?)
    ''', (batch_id, revision, data.get('exported_at', ''), applied))

    inserted = updated = skipped = 0
    for rec in records:
        src_type = rec.get('source_type', '')
        src_id   = rec.get('source_id', '')
        key      = make_key(src_type, src_id)
        payload_json    = json.dumps(rec.get('payload') or {})
        transcript_json = json.dumps(rec.get('transcript_payload') or {})
        existing = conn.execute('SELECT revision FROM records WHERE key = ?', (key,)).fetchone()
        if existing is None:
            conn.execute('''
                INSERT INTO records
                (key, source_type, source_id, record_ref, revision, batch_id,
                 payload_json, transcript_json, suggested_route, analysis_json,
                 created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ''', (key, src_type, src_id, rec.get('record_ref',''), revision,
                  batch_id, payload_json, transcript_json, '', '{}', applied, applied))
            inserted += 1
        elif revision > existing['revision']:
            conn.execute('''
                UPDATE records
                SET revision=?, batch_id=?, payload_json=?, transcript_json=?, updated_at=?
                WHERE key=?
            ''', (revision, batch_id, payload_json, transcript_json, applied, key))
            updated += 1
        else:
            skipped += 1

    conn.commit()
    conn.close()
    return jsonify({'success': True, 'batch_id': batch_id, 'revision': revision,
                    'inserted': inserted, 'updated': updated, 'skipped': skipped})


# ── Export ────────────────────────────────────────────────────────────────────

def _build_manifest_rows():
    raw_rows  = fetch_all_records()
    overrides = fetch_all_overrides()
    reviews   = fetch_all_reviews()

    manifest = []
    for r in raw_rows:
        row    = row_to_dict(r)
        key    = row['key']
        ov     = overrides.get(key)
        rv     = reviews.get(key)
        route  = (ov['manual_route'] if ov else None) or row.get('suggested_route', '')
        p      = row.get('payload') or {}
        manifest.append({
            'key':            key,
            'source_type':    row['source_type'],
            'record_ref':     row.get('record_ref', ''),
            'revision':       row['revision'],
            'batch_id':       row.get('batch_id', ''),
            'active_route':   route,
            'is_overridden':  bool(ov),
            'is_reviewed':    bool(rv and rv.get('reviewed')),
            'rep':            p.get('rep_name') or p.get('organizer_email') or '',
            'updated_at':     row.get('updated_at', ''),
        })
    return manifest


@app.route('/api/export/json')
def export_json():
    manifest = _build_manifest_rows()
    buf = json.dumps({'manifest': manifest, 'generated_at': now_iso()}, indent=2)
    return Response(
        buf,
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=manifest.json'}
    )


@app.route('/api/export/csv')
def export_csv():
    manifest = _build_manifest_rows()
    if not manifest:
        return Response('', mimetype='text/csv')
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(manifest[0].keys()))
    writer.writeheader()
    writer.writerows(manifest)
    return Response(
        buf.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=manifest.csv'}
    )


# ── Serve frontend (production mode) ─────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    full = os.path.join(FRONTEND_DIR, path)
    if path and os.path.exists(full):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, 'index.html')


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if not is_supabase_active():
        init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
