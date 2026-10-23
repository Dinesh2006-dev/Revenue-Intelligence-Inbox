# Meeting Summary: M02 — LedgerBridge / SpendNest discussion
- **Source Type:** meeting
- **Source ID:** `1a21c409-c050-5787-90af-2667e057e1b6`
- **Applied Revision:** 1
- **Organizer:** team07@example.com
- **Scheduled Time:** 2026-08-21T11:30:00Z to 2026-08-21T12:00:00Z
- **Recorded Duration:** 3113s
- **Turn Count:** 36 turns
- **Assigned Route:** `vendor_supplier` (Automated Rule)
- **Confidence:** Very High (95%)

---

## 1. Executive Analysis
- **Main Discussion Topic:** LedgerBridge e-invoicing compliance infrastructure evaluation for SpendNest
- **Customer Sentiment & Objections:** Strategic vendor evaluation. SpendNest evaluating LedgerBridge as upstream infrastructure provider.
- **Explicit Commitments & Next Steps:** Supplier A to send volume & country sizing template; SpendNest team to fill received/issued invoice estimates.
- **Potential Risks & Uncertainties:** Setup cost EUR 2,600 to 6,500; Q4 timeline competing with internal roadmap priorities; regional localization complexity.
- **Follow-up Requirements:** Complete volume sizing template with AP usage data; schedule proposal walkthrough with product & finance leadership.

---

## 2. Supporting Evidence & Verifiable Citations

- **Turn 2 [Supplier A @ 00:06:34]:** "Then I will cover the market strategy as well as the technical integration. Are you more interested in generating invoice PDFs or in electronic invoicing through the relevant networks?"

- **Turn 17 [Supplier A @ 00:22:07]:** "I will send a volume template: countries, small versus larger customers, invoices issued and invoices received. That will let us calculate a proposal and the likely cost per customer."

- **Turn 31 [Supplier A @ 00:45:53]:** "The basic setup begins at EUR 2,600; a more supported implementation starts at EUR 6,500, and larger projects are scoped separately."

---

## 3. Transcript Excerpts

**Turn 322.3498 | 00:05:22 | Team member A:**
I work on strategy and partnerships at SpendNest. We serve businesses with cards and accounts payable, and we are developing accounts receivable. We want to understand whether LedgerBridge can give us compliant invoicing coverage across our operating markets. My colleague leads the product side.

**Turn 394.35864 | 00:06:34 | Supplier A:**
Then I will cover the market strategy as well as the technical integration. Are you more interested in generating invoice PDFs or in electronic invoicing through the relevant networks?

**Turn 523.0778 | 00:08:43 | Team member B:**
Electronic invoicing is the bigger opportunity. Customers already have approved invoice layouts. The manual part is taking that information into separate portals, both when issuing and receiving invoices.

**Turn 561.61884 | 00:09:21 | Supplier A:**
That helps narrow the initial markets. We can also support voluntary electronic invoicing before a mandate. Do you already know which customers require that?

**Turn 604.7818 | 00:10:04 | Team member B:**
I would need to check. I do not have a reliable answer on that specific requirement yet.

**Turn 648.0378 | 00:10:48 | Team member B:**
There is also a US reporting use case around certain non-payroll payments. Is that included, or is it a different service?

**Turn 669.69086 | 00:11:09 | Supplier A:**
That is a reporting requirement rather than our standard invoicing flow. We sometimes handle such needs as custom projects. Our core scope is compliant invoicing, so please keep that distinction in mind.

**Turn 750.3336 | 00:12:30 | Team member A:**
We want customers to issue and receive invoices in a compliant way without adding another disconnected platform. With the receivables module coming, this could make the overall product more complete and encourage customers to stay with us.

**Turn 858.2846 | 00:14:18 | Supplier A:**
So this is a strategic product extension. Is there also direct demand, rather than only a positioning idea?

**Turn 874.37366 | 00:14:34 | Team member A:**
Sorry, the connection dropped. Let me repeat the important part. We are seeing larger prospects in our pipeline, and a more complete package could help with those conversations. It is not limited to them, but that is part of the motivation.

**Turn 1048.4388 | 00:17:28 | Supplier A:**
Has management decided to invest in this, or are you still deciding whether the project should exist at all?

**Turn 1064.0331 | 00:17:44 | Team member B:**
The view is that electronic invoicing will become more common. We want to start preparing before requirements force us into a rushed implementation.

**Turn 1135.0283 | 00:18:55 | Team member A:**
We are aiming for the fourth quarter. We would start with Singapore and Australia, then India. We are hoping one integration lets us expand without building the whole thing again.

**Turn 1178.8333 | 00:19:38 | Supplier A:**
And if that fourth-quarter date slips, what happens internally?

**Turn 1196.5812 | 00:19:56 | Team member B:**
There are several projects competing for that quarter. Early next year is possible if the work moves. We intend to build the capability, but I would not describe the quarter as an immovable deadline.

**Turn 1277.82 | 00:21:17 | Team member A:**
We have prospects discussing requirements with us and some willingness to pilot once it is available. This will be a new module, so those conversations are still developing.

**Turn 1327.918 | 00:22:07 | Supplier A:**
I will send a volume template: countries, small versus larger customers, invoices issued and invoices received. That will let us calculate a proposal and the likely cost per customer.

**Turn 1407.2921 | 00:23:27 | Team member A:**
Received invoice volumes can be based on current accounts-payable usage. Issued volumes will be estimates because the receivables product is still being built. We should not present those two columns as equally certain.

**Turn 1533.4471 | 00:25:33 | Supplier A:**
On the demonstration, the same invoice object goes through a sequence of steps. Those steps can create a PDF, create the local electronic format and distribute it. Returned documents and status are available through the API. Country-specific requirements still exist, but the intention is to keep most of your integration consistent.

**Turn 1805.6383 | 00:30:05 | Team member B:**
Where do we learn which fields are required in each region before submitting an invoice? That is the part I want to understand beyond the happy-path demonstration.

**Turn 1824.4725 | 00:30:24 | Supplier A:**
The playground exposes local fields, and we help during integration. You register each end customer and keep its returned connection key. That customer identity and country tell us which localisation to apply when you submit the invoice.

**Turn 1960.5425 | 00:32:40 | Supplier A:**
Some countries also require customer-specific credentials. For others our network connection handles that part. The management dashboard lets you inspect setup, invoices and the transition from testing to production.

**Turn 2049.6265 | 00:34:09 | Team member B:**
Can we receive invoices through the network as well, or is this only the issuing side?

**Turn 2057.0806 | 00:34:17 | Supplier A:**
Receiving is supported too. Enable the relevant incoming channels, then retrieve invoice identifiers and their standardised data using the customer's key. The original documents are available as links. The local document parsing happens on our side.

**Turn 2268.0935 | 00:37:48 | Team member B:**
Will we have a readable PDF preview, or do we need to build one from the raw invoice data ourselves?

**Turn 2292.6245 | 00:38:12 | Supplier A:**
If a PDF is supplied, we expose it. Otherwise we can generate one. We have also standardised different incoming document formats for customers who want a consistent presentation across countries.

**Turn 2416.1575 | 00:40:16 | Supplier A:**
You can try the sandbox using the documentation and an AI coding assistant. Register for a test key first and include the relevant application context. Let me know how the experiment goes.

**Turn 2517.398 | 00:41:57 | Team member A:**
The product direction looks relevant. Commercially, are we paying for actions, invoice volume, countries, customers, or some combination? We need to understand the structure before taking this further.

**Turn 2572.8486 | 00:42:52 | Supplier A:**
There are two models: country licences with transaction usage, or licences per end customer with included usage and volume tiers. We need your numbers before recommending one.

**Turn 2663.1074 | 00:44:23 | Team member A:**
And the commercial relationship is between SpendNest and LedgerBridge? We are providing this to our customers through our product, rather than asking them to buy from you separately.

**Turn 2753.3516 | 00:45:53 | Supplier A:**
Correct. There is also a one-time setup charge. The basic setup begins at EUR 2,600; a more supported implementation starts at EUR 6,500, and larger projects are scoped separately. The initial setup covers the markets together, rather than charging it again for each expansion.

**Turn 2834.1924 | 00:47:14 | Team member A:**
Could you send the proposal before the commercial call? We need to brief management and decide which stakeholders should attend.

**Turn 2865.7515 | 00:47:45 | Supplier A:**
I prefer walking through the proposal. If people only receive a pricing page, they may miss the value and the differences between the two models.

**Turn 2913.9736 | 00:48:33 | Team member A:**
Our evaluation goes through product fit, the business reason, commercials, then references and support checks. Written pricing helps us follow that process internally. I understand your concern, but we still need to take the numbers back.

**Turn 3029.969 | 00:50:29 | Supplier A:**
Let us have a short explanation call after you complete the template. You can capture the details for your management discussion, and we can decide who needs to join the next conversation.

**Turn 3084.221 | 00:51:24 | Supplier A:**
I will send the template shortly so we can get that started.
