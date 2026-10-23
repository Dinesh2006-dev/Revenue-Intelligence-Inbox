# Meeting Summary: M04 — Cedarwave Distribution / SpendNest discussion
- **Source Type:** meeting
- **Source ID:** `b0f79b3d-37ba-52f9-b2bc-58b159dd6d91`
- **Applied Revision:** 1
- **Organizer:** team09@example.com
- **Scheduled Time:** 2026-08-21T09:00:00Z to 2026-08-21T09:30:00Z
- **Recorded Duration:** 1985s
- **Turn Count:** 32 turns
- **Assigned Route:** `customer_concern` (Automated Rule)
- **Confidence:** High (90%)

---

## 1. Executive Analysis
- **Main Discussion Topic:** Cedarwave Distribution card migration, physical card acceptance, and credit integration
- **Customer Sentiment & Objections:** Frustrated with current prepaid card acceptance; demanding credit card integration for INR 1.3 crore bank credit line.
- **Explicit Commitments & Next Steps:** Team member A to investigate eligibility of customer's existing bank credit cards for SpendNest statement transaction feed.
- **Potential Risks & Uncertainties:** Customer churn risk if migration does not support credit facility; user re-KYC friction; department hierarchy confusion.
- **Follow-up Requirements:** Check bank card-feed technical feasibility; schedule dedicated admin support session to reorganize confused user department structure.

---

## 2. Supporting Evidence & Verifiable Citations

- **Turn 2 [Team member A @ 00:01:30]:** "Much of your usage is physical-card spending. We have seen acceptance problems with the existing programme and are proposing a move to a different provider and card network."

- **Turn 11 [Customer A @ 00:07:17]:** "Okay, I have confirmed it: moving from prepaid to credit is the main issue for us. At some stage we will have to consider another option for that."

- **Turn 22 [Customer B @ 00:24:32]:** "We already have a corporate credit line of about INR 1.3 crore. Cards are issued to only a few people so far. We were waiting for the bank administration portal before attempting the accounting integration."

---

## 3. Transcript Excerpts

**Turn 51.422813 | 00:00:51 | Team member A:**
I wanted to discuss the migration while there is still time to plan it. We should cover the present situation, the next steps and any feedback from your side.

**Turn 90.72081 | 00:01:30 | Team member A:**
Much of your usage is physical-card spending. We have seen acceptance problems with the existing programme and are proposing a move to a different provider and card network. We already operate that alternative programme, including a wallet-payment option.

**Turn 197.5499 | 00:03:17 | Customer A:**
I thought the wallet-payment option was coming to our existing cards too. Is that not what was being discussed?

**Turn 203.1708 | 00:03:23 | Team member A:**
It is not available on the current network in this arrangement. The programme we are moving to supports it. The plan is to close the old programme in the coming weeks, so we need to organise the transition.

**Turn 273.6032 | 00:04:33 | Customer A:**
Does that mean the current physical cards and virtual cards will both stop working?

**Turn 278.45682 | 00:04:38 | Team member A:**
Yes, under that programme. Users need to complete identity checks again because the provider changes. We can create the new account in parallel so you do not need to shut the current cards before starting the setup.

**Turn 344.56024 | 00:05:44 | Customer A:**
Before we do all that, there was another problem: connecting this application with our people and expense system. We did not think that integration was possible.

**Turn 367.09482 | 00:06:07 | Team member A:**
We do have integration support. Let us clarify which part you need rather than assume the whole connection is unavailable.

**Turn 372.35223 | 00:06:12 | Customer A:**
Also, will the replacement be a proper credit card? We do not really want another prepaid arrangement indefinitely.

**Turn 381.41483 | 00:06:21 | Team member A:**
The replacement I described is still prepaid. I do not want to promise that this becomes a credit card in the near term.

**Turn 437.49622 | 00:07:17 | Customer A:**
Give me a moment to check internally. Okay, I have confirmed it: moving from prepaid to credit is the main issue for us. At some stage we will have to consider another option for that.

**Turn 596.8395 | 00:09:56 | Team member A:**
My view is that the expense-platform alternatives still depend on banks for credit. Some alternatives are considerably more expensive. We have a bank partnership for corporate credit cards, subject to the bank's assessment. That is different from us changing the prepaid product into credit.

**Turn 742.03595 | 00:12:22 | Customer A:**
We have been trying through our existing bank. Perhaps we get credit cards for around 26 people and keep SpendNest prepaid cards for the others.

**Turn 759.4221 | 00:12:39 | Team member A:**
We passed the earlier enquiry to the bank, but it was put on hold from your side. We can revisit it. The bank has spending and turnover criteria. The software layer can provide transaction visibility, receipts and review if the supported cards are connected.

**Turn 826.074 | 00:13:46 | Customer A:**
To be clear, that bank option would actually be credit, with us paying the bank separately, while the other employees could remain prepaid?

**Turn 829.0521 | 00:13:49 | Team member A:**
Yes, that is the distinction. Both types could be visible in the same workspace, although the control and funding arrangements are different.

**Turn 894.3586 | 00:14:54 | Customer A:**
Let me bring in someone from our credit team. They know what is already in place and can help decide whether this is worth progressing.

**Turn 1070.516 | 00:17:50 | Customer A:**
We are discussing the planned card migration. The replacement is still prepaid, but there may be a way to connect our bank-issued credit cards to the SpendNest application.

**Turn 1134.2886 | 00:18:54 | Team member A:**
The bank issues and controls the credit. After the relevant agreement and network consent, transaction details can come into our platform after settlement. Users can then attach receipts and send items for review. It is not the same as our real-time prepaid feed.

**Turn 1444.6035 | 00:24:04 | Customer A:**
Can those transactions also sync into our accounting system? That was part of the problem before.

**Turn 1448.5846 | 00:24:08 | Team member A:**
Many transaction fields can sync, but source-balance reconciliation is a question in this setup. I need the team to confirm feasibility for your bank-card transactions rather than say the existing prepaid integration automatically covers it.

**Turn 1472.6356 | 00:24:32 | Customer B:**
We already have a corporate credit line of about INR 1.3 crore. Cards are issued to only a few people so far. We were waiting for the bank administration portal before attempting the accounting integration. If your platform can sit in between, we should understand that route.

**Turn 1544.6288 | 00:25:44 | Team member A:**
I will check whether your already-issued cards can join the transaction-feed programme. If that is possible, the next steps are the agreement, network approval and linking the cards to users. I cannot confirm the existing-card eligibility on this call.

**Turn 1628.8208 | 00:27:08 | Customer B:**
Would it show our available credit limit as well as the transactions? We need to know what is available to spend.

**Turn 1631.7168 | 00:27:11 | Team member A:**
No, the proposed feed shows transaction details after settlement. The bank retains that control, so the available limit would not be shown here in the way it is for cards we issue.

**Turn 1656.8547 | 00:27:36 | Customer B:**
Then what do we gain by adding SpendNest? We can already see transactions in the bank portal.

**Turn 1668.2108 | 00:27:48 | Team member A:**
The additional layer is collecting receipts and business reasons, reviewing exceptions, attaching project information and reconciling alongside prepaid spending. Accounting integration could add value too, but that specific bank-card path still needs checking.

**Turn 1796.8358 | 00:29:56 | Team member A:**
Please discuss the options internally. We can plan a mix of bank credit cards, prepaid cards or wallet payments, depending on your decision. I will confirm the eligibility and accounting questions with the programme team.

**Turn 1885.1982 | 00:31:25 | Customer A:**
We will speak with the relevant people internally and see whether this is the direction we want. We are not deciding the whole migration on this call.

**Turn 1908.7112 | 00:31:48 | Customer A:**
There is also the earlier issue with moving users between departments. The current department setup has become confusing and needs correcting.

**Turn 1928.7112 | 00:32:08 | Team member A:**
I cannot move those users directly from the assistant view available to me. We can arrange a session to guide you through it and verify which departments and users should move before changing anything.

**Turn 1965.7316 | 00:32:45 | Customer A:**
Okay. I will come back to you on that as well.
