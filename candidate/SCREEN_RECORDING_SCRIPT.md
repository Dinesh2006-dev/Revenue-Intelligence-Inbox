# Three-Minute Narrated Screen Recording Script & Recording Checklist

**Project:** SpendNest Revenue Intelligence Inbox  
**Role:** Sales Manager & Quality Evaluator  
**Target Duration:** Exactly 3 Minutes (180 Seconds)  
**Narration Style:** Natural, professional, clear, and confident  

> [!IMPORTANT]
> **Recording Notice:** This document is the spoken script and recording guide. Per assignment instructions, no pretense of a video file is made; you must perform the recording following the checklist below.

---

## 1. Pre-Recording Preparation Checklist

Before hitting record on OBS, Loom, or Windows Game Bar (`Win + G`):
- [ ] Open browser at `http://localhost:8080/candidate/app/index.html` (or open `candidate/app/index.html` directly).
- [ ] Ensure browser is at 100% zoom with full window visibility (1920x1080 recommended).
- [ ] Click `Reset` in top-right corner to ensure state is fresh and ready for demonstration.
- [ ] Close extraneous browser tabs and silence notifications.
- [ ] Check microphone audio levels for clear spoken voice capture (spoken narration is required by the assignment).

---

## 2. Timed Spoken Narration Script (0:00 – 3:00)

### Segment 1: Executive Overview & Manager Workflow (0:00 – 0:50)

| Timestamp | On-Screen Action | Spoken Narration (Speak naturally) |
|---|---|---|
| **0:00 – 0:15** | Start on the **Overview Dashboard** (`#overview-page`). Mouse hovers over the headline metric cards: 44 Unique Records, 40.9% Transcript Coverage, and 36.7% Connected-Call Rate. | *"Hello. In this demonstration, I'm walking through the Revenue Intelligence Inbox built for a sales manager at SpendNest. On our executive overview dashboard, every headline metric is calculated directly from applied source records. We have 44 unique interactions—30 calls and 14 meetings—with 40.9% usable transcript coverage. Notice our source-reported connected-call rate is 36.7%, reflecting exactly 11 connected calls out of 30 reported calls, with zero unknown."* |
| **0:15 – 0:35** | Click on **Conversation Inbox** in the sidebar. Scroll slightly down the table to show badge indicators: Calls vs Meetings, Transcript vs No-Text, and Active Routes. | *"Moving into the Conversation Inbox, we provide a unified workspace. Unlike upstream systems that conflate notes and outcomes, our inbox clearly distinguishes calls from calendar meetings, and highlights whether verified conversation text is available. A call without a transcript is never analyzed with fabricated claims."* |
| **0:35 – 0:50** | Click on filter dropdown: select **Sales Opportunity**. Click on meeting **M01: Harborpath Advisory**. Switch to the **Transcript** tab, highlighting Turn 9 and Turn 12. | *"For example, filtering for Sales Opportunities, we open meeting M01 with Harborpath Advisory. In the detail panel, our rule engine extracts the exact discussion topics, commitments, and verifiable citations. In Turn 12, Partner A explicitly commits: 'No, let us get the partner onboarding started', agreeing to a 260-dollar activation bonus. Every recommendation is anchored directly in source text."* |

---

### Segment 2: One Difficult Routing Decision & Evidence Inspection (0:50 – 1:40)

| Timestamp | On-Screen Action | Spoken Narration |
|---|---|---|
| **0:50 – 1:15** | Reset filters to 'All Routes'. In the search bar, type `M04` or `Cedarwave`. Click on meeting **M04: Cedarwave Distribution**. | *"Now, let's examine a difficult routing decision: meeting M04 with Cedarwave Distribution. An automated system might naively classify this as a standard sales migration or demo. However, inspecting the transcript turns reveals critical tension: Cedarwave is an existing customer suffering physical card rejection in stores. In Turn 11, Customer A states: 'moving from prepaid to credit is the main issue for us'. Furthermore, Customer B reveals in Turn 22 that they already hold an external corporate credit line of 1.3 crore rupees."* |
| **1:15 – 1:40** | Highlight Turn 26 in the transcript tab, then switch to the **Analysis** tab. Point out the suggested route: `Customer Concern / Retention Risk`. | *"The rep is attempting to sell another prepaid program while the customer urgently requires credit card integration and help untangling a broken department hierarchy. Because customer churn is the primary danger here, we deliberately rejected a 'Sales Opportunity' route and classified M04 as 'Customer Concern / Retention Risk' with an action item to investigate bank credit statement feeds. This protects the account from being mishandled as an ordinary upsell."* |

---

### Segment 3: Duplicate Import & Update Test with Preserved Manual Override (1:40 – 2:50)

| Timestamp | On-Screen Action | Spoken Narration |
|---|---|---|
| **1:40 – 1:55** | Navigate to **Replay & Audit Lab** in the sidebar. Point to the Replay Execution Controls. | *"Next, we demonstrate our automated Data Contract Replay Suite. The assignment requires strict deduplication on the composite key (source_type, source_id), revision precedence, and the preservation of manual overrides across source updates and application restarts."* |
| **1:55 – 2:15** | Click **Step 1: Import Initial (Rev 1)**, then click **Step 2: Repeat Shuffled (Rev 1)**. Point out the terminal log showing `Total unique records remained 44. Zero duplicates created.` | *"First, we import the initial delivery—44 records are created, with 17 usable transcripts. Second, we re-import the exact same batch in reverse order. The log confirms: 44 records processed, 44 skipped, and the total unique records remains strictly 44. Deduplication is 100% idempotent; repeated deliveries never inflate sales activity."* |
| **2:15 – 2:35** | Click **Step 3: Override M07 Route**. Then click **Step 4: Import Update (Rev 2)**. Point to the terminal output. | *"In Step 3, we manually change meeting M07's route to 'Customer Escalation' and record an audit note. In Step 4, we import the update delivery, which carries M07 at Revision 2. Look at the log: M07 is updated, receiving 27 brand-new transcript turns, expanding total usable texts from 17 to 18. Crucially, our manual override—'Customer Escalation'—remains fully in effect! The source payload updated, but our human decision was not erased."* |
| **2:35 – 2:50** | Click **Step 5: Re-import Initial (Rev 1)**, then click **Step 6: Verify Persistence**. Point to `ALL CONTRACT TESTS PASSED (6/6)`. | *"In Step 5, we re-import the older Revision 1 batch. The contract rule holds: older revisions are ignored, and M07 stays on Revision 2. In Step 6, we simulate an application restart from LocalStorage. The state, metrics, and manual decisions survive completely intact. All six contract tests pass."* |

---

### Segment 4: Export Generation & Conclusion (2:50 – 3:00)

| Timestamp | On-Screen Action | Spoken Narration |
|---|---|---|
| **2:50 – 3:00** | Click on **Export & Manifest** in sidebar. Point to the manifest preview showing relative paths and click **Download Manifest (JSON)**. | *"Finally, our Export Management section generates organized markdown folders for calls and meetings, alongside machine-readable JSON and CSV manifests where every single active path exists on disk. Thank you."* |

---

## 3. Post-Recording Quality Verification

Before submitting the recording:
1. Confirm video duration is between **2:45 and 3:15**.
2. Verify audio clarity: voice is easily audible and synchronized with mouse actions.
3. Ensure no private API keys or personal folders are displayed.
4. Save the video file as `spendnest_revenue_inbox_walkthrough.mp4` or upload to an unlisted YouTube/Drive link.
