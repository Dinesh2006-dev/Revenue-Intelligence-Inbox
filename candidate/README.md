# SpendNest Revenue Intelligence Inbox — Implementation & Submission

**Candidate Assignment Solution for Volopay**  
**Role:** Senior Full-Stack Developer, Product Designer & Data Analyst  
**Application URL (Local):** `candidate/app/index.html` (Accessible directly via browser or `python -m http.server 8080`)  
**Assessment Date:** 21 August 2026 (Asia/Kolkata)  

---

## 1. Quick Startup & Demonstration Instructions

### Option A: Direct Browser Access (Zero Installation / File Protocol)
Double-click `candidate/app/index.html` or `candidate/index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari).
- Data bundles and styles are self-contained in `dataset.js` and `style.css`.
- Fully functional without web servers, external APIs, or Node.js dependencies.

### Option B: Local Web Server
Run Python's built-in HTTP server from the project directory:
```bash
# From workspace root
python -m http.server 8080
```
Then navigate to: **`http://localhost:8080/candidate/app/index.html`**

---

## 2. Replay Procedure & Data Contract Reproduction

The application embeds an automated **Replay & Audit Lab** accessible from the sidebar (`#page-replay`). You can execute the entire contract test suite automatically or step-by-step:

| Step | Action | Expected Behaviour & Verification |
|---|---|---|
| **1. Initial Import** | Click `1. Import Initial (Rev 1)` | Ingests `data/01_initial.json`. Result: exactly **44 unique records** (30 calls, 14 meetings) with **17 usable transcripts**. Coverage is 38.6%. |
| **2. Repeat Shuffled** | Click `2. Repeat Shuffled (Rev 1)` | Re-imports the initial batch with reverse array order. Deduplication key `(source_type, source_id)` ensures **total records strictly remains 44**. Zero duplicates created. |
| **3. Manual Override** | Click `3. Override M07 Route` | Sets meeting M07 route to `customer_escalation` with audit note: *"Manager override: 4 severe UI bugs demonstrated during customer screen-share session."* |
| **4. Ingest Update** | Click `4. Import Update (Rev 2)` | Ingests `data/02_update.json`. Meeting M07 receives 27 turns, expanding usable transcripts from 17 to **18 (40.9% coverage)**. M07's manual route (`customer_escalation`) **remains in effect**! Total unique records stays 44. |
| **5. Re-import Initial** | Click `5. Re-import Initial (Rev 1)` | Older Revision 1 delivery arrives again. The engine enforces revision precedence: **M07 remains on Revision 2** with 27 turns. Revision 1 does not overwrite Revision 2. |
| **6. Verify Persistence** | Click `6. Verify Persistence` or refresh browser | State is reloaded from `localStorage`. The 44 records, Revision 2 payloads, and M07 manual override survive completely intact. |

*Automated CLI Verification:* Run `python candidate/test_app.py` in your terminal to execute the automated Python test suite asserting 100% contract compliance across all 4 suites.

---

## 3. Metric Formulations & Calculations

All headline metrics are calculated dynamically from the currently applied source records:

1. **Total Unique Records (44):** Count of distinct `(source_type, source_id)` pairs. 30 calls and 14 meetings.
2. **Transcript Coverage (40.9% post-update, 38.6% initial):** Count of records with usable text (non-blank call transcript or at least one meeting turn) divided by total selected records ($18 / 44 = 40.909\%$).
3. **Source-Reported Connected-Call Rate (36.7%):** Calls where `is_connected === true` (11) divided by calls with non-null `is_connected` (30). Unknown count is explicitly reported as 0.  
   *Analytical Guardrail:* This is an upstream stored classification metric. It is strictly separated from transcript-derived findings.
4. **Records Requiring Review (0 baseline post-review):** Count of records where `route === 'needs_review'`, or `reviewed !== true`, or where late source updates introduced stale analysis.
5. **Missing Transcript Count (26 post-update, 27 initial):** 20 background calls (voicemail/unresponsive) and 6 silent/cancelled meetings. Never analyzed with fabricated conversation claims.

---

## 4. Pre-Generated vs. Dynamic Runtime Processing

- **Dynamic Operations (Computed at Runtime in Browser):**
  - Deduplication and composite identity mapping `(source_type, source_id)`.
  - Revision precedence checking and payload replacement.
  - Manual override state management and localStorage persistence.
  - Multi-parameter filtering, text search across transcripts and metadata, and column sorting.
  - Real-time metric calculations, route distribution counts, and Chart.js visualizations.
  - Dynamic export manifest compilation (JSON and CSV).
- **Pre-Generated Analysis (Audited Ground Truth):**
  - Detailed semantic extraction for the 18 transcript conversations (main topic, customer objections, explicit commitments, potential risks, and verbatim quotes) was pre-structured in `candidate/app/data/analysis_data.json` and `candidate/app/dataset.js`.
  - The Manager Daily Brief for 21 August 2026 is fixed to that date and pre-generated to provide executive coaching and risk escalation without depending on cloud LLM APIs.

---

## 5. Three Key Findings Supported by Source Evidence

### Finding 1: LedgerBridge (M02) is a Vendor Evaluation, Not a Sales Opportunity
- **Source Citation:** Meeting M02, Turn 2 (`Supplier A: "Then I will cover the market strategy as well as the technical integration..."`) and Turn 31 (`Supplier A: "The basic setup begins at EUR 2,600; a more supported implementation starts at EUR 6,500..."`).
- **Product Impact:** Influenced the taxonomy design by introducing the `vendor_supplier` route. In the Inbox and Overview, M02 is classified as a supplier evaluation for e-invoicing compliance middleware. This prevents inflating sales pipeline quotas with internal procurement expenses.

### Finding 2: Willowfield Trust (M07) Revealed 4 Severe Product Defects
- **Source Citation:** Meeting M07, Turns 3, 8, 19, 21 (`Customer A: "When I use Mark as paid, the first payment shows INR 18,200... The amount from the previous item appears in the next one."`).
- **Product Impact:** Arriving in the Revision 2 update delivery, M07 demonstrated four reproducible UI bugs: description edit failing to persist, file upload failing on Recreate Payment, reimbursements stuck in Processing, and modal state bleeding on Mark as Paid. In the application, this triggered an immediate `Customer Escalation` banner, flagged the record as `Source Updated (Rev 2)`, and prioritized engineering bug creation in the Daily Brief.

### Finding 3: Internal Operations Training (M10) Identified via Speaker Topology
- **Source Citation:** Meeting M10, Turn 4 (`Team member B: "I have access to a demo account... but not back-office super-admin access."`) and Turn 5 (`Team member A: "Operations uses it to create accounts, control enabled features and manage billing."`).
- **Product Impact:** Speaker topology detection verified all participants are SpendNest team members (`Team member A, B, C`). Classified as `internal` training regarding the 10-day billing deduction and account freeze cycle. Kept out of sales coaching and customer health queues.

---

## 6. Deliberately Rejected Product Decision

### Decision Rejected: Synthetic Pipeline Valuation via Keyword Extraction
- **Alternative Considered:** Parsing numeric currency amounts mentioned in transcripts and aggregating them into a headline "Pipeline Value ($)" metric on the dashboard.
- **Why Rejected:** Spoken currency amounts in this dataset reflect customer operational costs or external banking relationships—**not SpendNest contract revenues**. For example, M03 discusses an internal travel reimbursement pool of INR 10–13 lakh, M04 references an existing credit line of INR 1.3 crore with their external bank, and M06 cites a customer invoice of INR 1.3 lakh. Summing these figures manufactures a fictitious multi-crore sales pipeline that would deceive executives.
- **Accepted Trade-off:** We deliberately omitted aggregate currency pipeline totals. Instead, we display grounded qualitative deal indicators: module interest (cards vs reimbursements vs AP), agreed next steps, and verified customer decision-makers.

---

## 7. Export Files & Manifest Verification

All active exports are generated inside `candidate/exports/` and cataloged in `candidate/exports/manifest.json` and `candidate/exports/manifest.csv`:
```
exports/
├── calls/
│   ├── C01_call_summary.md ... C10_call_summary.md (10 files)
├── meetings/
│   ├── M01_harborpath_advisory.md ... M10_billing_workflow_walkthrough.md (8 files)
├── daily_brief/
│   └── daily_brief_2026-08-21.md
├── unprocessed/
│   ├── B01_metadata_only.json ... M14_metadata_only.json (26 files)
├── manifest.json
└── manifest.csv
```
Every active path listed in `manifest.json` and `manifest.csv` is verified to exist on disk (verified by `test_04_manifest_integrity` in `test_app.py`).

---

## 8. Development Hours, Known Limitations & Unfinished Work

- **Approximate Development Time:** ~7.5 hours (Data contract inspection: 1.5h; UI & architecture implementation: 3h; Replay & export test suite: 1.5h; College event plan & video script: 1.5h).
- **Known Limitations:**
  1. *Temporal Breadth:* All 44 interactions occur on a single calendar day (21 August 2026). Longitudinal weekly performance trends cannot be extrapolated without additional batches.
  2. *Background Call Visibility:* 20 calls lack transcripts due to upstream delivery redaction; they are classified based on metadata without conversational NLP.
  3. *Staff Directory Absence:* Rep roles are inferred from call direction and meeting descriptions rather than an authoritative HR directory.
- **Unfinished Work:**
  - Bi-directional CRM webhook integration to automatically push manual overrides to Salesforce/HubSpot.
  - Native client-side WebGPU Small Language Model (e.g. Gemma 2B) for conversational Q&A over local transcripts.
