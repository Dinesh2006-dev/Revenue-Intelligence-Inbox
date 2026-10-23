# SpendNest Revenue Intelligence Inbox

A modern full-stack revenue intelligence application for sales and finance leadership. Ingests raw multi-channel call and meeting records, applies automated routing, supports human-in-the-loop overrides, and persists data live to **Supabase (PostgreSQL)**.

---

## Architecture

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript (SPA) | Fast, dependency-free dashboard with real-time filtering, search, and routing workflows |
| **Backend** | Python + Flask + Flask-CORS | REST API serving records, metrics, exports, and live overrides |
| **Database** | Supabase (PostgreSQL) | Managed cloud database storing batches, records, manual overrides, and review statuses |
| **Data Ingestion** | Python standard library (`urllib.request`) | Deterministic ingestion engine with revision precedence and routing enrichments |
| **Deployment** | Render / Gunicorn / Procfile | Production-ready WSGI configuration |

---

## Features

- **Executive Overview Dashboard**: Real-time interaction telemetry, transcript coverage rate (40.9%), connected call rate (36.7%), and route distributions.
- **Unified Interaction Inbox**: Browse calls and meeting records with rich full-text search, speaker turns, and audio playback metadata.
- **Live Supabase Sync**: Manual route overrides and review toggles persist directly to your Supabase PostgreSQL cloud database.
- **Data Replay & Integrity Lab**: Built-in testbed to verify deduplication, revision ordering, and manual override preservation.
- **Export & Manifest**: Generates structured manifest archives in JSON and CSV formats.

---

## Local Development

### Prerequisites
- Python 3.10+
- Modern web browser

### Option 1: Quick Launch (PowerShell)
```powershell
.\run.ps1
```
*(or run `.\start_server.bat`)*

### Option 2: Manual Start
```powershell
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Sync dataset with Supabase (optional if already populated)
python backend/ingest_supabase.py

# 3. Start the Flask server
python backend/app.py
```

Then open your browser at: **[http://localhost:5000](http://localhost:5000)**

---

## Supabase Schema

The database schema is defined in [`backend/schema.sql`](backend/schema.sql):
- `batches`: Delivery batch tracking and applied timestamps
- `records`: Source records with JSONB payload, transcript, and routing analysis
- `overrides`: Human-in-the-loop manual routing overrides
- `review_status`: Review checklist status per record

---

## Cloud Deployment (Render)

1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), create a new **Web Service** connected to your repository.
3. Configure the service:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2`
4. Add Environment Variables:
   - `SUPABASE_URL`: `https://glifcwncfpumctskkhli.supabase.co`
   - `SUPABASE_KEY`: `<your-supabase-service-role-key>`

---

## License
MIT
