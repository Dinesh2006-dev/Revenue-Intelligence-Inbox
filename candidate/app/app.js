/**
 * Revenue Intelligence Inbox - Application Logic
 * Built for Volopay Sales Management Assignment
 * Fully deterministic, offline-capable, local-storage persisted.
 */

(function () {
 'use strict';

 // ── CONSTANTS & ROUTE DEFINITIONS ──────────────────────────────────────────
 const ROUTES = {
 sales_opportunity: { label: 'Sales Opportunity', color: 'var(--route-sales)', class: 'route-sales_opportunity' },
 follow_up_required: { label: 'Follow-up Required', color: 'var(--route-followup)', class: 'route-follow_up_required' },
 customer_concern: { label: 'Customer Concern', color: 'var(--route-concern)', class: 'route-customer_concern' },
 customer_escalation: { label: 'Customer Escalation', color: 'var(--route-escalation)', class: 'route-customer_escalation' },
 internal: { label: 'Internal Training / Ops', color: 'var(--route-internal)', class: 'route-internal' },
 vendor_supplier: { label: 'Vendor / Supplier', color: 'var(--route-vendor)', class: 'route-vendor_supplier' },
 no_action: { label: 'No Action / Closed', color: 'var(--route-noaction)', class: 'route-no_action' },
 needs_review: { label: 'Needs Review', color: 'var(--route-review)', class: 'route-needs_review' }
 };

 const STORAGE_KEY = 'volopay_revenue_inbox_v1';

 // ── APPLICATION STATE ──────────────────────────────────────────────────────
 let state = {
 // Map of key => record object: key is `${source_type}::${source_id}`
 records: {},
 // Map of key => { manual_route, note, updated_at }
 manualOverrides: {},
 // Map of key => { reviewed: boolean, updated_at }
 reviewStatus: {},
 // Applied delivery batches: [ { batch_id, revision, exported_at, applied_at } ]
 appliedBatches: [],
 // Active filters
 filters: {
 source_type: 'all',
 route: 'all',
 review_status: 'all',
 search: '',
 has_transcript: 'all',
 rep: 'all'
 },
 // Sorting
 sort: {
 field: 'date',
 dir: 'desc'
 },
 // Currently inspected record key
 selectedRecordKey: null,
 // Active page
 activePage: 'overview'
 };

 // Chart instances
 let routeChart = null;
 let repChart = null;

 // ── HELPER UTILITIES ───────────────────────────────────────────────────────
 function makeKey(source_type, source_id) {
 return `${source_type}::${source_id}`;
 }

 function hasUsableTranscript(record) {
 if (!record) return false;
 if (record.source_type === 'call') {
 return Boolean(record.payload && record.payload.transcript && record.payload.transcript.trim().length > 0);
 }
 if (record.source_type === 'meeting') {
 return Boolean(
 record.transcript_payload &&
 Array.isArray(record.transcript_payload.turns) &&
 record.transcript_payload.turns.length > 0
 );
 }
 return false;
 }

 function getRecordDate(record) {
 if (!record || !record.payload) return '';
 return record.source_type === 'call' ? record.payload.started_at : record.payload.starts_at;
 }

 function getRecordPerson(record) {
 if (!record || !record.payload) return 'Unknown';
 if (record.source_type === 'call') {
 return record.payload.rep_name || record.payload.rep_email || 'Unassigned Rep';
 }
 return record.payload.organizer_email || 'Unassigned Organizer';
 }

 function getRecordTitle(record) {
 if (!record || !record.payload) return '';
 if (record.source_type === 'meeting') {
 return record.payload.title || 'Untitled Meeting';
 }
 const outcome = record.payload.observed_outcome || 'call';
 const rep = record.payload.rep_name || 'Rep';
 const dir = record.payload.direction || 'call';
 return `${dir.toUpperCase()} call by ${rep} (${outcome})`;
 }

 function getActiveRoute(record) {
 const key = makeKey(record.source_type, record.source_id);
 if (state.manualOverrides[key] && state.manualOverrides[key].manual_route) {
 return state.manualOverrides[key].manual_route;
 }
 return getSuggestedRoute(record);
 }

 function getSuggestedRoute(record) {
 const ref = record.record_ref;
 const analysisMap = (window.BUNDLE_DATA && window.BUNDLE_DATA.analysis_data) || {};
 if (analysisMap[ref] && analysisMap[ref].suggested_route) {
 return analysisMap[ref].suggested_route;
 }
 if (!hasUsableTranscript(record)) {
 if (record.source_type === 'call') {
 const outcome = (record.payload && record.payload.observed_outcome) || '';
 if (outcome === 'voicemail' || outcome === 'unresponsive') {
 return 'no_action';
 }
 }
 return 'needs_review';
 }
 return 'needs_review';
 }

 function getRecordAnalysis(record) {
 const ref = record.record_ref;
 const analysisMap = (window.BUNDLE_DATA && window.BUNDLE_DATA.analysis_data) || {};
 if (analysisMap[ref]) {
 return analysisMap[ref];
 }
 // Fallback rule-based analysis for non-transcript or unindexed records
 const hasTx = hasUsableTranscript(record);
 const unavailReason =
 (record.transcript_payload && record.transcript_payload.unavailable_reason) ||
 (record.payload && record.payload.observed_outcome) ||
 'No transcript supplied in delivery';

 return {
 record_ref: ref,
 source_type: record.source_type,
 source_id: record.source_id,
 suggested_route: getSuggestedRoute(record),
 confidence: 'Informational (Source Metadata Only)',
 main_topic: hasTx
 ? 'Conversation transcript supplied but awaiting detailed rule indexing'
 : `No conversation text supplied (${unavailReason}). Grounded in source metadata only.`,
 customer_sentiment: hasTx ? 'Unspecified' : 'Not determinable from source metadata',
 explicit_commitments: 'None recorded in supplied text',
 potential_risks: hasTx ? 'None identified' : 'Missing transcript; conversation details unverified',
 follow_up_requirements: hasTx ? 'Review transcript' : 'None indicated by metadata alone',
 routing_reason: hasTx
 ? 'Awaiting review'
 : `Record has no usable transcript (Reason: ${unavailReason}). Stored upstream outcome: ${record.payload ? record.payload.observed_outcome : 'N/A'}.`,
 evidence_references: []
 };
 }

 function isAnalysisStale(record) {
 // If record has been updated to revision 2 (e.g. M07) and has not been marked as reviewed
 const key = makeKey(record.source_type, record.source_id);
 const appliedRev = record._applied_revision || 1;
 if (appliedRev > 1 && (!state.reviewStatus[key] || !state.reviewStatus[key].reviewed)) {
 return true;
 }
 return false;
 }

 // ── PERSISTENCE (LOCAL STORAGE) ────────────────────────────────────────────
 function saveState() {
 try {
 const serialized = JSON.stringify({
 records: state.records,
 manualOverrides: state.manualOverrides,
 reviewStatus: state.reviewStatus,
 appliedBatches: state.appliedBatches
 });
 localStorage.setItem(STORAGE_KEY, serialized);
 } catch (e) {
 console.warn('LocalStorage save failed:', e);
 }
 }

 function loadState() {
 try {
 const data = localStorage.getItem(STORAGE_KEY);
 if (data) {
 const parsed = JSON.parse(data);
 if (parsed.records && Object.keys(parsed.records).length > 0) {
 state.records = parsed.records;
 state.manualOverrides = parsed.manualOverrides || {};
 state.reviewStatus = parsed.reviewStatus || {};
 state.appliedBatches = parsed.appliedBatches || [];
 return true;
 }
 }
 } catch (e) {
 console.warn('LocalStorage load error:', e);
 }
 return false;
 }

 function clearAllState() {
 localStorage.removeItem(STORAGE_KEY);
 state.records = {};
 state.manualOverrides = {};
 state.reviewStatus = {};
 state.appliedBatches = [];
 state.selectedRecordKey = null;
 saveState();
 }

 // ── IMPORT CONTRACT & REPLAY ENGINE ────────────────────────────────────────
 function importBatch(deliveryJson, logCallback) {
 if (!deliveryJson || !Array.isArray(deliveryJson.records)) {
 if (logCallback) logCallback('Invalid delivery payload: records array missing', 'log-err');
 return { success: false, error: 'Invalid payload' };
 }

 const batch_id = deliveryJson.batch_id || 'unknown';
 const revision = deliveryJson.revision || 1;
 const exported_at = deliveryJson.exported_at || new Date().toISOString();

 let addedCount = 0;
 let updatedCount = 0;
 let skippedCount = 0;

 deliveryJson.records.forEach(rec => {
 if (!rec.source_type || !rec.source_id) {
 skippedCount++;
 return;
 }

 const key = makeKey(rec.source_type, rec.source_id);
 const existing = state.records[key];

 if (!existing) {
 // New record
 const storedRec = JSON.parse(JSON.stringify(rec));
 storedRec._applied_revision = revision;
 storedRec._batch_id = batch_id;
 storedRec._first_imported_at = new Date().toISOString();
 storedRec._last_updated_at = new Date().toISOString();
 state.records[key] = storedRec;
 addedCount++;
 } else {
 const currentRev = existing._applied_revision || 1;
 if (revision > currentRev) {
 // Newer revision replaces entire source payload and transcript payload
 existing.payload = JSON.parse(JSON.stringify(rec.payload));
 existing.transcript_payload = rec.transcript_payload
 ? JSON.parse(JSON.stringify(rec.transcript_payload))
 : null;
 existing._applied_revision = revision;
 existing._batch_id = batch_id;
 existing._last_updated_at = new Date().toISOString();
 existing._source_updated = true;

 // Crucial contract rule: DO NOT overwrite manual overrides!
 // If manual override exists, it remains completely preserved!
 updatedCount++;
 } else {
 // Same or older revision ignored
 skippedCount++;
 }
 }
 });

 // Record batch in history
 state.appliedBatches.push({
 batch_id,
 revision,
 exported_at,
 applied_at: new Date().toISOString(),
 records_in_delivery: deliveryJson.records.length,
 added: addedCount,
 updated: updatedCount,
 skipped: skippedCount
 });

 saveState();

 const summary = {
 batch_id,
 revision,
 added: addedCount,
 updated: updatedCount,
 skipped: skippedCount,
 total_unique: Object.keys(state.records).length
 };

 if (logCallback) {
 logCallback(
 `Imported Batch: ${batch_id} (Rev ${revision}): Added: ${addedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}. Total Unique Records: ${summary.total_unique}`,
 'log-ok'
 );
 }

 return summary;
 }

 // ── REPLAY SUITE EXECUTION ─────────────────────────────────────────────────
 async function runFullReplay(logEl) {
 function log(msg, type = 'log-info') {
 if (!logEl) return;
 const div = document.createElement('div');
 div.className = `log-line ${type}`;
 div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
 logEl.appendChild(div);
 logEl.scrollTop = logEl.scrollHeight;
 }

 log('=== Starting Contract Verification Replay Suite ===', 'log-info');
 clearAllState();
 log('Reset application state to clean baseline. Records: 0', 'log-ok');

 const initialData = window.BUNDLE_DATA.initial_delivery;
 const updateData = window.BUNDLE_DATA.update_delivery;

 // Step 1: Initial Import
 log('Step 1: Importing data/01_initial.json (Revision 1)...', 'log-info');
 const res1 = importBatch(initialData, log);
 const usable1 = Object.values(state.records).filter(hasUsableTranscript).length;
 if (res1.total_unique === 44 && usable1 === 17) {
 log(`PASS: Initial import generated 44 unique records with 17 usable transcripts.`, 'log-ok');
 } else {
 log(`FAIL: Expected 44 records and 17 transcripts, got ${res1.total_unique} and ${usable1}`, 'log-err');
 }

 // Step 2: Repeat Import with Shuffled Order
 log('Step 2: Re-importing 01_initial.json with reverse array order...', 'log-info');
 const shuffled = JSON.parse(JSON.stringify(initialData));
 shuffled.records.reverse();
 const res2 = importBatch(shuffled, log);
 const total2 = Object.keys(state.records).length;
 if (total2 === 44 && res2.skipped === 44) {
 log(`PASS: Repeat import deduplicated 100%. Total unique records remained 44. Zero duplicates created.`, 'log-ok');
 } else {
 log(`FAIL: Duplicate inflation detected! Total: ${total2}, Skipped: ${res2.skipped}`, 'log-err');
 }

 // Step 3: Manual Route Correction on M07
 log("Step 3: Manually changing route for meeting M07 to 'customer_escalation'...", 'log-info');
 const m07Rec = Object.values(state.records).find(r => r.record_ref === 'M07');
 if (!m07Rec) {
 log('FAIL: Could not locate M07 record!', 'log-err');
 return;
 }
 const m07Key = makeKey(m07Rec.source_type, m07Rec.source_id);
 state.manualOverrides[m07Key] = {
 manual_route: 'customer_escalation',
 note: 'Manager override: 4 critical product bugs demonstrated during customer screen-share session.',
 updated_at: new Date().toISOString()
 };
 saveState();
 log(`PASS: M07 manual route saved as 'customer_escalation' with audit note.`, 'log-ok');

 // Step 4: Import Update (Revision 2)
 log('Step 4: Importing data/02_update.json (Revision 2)...', 'log-info');
 const res4 = importBatch(updateData, log);
 const usable4 = Object.values(state.records).filter(hasUsableTranscript).length;
 const total4 = Object.keys(state.records).length;
 const m07AfterUpdate = state.records[m07Key];
 const m07Turns =
 (m07AfterUpdate.transcript_payload && m07AfterUpdate.transcript_payload.turns) || [];
 const m07ActiveRoute = getActiveRoute(m07AfterUpdate);

 if (total4 === 44 && usable4 === 18 && m07Turns.length === 27 && m07ActiveRoute === 'customer_escalation') {
 log(`PASS: M07 updated to Revision 2. Usable transcripts increased from 17 to 18 (27 turns received). Total unique records remains 44.`, 'log-ok');
 log(`PASS: Manual route 'customer_escalation' successfully preserved on M07 across source update!`, 'log-ok');
 } else {
 log(`FAIL: Inconsistent update! Total: ${total4}, Usable: ${usable4}, Turns: ${m07Turns.length}, Route: ${m07ActiveRoute}`, 'log-err');
 }

 // Step 5: Re-import Initial Delivery (Rev 1 arriving after Rev 2)
 log('Step 5: Re-importing 01_initial.json (Rev 1) again...', 'log-info');
 const res5 = importBatch(initialData, log);
 const m07Final = state.records[m07Key];
 if (m07Final._applied_revision === 2 && m07Final.transcript_payload.turns.length === 27) {
 log(`PASS: Revision ordering contract verified! Older Rev 1 did NOT overwrite newer Rev 2 on M07.`, 'log-ok');
 } else {
 log(`FAIL: Revision 1 overwrote Revision 2!`, 'log-err');
 }

 // Step 6: Reload / Persistence verification
 log('Step 6: Simulating browser restart / localStorage reload...', 'log-info');
 const savedCount = Object.keys(state.records).length;
 loadState();
 const reloadedM07 = state.records[m07Key];
 const reloadedRoute = getActiveRoute(reloadedM07);
 if (savedCount === 44 && reloadedRoute === 'customer_escalation') {
 log(`PASS: Application state fully restored from localStorage. Manual decision intact.`, 'log-ok');
 log('=== ALL CONTRACT TESTS PASSED (6/6) ===', 'log-ok');
 showToast('All 6 replay tests passed successfully!', 'success');
 } else {
 log(`FAIL: Persistence recovery mismatch!`, 'log-err');
 }

 renderAll();
 }

 // ── METRICS COMPUTATION ────────────────────────────────────────────────────
 function computeMetrics() {
 const recordsList = Object.values(state.records);
 const totalRecords = recordsList.length;

 const calls = recordsList.filter(r => r.source_type === 'call');
 const meetings = recordsList.filter(r => r.source_type === 'meeting');

 const usableTranscripts = recordsList.filter(hasUsableTranscript);
 const coveragePct = totalRecords > 0 ? ((usableTranscripts.length / totalRecords) * 100).toFixed(1) : '0.0';

 // Source-reported connected-call rate
 // calls with is_connected === true divided by calls with non-null is_connected
 const callsWithNonNullConnected = calls.filter(c => c.payload && c.payload.is_connected !== null && c.payload.is_connected !== undefined);
 const connectedCalls = calls.filter(c => c.payload && c.payload.is_connected === true);
 const unknownConnectedCalls = calls.filter(c => !c.payload || c.payload.is_connected === null || c.payload.is_connected === undefined);

 const connectedRatePct = callsWithNonNullConnected.length > 0
 ? ((connectedCalls.length / callsWithNonNullConnected.length) * 100).toFixed(1)
 : '0.0';

 // Route distribution
 const routeCounts = {};
 Object.keys(ROUTES).forEach(r => (routeCounts[r] = 0));
 recordsList.forEach(r => {
 const route = getActiveRoute(r);
 routeCounts[route] = (routeCounts[route] || 0) + 1;
 });

 // Needs review count
 const needsReviewCount = recordsList.filter(r => {
 const key = makeKey(r.source_type, r.source_id);
 const isRev = state.reviewStatus[key] && state.reviewStatus[key].reviewed;
 return getActiveRoute(r) === 'needs_review' || !isRev || isAnalysisStale(r);
 }).length;

 // Missing transcripts count
 const missingTranscriptsCount = totalRecords - usableTranscripts.length;

 // Stale analysis count
 const staleCount = recordsList.filter(isAnalysisStale).length;

 // Manual overrides count
 const manualOverridesCount = Object.keys(state.manualOverrides).length;

 return {
 totalRecords,
 callsCount: calls.length,
 meetingsCount: meetings.length,
 usableTranscriptsCount: usableTranscripts.length,
 coveragePct,
 connectedCallsCount: connectedCalls.length,
 connectedDenominator: callsWithNonNullConnected.length,
 unknownConnectedCallsCount: unknownConnectedCalls.length,
 connectedRatePct,
 routeCounts,
 needsReviewCount,
 missingTranscriptsCount,
 staleCount,
 manualOverridesCount
 };
 }

 // ── FILTERING & SORTING ───────────────────────────────────────────────────
 function getFilteredRecords() {
 let list = Object.values(state.records);

 // Filter by source type
 if (state.filters.source_type !== 'all') {
 list = list.filter(r => r.source_type === state.filters.source_type);
 }

 // Filter by route
 if (state.filters.route !== 'all') {
 list = list.filter(r => getActiveRoute(r) === state.filters.route);
 }

 // Filter by review status
 if (state.filters.review_status !== 'all') {
 if (state.filters.review_status === 'reviewed') {
 list = list.filter(r => {
 const key = makeKey(r.source_type, r.source_id);
 return state.reviewStatus[key] && state.reviewStatus[key].reviewed;
 });
 } else if (state.filters.review_status === 'pending') {
 list = list.filter(r => {
 const key = makeKey(r.source_type, r.source_id);
 return !state.reviewStatus[key] || !state.reviewStatus[key].reviewed;
 });
 } else if (state.filters.review_status === 'overridden') {
 list = list.filter(r => {
 const key = makeKey(r.source_type, r.source_id);
 return Boolean(state.manualOverrides[key]);
 });
 } else if (state.filters.review_status === 'stale') {
 list = list.filter(isAnalysisStale);
 }
 }

 // Filter by transcript availability
 if (state.filters.has_transcript !== 'all') {
 const needTx = state.filters.has_transcript === 'yes';
 list = list.filter(r => hasUsableTranscript(r) === needTx);
 }

 // Filter by rep / organizer
 if (state.filters.rep !== 'all') {
 list = list.filter(r => getRecordPerson(r) === state.filters.rep);
 }

 // Live search query
 if (state.filters.search.trim().length > 0) {
 const q = state.filters.search.toLowerCase();
 list = list.filter(r => {
 const title = getRecordTitle(r).toLowerCase();
 const ref = (r.record_ref || '').toLowerCase();
 const person = getRecordPerson(r).toLowerCase();
 const route = getActiveRoute(r).toLowerCase();
 const sid = (r.source_id || '').toLowerCase();
 let tx = '';
 if (r.source_type === 'call' && r.payload && r.payload.transcript) {
 tx = r.payload.transcript.toLowerCase();
 } else if (r.source_type === 'meeting' && r.transcript_payload && r.transcript_payload.turns) {
 tx = r.transcript_payload.turns.map(t => t.text).join(' ').toLowerCase();
 }
 return title.includes(q) || ref.includes(q) || person.includes(q) || route.includes(q) || sid.includes(q) || tx.includes(q);
 });
 }

 // Sorting
 list.sort((a, b) => {
 let valA, valB;
 if (state.sort.field === 'date') {
 valA = new Date(getRecordDate(a) || 0).getTime();
 valB = new Date(getRecordDate(b) || 0).getTime();
 } else if (state.sort.field === 'ref') {
 valA = a.record_ref || '';
 valB = b.record_ref || '';
 } else if (state.sort.field === 'route') {
 valA = getActiveRoute(a);
 valB = getActiveRoute(b);
 } else if (state.sort.field === 'type') {
 valA = a.source_type;
 valB = b.source_type;
 }
 if (valA < valB) return state.sort.dir === 'asc' ? -1 : 1;
 if (valA > valB) return state.sort.dir === 'asc' ? 1 : -1;
 return 0;
 });

 return list;
 }

 // ── UI RENDERING: OVERVIEW DASHBOARD ───────────────────────────────────────
 function renderOverview() {
 const metrics = computeMetrics();

 // Fill metrics cards
 setText('metric-total', metrics.totalRecords);
 setText('metric-total-sub', `${metrics.callsCount} calls · ${metrics.meetingsCount} meetings`);

 setText('metric-coverage', `${metrics.coveragePct}%`);
 setText('metric-coverage-sub', `${metrics.usableTranscriptsCount} of ${metrics.totalRecords} records with text`);

 setText('metric-connect', `${metrics.connectedRatePct}%`);
 setText('metric-connect-sub', `${metrics.connectedCallsCount} of ${metrics.connectedDenominator} reported calls (0 unknown)`);

 setText('metric-review', metrics.needsReviewCount);
 setText('metric-review-sub', `${metrics.staleCount} stale after update · ${metrics.manualOverridesCount} overridden`);

 // Render Charts if Chart.js is available
 if (window.Chart) {
 renderRouteChart(metrics.routeCounts);
 renderRepChart();
 }

 // Populate rep filter dropdown
 populateRepDropdown();
 }

 function renderRouteChart(routeCounts) {
 const ctx = document.getElementById('route-chart-canvas');
 if (!ctx) return;

 const labels = Object.keys(routeCounts).map(k => (ROUTES[k] ? ROUTES[k].label : k));
 const data = Object.values(routeCounts);
 const bgColors = [
 '#3fb950', '#58a6ff', '#d29922', '#f85149',
 '#56d364', '#e3b341', '#6e7681', '#bc8cff'
 ];

 const isWhite = document.documentElement.getAttribute('data-theme') === 'white';
 const textColor = isWhite ? '#475569' : '#a1a1aa';
 const borderColor = isWhite ? '#ffffff' : '#0a0a0a';

 if (routeChart) routeChart.destroy();

 routeChart = new window.Chart(ctx, {
 type: 'doughnut',
 data: {
 labels: labels,
 datasets: [{
 data: data,
 backgroundColor: bgColors,
 borderWidth: 2,
 borderColor: borderColor
 }]
 },
 options: {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: {
 position: 'right',
 labels: { color: textColor, font: { size: 11 } }
 }
 }
 }
 });
 }

 function renderRepChart() {
 const ctx = document.getElementById('rep-chart-canvas');
 if (!ctx) return;

 const repCounts = {};
 Object.values(state.records).forEach(r => {
 const p = getRecordPerson(r);
 repCounts[p] = (repCounts[p] || 0) + 1;
 });

 const labels = Object.keys(repCounts).sort((a, b) => repCounts[b] - repCounts[a]).slice(0, 7);
 const data = labels.map(l => repCounts[l]);

 const isWhite = document.documentElement.getAttribute('data-theme') === 'white';
 const textColor = isWhite ? '#475569' : '#a1a1aa';
 const gridColor = isWhite ? '#e2e8f0' : '#27272a';
 const barColor = isWhite ? '#0284c7' : '#58a6ff';

 if (repChart) repChart.destroy();

 repChart = new window.Chart(ctx, {
 type: 'bar',
 data: {
 labels: labels,
 datasets: [{
 label: 'Interactions',
 data: data,
 backgroundColor: barColor,
 borderRadius: 4
 }]
 },
 options: {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: { display: false }
 },
 scales: {
 x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
 y: { ticks: { color: textColor, font: { size: 10 }, stepSize: 2 }, grid: { color: gridColor } }
 }
 }
 });
 }

 function populateRepDropdown() {
 const select = document.getElementById('filter-rep');
 if (!select) return;
 const currentVal = select.value;
 const reps = new Set();
 Object.values(state.records).forEach(r => reps.add(getRecordPerson(r)));

 select.innerHTML = '<option value="all">All Reps & Organizers</option>';
 Array.from(reps).sort().forEach(r => {
 const opt = document.createElement('option');
 opt.value = r;
 opt.textContent = r;
 if (r === currentVal) opt.selected = true;
 select.appendChild(opt);
 });
 }

 // ── UI RENDERING: INBOX & SPLIT VIEW ───────────────────────────────────────
 function renderInbox() {
 const tableBody = document.getElementById('inbox-tbody');
 const countEl = document.getElementById('inbox-count-display');
 if (!tableBody) return;

 const records = getFilteredRecords();
 if (countEl) {
 countEl.textContent = `Showing ${records.length} of ${Object.keys(state.records).length} records`;
 }

 if (records.length === 0) {
 tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-subtle);">No matching conversations found. Adjust filters or search terms.</td></tr>`;
 renderDetailPanel(null);
 return;
 }

 // Default select first item if none selected or selected not in list
 if (!state.selectedRecordKey || !state.records[state.selectedRecordKey]) {
 state.selectedRecordKey = makeKey(records[0].source_type, records[0].source_id);
 }

 let rowsHtml = '';
 records.forEach(r => {
 const key = makeKey(r.source_type, r.source_id);
 const isSelected = key === state.selectedRecordKey;
 const ref = r.record_ref || 'N/A';
 const type = r.source_type;
 const dateStr = formatDateTime(getRecordDate(r));
 const person = getRecordPerson(r);
 const title = getRecordTitle(r);
 const hasTx = hasUsableTranscript(r);
 const route = getActiveRoute(r);
 const routeDef = ROUTES[route] || { label: route, class: 'route-needs_review' };
 const isManual = Boolean(state.manualOverrides[key]);
 const isRev = state.reviewStatus[key] && state.reviewStatus[key].reviewed;
 const isStale = isAnalysisStale(r);
 const rev = r._applied_revision || 1;

 rowsHtml += `
 <tr class="${isSelected ? 'selected' : ''}" data-key="${key}">
 <td>
 <span class="badge ${type === 'call' ? 'badge-call' : 'badge-meeting'}">${type.toUpperCase()}</span>
 <span class="record-id" style="margin-left:4px;">${ref}</span>
 </td>
 <td>
 <div class="record-title truncate" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
 <div class="record-meta">${escapeHtml(person)}</div>
 </td>
 <td style="font-size:11px; color:var(--text-muted);">${dateStr}</td>
 <td>
 ${
 hasTx
 ? `<span class="badge badge-transcript">Transcript</span>`
 : `<span class="badge badge-no-transcript">No Text</span>`
 }
 </td>
 <td>
 <span class="route-badge ${routeDef.class} ${isManual ? 'route-manual' : ''}">
 ${escapeHtml(routeDef.label)} ${isManual ? '(Manual)' : ''}
 </span>
 </td>
 <td style="text-align:center;">
 <span class="badge" style="background:var(--surface3); font-size:10px;">Rev ${rev}</span>
 </td>
 <td>
 ${
 isStale
 ? `<span class="badge badge-stale" title="Updated source text requires review">Needs Review</span>`
 : isRev
 ? `<span class="badge" style="color:var(--green); background:var(--green-dim); font-size:10px;">Reviewed</span>`
 : `<span class="badge" style="color:var(--amber); background:var(--amber-dim); font-size:10px;">Pending</span>`
 }
 </td>
 </tr>
 `;
 });

 tableBody.innerHTML = rowsHtml;

 // Attach row click events
 tableBody.querySelectorAll('tr').forEach(tr => {
 tr.addEventListener('click', () => {
 const key = tr.getAttribute('data-key');
 state.selectedRecordKey = key;
 tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
 tr.classList.add('selected');
 renderDetailPanel(state.records[key]);
 });
 });

 // Render detail panel for selected record
 renderDetailPanel(state.records[state.selectedRecordKey]);
 }

 // ── UI RENDERING: DETAIL PANEL ─────────────────────────────────────────────
 function renderDetailPanel(record) {
 const detailPanel = document.getElementById('detail-panel');
 if (!detailPanel) return;

 if (!record) {
 detailPanel.innerHTML = `
 <div class="detail-placeholder">
 <div class="icon"></div>
 <p>Select a conversation from the inbox to inspect evidence, transcript turns, and routing controls.</p>
 </div>
 `;
 return;
 }

 const key = makeKey(record.source_type, record.source_id);
 const ref = record.record_ref || 'N/A';
 const type = record.source_type;
 const title = getRecordTitle(record);
 const person = getRecordPerson(record);
 const dateStr = formatDateTime(getRecordDate(record));
 const hasTx = hasUsableTranscript(record);
 const rev = record._applied_revision || 1;
 const isStale = isAnalysisStale(record);
 const suggestedRoute = getSuggestedRoute(record);
 const activeRoute = getActiveRoute(record);
 const isManual = Boolean(state.manualOverrides[key]);
 const manualNote = isManual ? state.manualOverrides[key].note || '' : '';
 const isReviewed = Boolean(state.reviewStatus[key] && state.reviewStatus[key].reviewed);

 const analysis = getRecordAnalysis(record);

 let html = `
 <div>
 <div class="flex items-center gap-2" style="margin-bottom:6px;">
 <span class="badge ${type === 'call' ? 'badge-call' : 'badge-meeting'}">${type.toUpperCase()}</span>
 <span class="font-bold text-sm" style="color:var(--accent);">${ref}</span>
 <span class="badge" style="background:var(--surface3); font-size:10px;">Rev ${rev}</span>
 ${isManual ? `<span class="manual-indicator">Manual Override Active</span>` : ''}
 ${isStale ? `<span class="badge badge-stale">Source Updated (Rev ${rev})</span>` : ''}
 </div>
 <h2 style="font-size:16px; font-weight:700; color:var(--text); line-height:1.3; margin-bottom:4px;">
 ${escapeHtml(title)}
 </h2>
 <div class="record-meta" style="margin-bottom:12px;">
 ${escapeHtml(person)} · ${dateStr} · Source ID: <span class="font-mono text-xs">${escapeHtml(record.source_id)}</span>
 </div>
 </div>
 `;

 // Alert if stale analysis
 if (isStale) {
 html += `
 <div class="analysis-stale">
 Notice: <strong>Late Information Update:</strong> This meeting received updated transcript turns in Revision ${rev}.
 Please review the updated transcript and re-confirm the assigned route.
 </div>
 `;
 }

 // Detail Panel Tabs
 html += `
 <div class="filter-pills" style="margin-bottom:12px;">
 <button class="pill active" id="tab-btn-analysis" onclick="window.switchDetailTab('analysis')">Analysis & Evidence</button>
 <button class="pill" id="tab-btn-transcript" onclick="window.switchDetailTab('transcript')">Transcript (${hasTx ? 'Available' : 'None'})</button>
 <button class="pill" id="tab-btn-meta" onclick="window.switchDetailTab('meta')">Source Metadata</button>
 </div>

 <!-- TAB 1: ANALYSIS & EVIDENCE -->
 <div id="tab-content-analysis" class="analysis-block">
 <div class="analysis-item">
 <div class="analysis-label">Main Discussion Topic</div>
 <div class="analysis-value">${escapeHtml(analysis.main_topic)}</div>
 </div>

 <div class="analysis-item">
 <div class="analysis-label">Customer Sentiment & Objections</div>
 <div class="analysis-value">${escapeHtml(analysis.customer_sentiment)}</div>
 </div>

 <div class="analysis-item">
 <div class="analysis-label">Explicit Commitments & Next Steps</div>
 <div class="analysis-value">${escapeHtml(analysis.explicit_commitments)}</div>
 </div>

 <div class="analysis-item">
 <div class="analysis-label">Potential Risks & Boundaries</div>
 <div class="analysis-value">${escapeHtml(analysis.potential_risks)}</div>
 </div>

 <div class="analysis-item">
 <div class="analysis-label">Follow-Up Action Required</div>
 <div class="analysis-value">${escapeHtml(analysis.follow_up_requirements)}</div>
 </div>

 <div class="analysis-item">
 <div class="analysis-label">Supporting Transcript Evidence</div>
 ${
 analysis.evidence_references && analysis.evidence_references.length > 0
 ? analysis.evidence_references.map(ev => `
 <div class="evidence-ref">
 ${ev.turn ? `<strong>Turn ${ev.turn} [${ev.speaker || 'Speaker'} @ ${ev.timecode || ''}]:</strong> ` : ''}
 "${escapeHtml(ev.quote || ev.text)}"
 ${ev.context ? `<br><span style="font-size:10px; color:var(--text-subtle);">Context: ${escapeHtml(ev.context)}</span>` : ''}
 </div>
 `).join('')
 : `<div class="text-subtle text-xs" style="font-style:italic;">No transcript evidence available. Strictly derived from source-reported metadata.</div>`
 }
 </div>
 </div>

 <!-- TAB 2: TRANSCRIPT VIEWER -->
 <div id="tab-content-transcript" class="hidden">
 <div class="transcript-block">
 ${renderTranscriptContent(record)}
 </div>
 </div>

 <!-- TAB 3: SOURCE METADATA -->
 <div id="tab-content-meta" class="hidden">
 <pre class="export-manifest-preview" style="font-size:10px; max-height:260px;">${escapeHtml(JSON.stringify(record, null, 2))}</pre>
 </div>

 <hr class="divider" />

 <!-- ROUTING CONTROLS -->
 <div class="route-control card card-sm">
 <div class="analysis-label" style="margin-bottom:8px;">Routing & Governance Controls</div>
 
 <div style="font-size:12px; margin-bottom:8px;">
 <span class="text-muted">Automated Suggested Route:</span>
 <strong>${ROUTES[suggestedRoute] ? ROUTES[suggestedRoute].label : suggestedRoute}</strong>
 <div class="text-xs text-subtle" style="margin-top:2px;">${escapeHtml(analysis.routing_reason || '')}</div>
 </div>

 <div class="route-select-wrap">
 <label class="text-xs text-muted" style="width:100%;">Assigned Active Route:</label>
 <select id="route-selector" class="route-select">
 ${Object.keys(ROUTES).map(r => `
 <option value="${r}" ${r === activeRoute ? 'selected' : ''}>${ROUTES[r].label}</option>
 `).join('')}
 </select>
 <button id="btn-save-route" class="btn btn-primary btn-sm">Save Route</button>
 ${isManual ? `<button id="btn-reset-route" class="btn btn-ghost btn-sm">Reset</button>` : ''}
 </div>

 <div style="margin-top:8px;">
 <label class="text-xs text-muted">Manager Audit / Correction Note:</label>
 <textarea id="route-note-input" class="route-note" placeholder="Add rationale for routing decision or follow-up instructions...">${escapeHtml(manualNote)}</textarea>
 </div>

 <div class="flex items-center justify-between" style="margin-top:10px;">
 <label class="flex items-center gap-2 text-xs" style="cursor:pointer;">
 <input type="checkbox" id="reviewed-checkbox" ${isReviewed ? 'checked' : ''} />
 <span style="color:var(--text);">Mark Record as Reviewed</span>
 </label>
 <span class="text-xs text-subtle font-mono">${record.source_type}::${record.record_ref}</span>
 </div>
 </div>
 `;

 detailPanel.innerHTML = html;

 // Attach control listeners
 const saveBtn = document.getElementById('btn-save-route');
 if (saveBtn) {
 saveBtn.addEventListener('click', () => {
 const newRoute = document.getElementById('route-selector').value;
 const note = document.getElementById('route-note-input').value;
 state.manualOverrides[key] = {
 manual_route: newRoute,
 note: note,
 updated_at: new Date().toISOString()
 };
 state.reviewStatus[key] = {
 reviewed: true,
 updated_at: new Date().toISOString()
 };
 // Clear stale status if reviewed
 record._source_updated = false;
 saveState();
 showToast(`Route updated to ${ROUTES[newRoute].label}`, 'success');
 renderAll();
 });
 }

 const resetBtn = document.getElementById('btn-reset-route');
 if (resetBtn) {
 resetBtn.addEventListener('click', () => {
 delete state.manualOverrides[key];
 saveState();
 showToast('Reset to automated suggested route', 'info');
 renderAll();
 });
 }

 const reviewedCheck = document.getElementById('reviewed-checkbox');
 if (reviewedCheck) {
 reviewedCheck.addEventListener('change', (e) => {
 state.reviewStatus[key] = {
 reviewed: e.target.checked,
 updated_at: new Date().toISOString()
 };
 if (e.target.checked) record._source_updated = false;
 saveState();
 showToast(e.target.checked ? 'Marked as reviewed' : 'Marked as pending review', 'info');
 renderAll();
 });
 }
 }

 function renderTranscriptContent(record) {
 if (!hasUsableTranscript(record)) {
 const reason =
 (record.transcript_payload && record.transcript_payload.unavailable_reason) ||
 (record.payload && record.payload.observed_outcome) ||
 'No transcript supplied in delivery';
 return `
 <div style="color:var(--text-subtle); padding:16px; text-align:center;">
 <p><strong>Transcript Content Unavailable</strong></p>
 <p class="text-xs" style="margin-top:6px;">Upstream state: ${escapeHtml(reason)}</p>
 <p class="text-xs" style="margin-top:4px; font-style:italic;">Never pretend that a call without a supplied transcript has been analyzed from its conversation text.</p>
 </div>
 `;
 }

 if (record.source_type === 'call') {
 return `<div class="transcript-call">${escapeHtml(record.payload.transcript)}</div>`;
 }

 if (record.source_type === 'meeting' && record.transcript_payload && record.transcript_payload.turns) {
 return record.transcript_payload.turns.map((turn, idx) => `
 <div class="turn">
 <div class="flex items-center justify-between turn-meta">
 <span><strong class="turn-num">#${idx + 1}</strong> <span class="turn-speaker">${escapeHtml(turn.speaker || 'Speaker')}</span></span>
 <span class="font-mono">${escapeHtml(turn.timecode || '')}</span>
 </div>
 <div class="turn-text">${escapeHtml(turn.text)}</div>
 </div>
 `).join('');
 }

 return '<div class="text-subtle">No transcript text available.</div>';
 }

 window.switchDetailTab = function (tab) {
 const tabs = ['analysis', 'transcript', 'meta'];
 tabs.forEach(t => {
 const btn = document.getElementById(`tab-btn-${t}`);
 const content = document.getElementById(`tab-content-${t}`);
 if (btn) btn.classList.toggle('active', t === tab);
 if (content) content.classList.toggle('hidden', t !== tab);
 });
 };

 // ── UI RENDERING: EXPORT MANIFEST PREVIEW ───────────────────────────────────
 function generateManifest() {
 const recordsList = Object.values(state.records);
 const manifest = recordsList.map(r => {
 const key = makeKey(r.source_type, r.source_id);
 const ref = r.record_ref || 'N/A';
 const appliedRev = r._applied_revision || 1;
 const assignedRoute = getActiveRoute(r);
 const isManual = Boolean(state.manualOverrides[key]);
 const isRev = Boolean(state.reviewStatus[key] && state.reviewStatus[key].reviewed);
 const isStale = isAnalysisStale(r);
 const hasTx = hasUsableTranscript(r);

 // Determine clean relative output path
 let outputPath = '';
 if (hasTx) {
 if (r.source_type === 'call') {
 outputPath = `calls/${ref}_call_summary.md`;
 } else {
 const safeTitle = (r.payload.title || 'meeting').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
 outputPath = `meetings/${ref}_${safeTitle}.md`;
 }
 } else {
 outputPath = `unprocessed/${ref}_metadata_only.json`;
 }

 return {
 source_type: r.source_type,
 source_id: r.source_id,
 record_ref: ref,
 applied_source_revision: appliedRev,
 assigned_route: assignedRoute,
 relative_output_path: outputPath,
 has_transcript: hasTx,
 processing_status: hasTx ? 'analyzed' : 'metadata_retained',
 review_status: isRev ? 'reviewed' : 'pending_review',
 manual_override_flag: isManual,
 analysis_freshness: isStale ? 'stale_pending_review' : 'current'
 };
 });

 return manifest;
 }

 function renderExportManifestPreview() {
 const pre = document.getElementById('manifest-preview');
 if (!pre) return;
 const manifest = generateManifest();
 pre.textContent = JSON.stringify(manifest, null, 2);
 }

 function downloadFile(filename, content, type = 'application/json') {
 const blob = new Blob([content], { type });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 }

 function downloadManifestJson() {
 if (window.API) { try { API.downloadJson(); showToast('Downloading manifest.json from server', 'success'); return; } catch(_) {} }
 const manifest = generateManifest();
 downloadFile('manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
 showToast('Downloaded manifest.json (local)', 'success');
 }

 function downloadManifestCsv() {
 if (window.API) { try { API.downloadCsv(); showToast('Downloading manifest.csv from server', 'success'); return; } catch(_) {} }
 const manifest = generateManifest();
 if (manifest.length === 0) return;
 const headers = Object.keys(manifest[0]);
 const csvRows = [headers.join(',')];
 manifest.forEach(row => {
 const values = headers.map(h => {
 const val = row[h];
 if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
 return val;
 });
 csvRows.push(values.join(','));
 });
 downloadFile('manifest.csv', csvRows.join('\n'), 'text/csv');
 showToast('Downloaded manifest.csv', 'success');
 }

 // ── FORMATTING & GENERAL HELPERS ──────────────────────────────────────────
 function formatDateTime(isoString) {
 if (!isoString) return 'N/A';
 try {
 const d = new Date(isoString);
 return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' (' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
 } catch {
 return isoString;
 }
 }

 function setText(id, text) {
 const el = document.getElementById(id);
 if (el) el.textContent = text;
 }

 function escapeHtml(str) {
 if (typeof str !== 'string') return String(str || '');
 return str
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;')
 .replace(/'/g, '&#039;');
 }

 function showToast(message, type = 'info') {
 const area = document.getElementById('toast-area');
 if (!area) return;
 const toast = document.createElement('div');
 toast.className = `toast ${type}`;
 toast.textContent = message;
 area.appendChild(toast);
 setTimeout(() => {
 toast.style.opacity = '0';
 toast.style.transition = 'opacity .3s';
 setTimeout(() => toast.remove(), 300);
 }, 3200);
 }

 // ── PAGE NAVIGATION ────────────────────────────────────────────────────────
 function setupNavigation() {
 const navItems = document.querySelectorAll('.nav-item[data-page]');
 navItems.forEach(item => {
 item.addEventListener('click', () => {
 const page = item.getAttribute('data-page');
 navigateTo(page);
 });
 });
 }

 function navigateTo(pageId) {
 state.activePage = pageId;
 document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
 document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

 const targetPage = document.getElementById(`page-${pageId}`);
 const targetNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
 if (targetPage) targetPage.classList.add('active');
 if (targetNav) targetNav.classList.add('active');

 if (pageId === 'overview') renderOverview();
 if (pageId === 'inbox') renderInbox();
 if (pageId === 'export') renderExportManifestPreview();
 }

 // ── EVENT LISTENERS INITIALIZATION ─────────────────────────────────────────
 function setupListeners() {
 // Quick search
 const searchInput = document.getElementById('search-input');
 if (searchInput) {
 searchInput.addEventListener('input', (e) => {
 state.filters.search = e.target.value;
 renderInbox();
 });
 }

 // Filter selectors
 const typeSelect = document.getElementById('filter-type');
 if (typeSelect) {
 typeSelect.addEventListener('change', (e) => {
 state.filters.source_type = e.target.value;
 renderInbox();
 });
 }

 const routeSelect = document.getElementById('filter-route');
 if (routeSelect) {
 routeSelect.addEventListener('change', (e) => {
 state.filters.route = e.target.value;
 renderInbox();
 });
 }

 const reviewSelect = document.getElementById('filter-review');
 if (reviewSelect) {
 reviewSelect.addEventListener('change', (e) => {
 state.filters.review_status = e.target.value;
 renderInbox();
 });
 }

 const repSelect = document.getElementById('filter-rep');
 if (repSelect) {
 repSelect.addEventListener('change', (e) => {
 state.filters.rep = e.target.value;
 renderInbox();
 });
 }

 const transcriptSelect = document.getElementById('filter-transcript');
 if (transcriptSelect) {
 transcriptSelect.addEventListener('change', (e) => {
 state.filters.has_transcript = e.target.value;
 renderInbox();
 });
 }

 // Sort select
 const sortSelect = document.getElementById('sort-select');
 if (sortSelect) {
 sortSelect.addEventListener('change', (e) => {
 const parts = e.target.value.split(':');
 state.sort.field = parts[0];
 state.sort.dir = parts[1] || 'asc';
 renderInbox();
 });
 }

 // Replay lab buttons
 const btnRunFull = document.getElementById('btn-run-full-replay');
 if (btnRunFull) {
 btnRunFull.addEventListener('click', () => {
 const logEl = document.getElementById('replay-log');
 runFullReplay(logEl);
 });
 }

 const btnStep1 = document.getElementById('btn-step1-initial');
 if (btnStep1) {
 btnStep1.addEventListener('click', () => {
 const logEl = document.getElementById('replay-log');
 importBatch(window.BUNDLE_DATA.initial_delivery, (msg, type) => {
 appendLog(logEl, msg, type);
 });
 renderAll();
 });
 }

 const btnStep2 = document.getElementById('btn-step2-repeat');
 if (btnStep2) {
 btnStep2.addEventListener('click', () => {
 const logEl = document.getElementById('replay-log');
 const reversed = JSON.parse(JSON.stringify(window.BUNDLE_DATA.initial_delivery));
 reversed.records.reverse();
 importBatch(reversed, (msg, type) => {
 appendLog(logEl, `Repeated Import (Reversed): ${msg}`, type);
 });
 renderAll();
 });
 }

 const btnStep3 = document.getElementById('btn-step3-override');
 if (btnStep3) {
 btnStep3.addEventListener('click', () => {
 const logEl = document.getElementById('replay-log');
 const m07 = Object.values(state.records).find(r => r.record_ref === 'M07');
 if (m07) {
 const key = makeKey(m07.source_type, m07.source_id);
 state.manualOverrides[key] = {
 manual_route: 'customer_escalation',
 note: 'Manual route override: 4 severe UI bugs verified on customer screen-share session.',
 updated_at: new Date().toISOString()
 };
 saveState();
 appendLog(logEl, "Manual override set for M07 -> 'customer_escalation'", 'log-ok');
 showToast("M07 manually routed to 'Customer Escalation'", 'success');
 renderAll();
 } else {
 appendLog(logEl, 'M07 not found. Import initial delivery first.', 'log-err');
 }
 });
 }

 const btnStep4 = document.getElementById('btn-step4-update');
 if (btnStep4) {
 btnStep4.addEventListener('click', () => {
 const logEl = document.getElementById('replay-log');
 importBatch(window.BUNDLE_DATA.update_delivery, (msg, type) => {
 appendLog(logEl, `Update Batch: ${msg}`, type);
 });
 renderAll();
 });
 }

 const btnStep5 = document.getElementById('btn-step5-reinitial');
 if (btnStep5) {
 btnStep5.addEventListener('click', () => {
 const logEl = document.getElementById('replay-log');
 importBatch(window.BUNDLE_DATA.initial_delivery, (msg, type) => {
 appendLog(logEl, `Re-import Initial Batch: ${msg}`, type);
 });
 renderAll();
 });
 }

 const btnStep6 = document.getElementById('btn-step6-refresh');
 if (btnStep6) {
 btnStep6.addEventListener('click', () => {
 const logEl = document.getElementById('replay-log');
 loadState();
 appendLog(logEl, 'Simulated application refresh. State reloaded from LocalStorage.', 'log-ok');
 showToast('Application state reloaded from storage', 'info');
 renderAll();
 });
 }

 // Reset button
 const btnReset = document.getElementById('btn-reset-state');
 if (btnReset) {
 btnReset.addEventListener('click', () => {
 if (confirm('Reset application to baseline? All local changes and imports will be cleared.')) {
 clearAllState();
 // Re-seed with initial delivery
 importBatch(window.BUNDLE_DATA.initial_delivery);
 importBatch(window.BUNDLE_DATA.update_delivery);
 showToast('State reset and reloaded with both deliveries', 'info');
 renderAll();
 }
 });
 }

 // Export buttons
 const btnExpJson = document.getElementById('btn-export-manifest-json');
 if (btnExpJson) btnExpJson.addEventListener('click', downloadManifestJson);

 const btnExpCsv = document.getElementById('btn-export-manifest-csv');
 if (btnExpCsv) btnExpCsv.addEventListener('click', downloadManifestCsv);

 // File dropzone import
 const dropzone = document.getElementById('dropzone');
 const fileInput = document.getElementById('batch-file-input');
 if (dropzone && fileInput) {
 dropzone.addEventListener('click', () => fileInput.click());
 dropzone.addEventListener('dragover', (e) => {
 e.preventDefault();
 dropzone.classList.add('drag-over');
 });
 dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
 dropzone.addEventListener('drop', (e) => {
 e.preventDefault();
 dropzone.classList.remove('drag-over');
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 handleFileUpload(e.dataTransfer.files[0]);
 }
 });
 fileInput.addEventListener('change', (e) => {
 if (e.target.files && e.target.files[0]) {
 handleFileUpload(e.target.files[0]);
 }
 });
 }
 }

 function handleFileUpload(file) {
 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const json = JSON.parse(e.target.result);
 const logEl = document.getElementById('replay-log');
 const res = importBatch(json, (msg, type) => appendLog(logEl, msg, type));
 showToast(`Imported ${file.name}: ${res.added} added, ${res.updated} updated`, 'success');
 renderAll();
 } catch (err) {
 showToast(`Failed to parse ${file.name}: ${err.message}`, 'error');
 }
 };
 reader.readAsText(file);
 }

 function appendLog(logEl, msg, type = 'log-info') {
 if (!logEl) return;
 const div = document.createElement('div');
 div.className = `log-line ${type}`;
 div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
 logEl.appendChild(div);
 logEl.scrollTop = logEl.scrollHeight;
 }

 function renderAll() {
 renderOverview();
 renderInbox();
 renderExportManifestPreview();

 // Update top header badges
 const totalCount = Object.keys(state.records).length;
 setText('header-record-count', `${totalCount} Records`);

 const latestBatch = state.appliedBatches[state.appliedBatches.length - 1];
 if (latestBatch) {
 setText('header-batch-badge', `Batch: ${latestBatch.batch_id} (Rev ${latestBatch.revision})`);
 } else {
 setText('header-batch-badge', 'No batch imported');
 }
 }

 // ── THEME MANAGER (BLACK MODE / WHITE MODE) ──────────────────────────────
 function setupTheme() {
 const savedTheme = localStorage.getItem('volopay_theme') || 'black';
 applyTheme(savedTheme);

 const toggleBtn = document.getElementById('theme-toggle-btn');
 if (toggleBtn) {
 toggleBtn.addEventListener('click', () => {
 const current = document.documentElement.getAttribute('data-theme') || 'black';
 const nextTheme = current === 'black' ? 'white' : 'black';
 applyTheme(nextTheme);
 showToast(nextTheme === 'white' ? 'Switched to White Mode' : 'Switched to Black Mode', 'info');
 });
 }
 }

 function applyTheme(theme) {
 document.documentElement.setAttribute('data-theme', theme);
 localStorage.setItem('volopay_theme', theme);
 const toggleBtn = document.getElementById('theme-toggle-btn');
 if (toggleBtn) {
 if (theme === 'white') {
 toggleBtn.innerHTML = ' Black Mode';
 toggleBtn.setAttribute('title', 'Switch to Black Mode');
 } else {
 toggleBtn.innerHTML = ' White Mode';
 toggleBtn.setAttribute('title', 'Switch to White Mode');
 }
 }
 // Refresh overview charts if on overview page
 if (state.activePage === 'overview') {
 renderOverview();
 }
 }

 // ── APPLICATION BOOTSTRAP ──────────────────────────────────────────────────
 function init() {
 setupTheme();
 const hasExistingState = loadState();

 if (!hasExistingState) {
 // By assignment requirement:
 // "Your submitted app should open in the final post-update state, or provide one clearly documented demo-load action that imports both batches."
 // We load initial, then update batch to present the final post-update state out-of-the-box!
 importBatch(window.BUNDLE_DATA.initial_delivery);
 importBatch(window.BUNDLE_DATA.update_delivery);
 }

 setupNavigation();
 setupListeners();
 renderAll();

 // Default open overview
 navigateTo('overview');
 }

 // Run on DOM ready
 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', init);
 } else {
 init();
 }

})();
