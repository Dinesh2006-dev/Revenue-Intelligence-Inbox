-- Supabase Schema for SpendNest Revenue Intelligence Inbox
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run

-- 1. Batches table
CREATE TABLE IF NOT EXISTS public.batches (
    batch_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL,
    exported_at TEXT,
    applied_at TEXT NOT NULL
);

-- 2. Records table
CREATE TABLE IF NOT EXISTS public.records (
    key TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    record_ref TEXT,
    revision INTEGER NOT NULL DEFAULT 1,
    batch_id TEXT,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    transcript_json JSONB DEFAULT '{}'::jsonb,
    suggested_route TEXT,
    analysis_json JSONB DEFAULT '{}'::jsonb,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3. Overrides table
CREATE TABLE IF NOT EXISTS public.overrides (
    key TEXT PRIMARY KEY,
    manual_route TEXT NOT NULL,
    note TEXT,
    updated_at TEXT NOT NULL
);

-- 4. Review status table
CREATE TABLE IF NOT EXISTS public.review_status (
    key TEXT PRIMARY KEY,
    reviewed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);

-- Disable Row Level Security (RLS) so our Flask API & scripts can read/write directly
ALTER TABLE public.batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_status DISABLE ROW LEVEL SECURITY;
