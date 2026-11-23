# Michael Falujo — live Vapi tool callback

Current status: [coursework status](../current-status.md). The implementation checks below were local. Later [hosted reproduction](hosted-reproduction.md) records seven public callbacks using sample request envelopes and approved hosted data. [Saved v5 settings](voice-active-config.md) are observed configuration, not real-call evidence.

`POST /api/voice/tools` accepts authenticated Vapi Function-tool messages and performs public approved-data reads. It does not start a phone call, transfer a caller, persist a follow-up, or send SMS.

## Configuration

Set these server-only runtime values through the host's private settings:

- `VAPI_SERVER_TOKEN`: a dedicated32–512character printable token, matching a saved Vapi Bearer credential. It must not contain whitespace.
- `VAPI_ASSISTANT_ID`: the actual saved assistant UUID.
- `SUPABASE_URL`: the actual project's HTTPS origin.
- `SUPABASE_PUBLISHABLE_KEY`: that project's public publishable key. A legacy key is accepted only when its decoded key type is `anon`; privileged key types are rejected.

No values are included here. Missing token/assistant configuration returns503. A configured callback with an unavailable database returns a correlated `UNAVAILABLE` tool error.

Create three synchronous Function tools from [the generated templates](../../config/mfalujo23-vapi-live-tools.json). Replace the URL and saved credential ID, set the actual public HTTPS callback URL, and attach their IDs to the saved assistant. Inspect actual provider schema acceptance before publishing. The proposed [live system prompt](../../config/mfalujo23-vapi-live-system-prompt.md) is separate from the unchanged local simulator prompt.

The schema export is reproducible:

```sh
node --import tsx scripts/export-vapi-live-tools.mts
```

The credential and URL should be saved on Vapi resources. Current Vapi documentation explains that transient request-supplied URLs may have saved credentials withheld. Function tools require a single-line `result` or `error` per `toolCallId`, with HTTP200 for an executed tool's result. Raw Dashboard Test requests differ from a live tool-call envelope. [Server authentication](https://docs.vapi.ai/server-url/server-authentication), [Function tools](https://docs.vapi.ai/tools/custom-tools).

## Implemented boundaries

- Dedicated Bearer authentication uses constant-time comparison of fixed-size SHA256 digests, then validates the configured assistant identity and UUID call context.
- JSON is bounded to16KiB; a batch contains at most8unique tool-call IDs. Unknown tools, extra argument fields, demo identifiers and invalid ZIPs cannot trigger database reads.
- `get_property_details` uses an anonymous public key, fixed narrow projection, exact UUID and `approved=eq.true`; runtime output validation also requires approval and matching identity. Owner/contact fields are never selected. Optional SQL-null descriptions are omitted.
- `get_nearby_sponsors` checks the approved property's ZIP and calls the existing `eligible_sponsors_for_property(uuid,text,text)` RPC with fixed `sidebar` placement. The existing campaign matcher rechecks approval/date/geography and safe destinations. At most3names are returned with a Sponsored disclosure. No price, discount or marketing claim is invented.
- Each actual database fetch has a2500ms abort deadline and64KiB response bound. The internal timeout status504 becomes a Vapi HTTP200 `error` envelope. Missing rows produce `NOT_FOUND`; unavailable/missing RPCs produce `UNAVAILABLE`. Client abort stops waiting; it does not establish that hosted SQL execution was canceled.
- All tools are read-only. `request_agent_followup` validates explicit consent then truthfully returns that transport is unavailable and no request, call or message was sent.
- The callback has no request/transcript/phone/error logging, no provider API key and no privileged database client. Responses use `Cache-Control:no-store`.

## Database prerequisite

The tested fresh core creates properties and exam tables. It does not create `sponsors`, `property_sponsors` or the00500 eligibility RPC. Those actual prerequisites must exist before the sponsor tool can succeed; this change contains no new DDL and applies nothing to a hosted database. The follow-up receipt/dispatch schema and human-contact policy remain unimplemented. The callback cannot be used as a Vapi replacement for the signed Twilio form-to-TwiML route.

Publishable keys use anonymous RLS for these reads. The key is not a signed-in user's identity and must not be replaced by a secret/service-role key. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Verification

Focused tests cover authentication before work, wrong/conflicting assistant identities, strict contracts, private/unexpected database fields, public-key type guards, missing rows/RPCs, body/method limits, actual abort signaling, error translation, batch correlation and unavailable follow-up.

[Local HTTP results](vapi-live-evidence/local-http-results.json) capture actual loopback requests through the callback and a disposable PGlite database under `anon`. The small HTTP bridge emulates only the fixed PostgREST read/RPC wire contract; it is not actual hosted PostgREST. The raw response receipts include internal504, outer200error and two observed aborted connections. It uses local-only Auth stubs and synthetic application fixtures.

```sh
node --conditions=react-server --import tsx scripts/verify-vapi-live-http.mts
```

[Full source-gate output](vapi-live-evidence/full-source-gate-terminal-final.txt) and [gate summary](vapi-live-evidence/source-gates.json) record the final local checks. Hosted Supabase-backed sample callbacks and saved artifact settings were observed separately in the links above. Provider-issued calls, carrier playback/transfers/SMS and end-to-end provider retention behavior remain unverified. Local checks do not establish those outcomes.

[Implementation record](vapi-live-ai-log.md).

