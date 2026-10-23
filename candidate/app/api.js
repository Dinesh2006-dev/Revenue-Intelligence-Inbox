/**
 * api.js — Thin wrapper that calls the Flask backend REST API.
 * Falls back gracefully to the bundled dataset.js when the API is unreachable.
 */

const API = (() => {
  'use strict';

  const BASE = window.location.origin; // Same origin when served by Flask

  async function _fetch(path, opts = {}) {
    const res = await fetch(`${BASE}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  return {
    // ── Health ───────────────────────────────────────────────────────────────
    health: () => _fetch('/health'),

    // ── Records ──────────────────────────────────────────────────────────────
    listRecords: (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'all'))
      ).toString();
      return _fetch(`/records${qs ? '?' + qs : ''}`);
    },

    getRecord: (key) => _fetch(`/records/${encodeURIComponent(key)}`),

    // ── Overrides ─────────────────────────────────────────────────────────────
    setOverride: (key, manual_route, note = '') =>
      _fetch(`/records/${encodeURIComponent(key)}/override`, {
        method: 'PUT',
        body: JSON.stringify({ manual_route, note }),
      }),

    deleteOverride: (key) =>
      _fetch(`/records/${encodeURIComponent(key)}/override`, { method: 'DELETE' }),

    // ── Review ────────────────────────────────────────────────────────────────
    setReview: (key, reviewed = true) =>
      _fetch(`/records/${encodeURIComponent(key)}/review`, {
        method: 'PUT',
        body: JSON.stringify({ reviewed }),
      }),

    // ── Metrics ───────────────────────────────────────────────────────────────
    getMetrics: () => _fetch('/metrics'),

    // ── Batches ───────────────────────────────────────────────────────────────
    getBatches: () => _fetch('/batches'),

    // ── Import ────────────────────────────────────────────────────────────────
    importBatch: (file) => {
      const form = new FormData();
      form.append('file', file);
      return fetch(`${BASE}/api/import`, { method: 'POST', body: form }).then((r) => r.json());
    },

    // ── Export ────────────────────────────────────────────────────────────────
    downloadJson: () => {
      window.open(`${BASE}/api/export/json`, '_blank');
    },
    downloadCsv: () => {
      window.open(`${BASE}/api/export/csv`, '_blank');
    },
  };
})();
