# Meeting Summary: M07 — Willowfield Trust / SpendNest discussion
- **Source Type:** meeting
- **Source ID:** `4f304fff-fd40-5cfc-a366-0a134c445c2a`
- **Applied Revision:** 2
- **Organizer:** team09@example.com
- **Scheduled Time:** 2026-08-21T05:30:00Z to 2026-08-21T06:30:00Z
- **Recorded Duration:** 1236s
- **Turn Count:** 27 turns
- **Assigned Route:** `customer_escalation` (Manual Override)
- **Confidence:** Critical / Very High (98%)

---

## 1. Executive Analysis
- **Main Discussion Topic:** Willowfield Trust live screen-share bug reproduction: 4 major application defects
- **Customer Sentiment & Objections:** Highly concerned and patient while demonstrating 4 distinct product defects on live screen share.
- **Explicit Commitments & Next Steps:** Team member A committed to raise screenshots and bug reports with engineering and update customer within 1-2 hours on stuck payments.
- **Potential Risks & Uncertainties:** Major UX flaws affecting payment workflows, data integrity, and duplicate work; severe churn risk if unresolved.
- **Follow-up Requirements:** CRITICAL: Log 4 engineering tickets; deliver status update to Customer A within 2 hours regarding stuck payments.

---

## 2. Supporting Evidence & Verifiable Citations

- **Turn 3 [Team member A @ 00:11:16]:** "The field still shows the earlier wording. So the change is not appearing after you save, is that right? (Bug 1: Description edit fails to save)."

- **Turn 8 [Customer A @ 00:12:25]:** "When I go through this route [Recreate payment], I cannot upload a document. (Bug 2: Document upload broken on Recreate Payment screen)."

- **Turn 19 [Team member A @ 00:15:37]:** "The payments appear to have been released but are stuck showing Processing. I have asked the team to look at these. I expect an update or resolution in an hour or two... (Bug 3: Reimbursements stuck in Processing)."

- **Turn 21 [Customer A @ 00:16:27]:** "When I use Mark as paid, the first payment shows INR 18,200. I enter the amount I need and save... The amount from the previous item appears in the next one. (Bug 4: Stale state retention on Mark as Paid modal)."

---

## 3. Transcript Excerpts

**Turn 516.4732 | 00:08:36 | Team member A:**
I wanted to go through the issues you sent yesterday. If you share your screen, we can look at what is happening and I can take the details back to the team.

**Turn 599.613 | 00:09:59 | Customer A:**
The first one is editing the description. I am changing this event-payment description to a short reference and clicking Save changes. Now look at the displayed description again.

**Turn 676.8065 | 00:11:16 | Team member A:**
The field still shows the earlier wording. So the change is not appearing after you save, is that right?

**Turn 691.549 | 00:11:31 | Customer A:**
Yes, it is still the old description. That is why I sent it across.

**Turn 693.0225 | 00:11:33 | Team member A:**
Please reopen Edit. I want to see whether the editing form has the new value while the other screen still has the old one.

**Turn 707.2065 | 00:11:47 | Customer A:**
I will change it again to a different reference and save. It is saved now; let us check the other screen once more.

**Turn 728.6505 | 00:12:08 | Team member A:**
I have captured screenshots of that behaviour. I will get it checked today. I do not have an explanation for it yet.

**Turn 745.8677 | 00:12:25 | Customer A:**
Next is Recreate payment. Can we look at that here? When I go through this route, I cannot upload a document.

**Turn 759.5937 | 00:12:39 | Team member A:**
A new attachment is not being accepted on this screen? First click Save changes at the bottom, before creating the bill, so we can check the alternative path.

**Turn 779.99365 | 00:12:59 | Customer A:**
Saved. I have gone into Bill pay and then the invoice inbox. Now I am opening the Review option.

**Turn 802.0685 | 00:13:22 | Team member A:**
Try attaching the invoice here. I am checking whether the upload itself fails or whether it is specifically the screen reached from Recreate payment.

**Turn 818.2117 | 00:13:38 | Customer A:**
It uploads here. This route works, so it is not that I cannot attach a file anywhere.

**Turn 820.5005 | 00:13:40 | Team member A:**
Please also check Manage documents for adding another attachment. While the team investigates the direct route, the workaround is to save the changes, return to the invoice inbox, open Review and upload the document there.

**Turn 893.08167 | 00:14:53 | Customer A:**
Okay, we have an alternative for now. It is still extra steps compared with doing it directly when recreating the payment.

**Turn 894.9881 | 00:14:54 | Team member A:**
Yes. I will still raise the original behaviour with the team. The workaround does not mean the direct upload issue has been resolved.

**Turn 901.9721 | 00:15:01 | Customer A:**
The next issue is in reimbursements. I cannot select the first group of transactions on this screen.

**Turn 910.64966 | 00:15:10 | Team member A:**
Those payments are already in Processing, which is why selection is disabled. Is this only for one user, or are others seeing the same thing?

**Turn 931.8617 | 00:15:31 | Customer A:**
It happened for another user too, though that instance was resolved later. This set is still in the same state.

**Turn 937.2701 | 00:15:37 | Team member A:**
The payments appear to have been released but are stuck showing Processing. I have asked the team to look at these. I expect an update or resolution in an hour or two, and I will inform you when they confirm.

**Turn 983.60645 | 00:16:23 | Customer A:**
There is one more problem. It was not in the original list, but I can show it now while we are here.

**Turn 987.5264 | 00:16:27 | Customer A:**
When I use Mark as paid, the first payment shows INR 18,200. I enter the amount I need and save that payment. Then I open the next payment and choose Mark as paid again.

**Turn 1053.8384 | 00:17:33 | Customer A:**
The amount from the previous item appears in the next one. Each time I have to cancel, leave it and open Mark as paid again before it shows the right information.

**Turn 1070.6229 | 00:17:50 | Team member A:**
Let me confirm: it is retaining the previous amount rather than fetching the next payment's value. It should refresh when the next item opens, but that is not what we are seeing.

**Turn 1075.1364 | 00:17:55 | Customer A:**
Yes, the old value carries forward. So I end up doing the same action twice for each item.

**Turn 1087.959 | 00:18:07 | Team member A:**
I understand the sequence now. I will report that separately as well, with the steps you showed, and ask the team to investigate the refresh behaviour.

**Turn 1096.6953 | 00:18:16 | Customer A:**
Those are the current issues. The attachment workaround helps, but we still need the other items checked.

**Turn 1099.657 | 00:18:19 | Team member A:**
I will send the details to the team, get their confirmation and come back to you. Thank you for showing the actual steps rather than only the final screen.
