# Lab 14 event dictionary and decision metrics

Mode: the public `/dashboard-demo` is deterministic fictional text/data with volatile browser memory. The separate protected server API is default-off. No real participant, call, transcript, recording, phone number or provider timing is supplied by this implementation.

## Decisions before visualizations

Use CTR to decide whether a placement warrants investigation; successful-inquiry and escalation rates to identify a voice-flow problem; the timeout/fallback rate to investigate reliability; inquiry conversion to inspect whether listing information supports the next task; and measured latency adherence to investigate a slow voice pipeline. These observations do not establish causation, revenue, unique people or campaign profitability. A daily count bar chart supports comparing coarse volume between days; its accessible table supplies exactly the same values. The later [ChatGPT/Gemini comparison](lab14-model-comparison.md) selects an inquiry-flow count chart as a next design to evaluate. The existing daily chart/table is unchanged. No user preference is claimed.

## Common fields and event purposes

All events require a UUID `eventId`, ISO timestamp with an explicit offset, UUID property ID, short-lived UUID correlation ID, controlled `source`, controlled name and strict event-specific properties. All unknown top-level and property fields are rejected by Zod. Properties are normalized into named PostgreSQL columns; no free-form JSON/text storage is provided. The common timestamp is normalized to UTC on persistence.

| Event | Allowed properties | Purpose |
|---|---|---|
| listing_view | empty object | Count a property visit opportunity within a short-lived session. |
| filter_used | filter: zip / price / bedrooms | Identify which filter category is used; the typed search value is not collected. |
| sponsor_impression | bounded sponsorId, ZIP5 neighborhood | Denominator of matched impression opportunities; no location more precise than property context is added. |
| sponsor_click | impressionId | Link a click to its approved opportunity; validate matching property/correlation/source. |
| call_started | empty object | Start a property/correlation session cohort. |
| intent_category | property_details / availability / booking / sponsor_info / unknown | Derived coarse inquiry category, without spoken text. |
| tool_success | controlled tool name, success boolean | Measure result success without arguments or returned personal data. |
| escalation | webhook_timeout / fallback_transfer / human_requested / tool_failure / unknown_fact | Understand safe fallback categories. |
| call_completed | resolved / unresolved / abandoned; optional supplied pipelineLatencyMs, integer 0–60000 | Completion proxy and explicitly sourced end-to-end latency sample. Missing latency remains missing. |

`source=fixture` is fictional teaching data. `source=provider_measured` is reserved for a separately verified trusted collector; that collector is not implemented or invoked here. The coursework ingestion endpoint accepts fixture source only, after server authorization, two explicit feature flags and a literal consent choice. The browser demo sends no telemetry requests. A fictional latency value is a supplied fixture number, not a locally measured provider duration.

Prohibited for every event: names, emails, phone numbers, IP/user-agent hashes, addresses, caller identity/CallSid, raw audio, full transcripts, arbitrary quotes, search values, sensitive traits, access tokens and secrets. Correlation IDs are pseudonymous linkage within a short-lived interaction, not proof of anonymization or a stable person identifier.

## Five core metrics

All windows are `[from UTC midnight, midnight after through)`, with optional property scope in a POST body. Aggregation deduplicates event IDs; PostgreSQL uses the event primary key. A changed payload under an existing ID is a conflict. The same event ID never increments counters twice. Rates below three denominator observations are `null` and displayed as “Insufficient data.” Counts and definitions remain visible in this fictional prototype.

| Metric / trigger | Exact numerator / denominator | Grain and deduplication | Access / retention | Decision and limit |
|---|---|---|---|---|
| Sponsor CTR / sponsor_impression + sponsor_click | Distinct in-window impression IDs with ≥1 matching in-window click / distinct in-window impression IDs. A match shares property, correlation and source. | ZIP neighborhood + optional property + UTC window. Multiple click IDs on the same impression count once; unique event IDs prevent retry inflation. | Protected provider sees owned properties; admin sees all; existing legacy property_professional is read-only. Raw events target 30 days, no persisted rollup here. | Inspect placement engagement after enough observations; not revenue or unique-person conversion. |
| Successful inquiry completion / call_started + call_completed + escalation | Started property/correlation sessions with latest completion `resolved` and no escalation / distinct started sessions. | Property + correlation within the selected window; latest completion uses timestamp, then stable event ID. | Same scoped roles / 30-day raw-event design. | Investigate incomplete flows. This is a successful-inquiry proxy, not proven first-call resolution: no caller identity/history is collected. |
| Webhook timeout/fallback / call_started + escalation | Distinct started sessions with webhook_timeout or fallback_transfer / distinct started sessions. | Property + correlation + UTC window; repeated escalation callbacks do not multiply sessions. | Same scoped roles / 30-day raw-event design. | Investigate infrastructure/fallback configuration; controlled fixture categories are not observed provider incidents. |
| Property inquiry conversion / listing_view + intent_category | Distinct property/correlation listing-view sessions with property_details, availability or booking intent / distinct listing-view sessions. | Property + short-lived correlation + UTC window; multiple intent events within one session count once. | Same scoped roles / 30-day raw-event design. | Inspect the transition from listing discovery to an inquiry; not a sale, lead identity or causal attribution. |
| Voice pipeline latency SLA / call_completed | Completed started sessions with supplied latency <1000ms / completed started sessions with latency from the requested source. | Latest completion per property/correlation; missing measurements excluded. Exactly 1000ms fails the strict threshold. | Same scoped roles / 30-day raw-event design. | Investigate verified end-to-end slowness. Public fixture 800/999/1000ms yields 2/3 only as fictional arithmetic; live source has 0 samples and insufficient data. |

Supplemental metrics: call completion = completed started sessions / started sessions; tool success = success=true tool-result events / all tool-result events; escalation = started sessions with any escalation / started sessions. Top inquiry categories count derived intent-category events, not people. Daily volume counts unique events by UTC date.

The window requires both the start/opportunity and its result to appear inside the selected interval. A call completion or click whose start/impression is outside the window does not enter the rate. This defines a same-window cohort and can right-censor late results; it must not be interpreted as final lifetime resolution. Counts can be incomplete at a live window boundary. No financial or caller-level conclusion is justified.

## Actual local fixture output

The 30-event fixture produces CTR 2/4=50%, successful inquiry 2/4=50%, timeout/fallback 1/4=25%, inquiry conversion 3/4=75%, and fictional latency 2/3≈66.7%. The provider-only latency denominator is zero. Exact execution output is in `evidence/dashboard-actual-results.json`. Executed PostgreSQL CTR agrees with the independently computed counts.

The corrected dashboard authorizes canonical `provider` and `admin` profiles, with owner scoping through database RLS. Existing protected `property_professional` profiles retain read-only access; the exact four-role profile contract is unchanged. A user-controlled role header/metadata cannot grant access. Sponsor-client authorization is not implemented. The current [/login and server-managed session flow](session-auth.md) supports the protected dashboard; API routes retain their bearer-token requirement. The dashboard verifies the user and stored profile on the server before reading scoped data. Hosted testing and human UAT are separate evidence.
