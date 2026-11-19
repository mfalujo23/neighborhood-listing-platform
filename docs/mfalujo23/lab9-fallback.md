# Voice error fallback

`POST /api/webhooks/voice` returns the following `text/xml; charset=utf-8` response when a signed, valid voice request cannot be processed because its event store fails, its hosted durable store is not configured, its optional SMS adapter is unavailable, or an internal processing operation throws:

```xml
<?xml version="1.0" encoding="UTF-8"?><Response><Say>We are temporarily unavailable. Please try again later.</Say><Hangup/></Response>
```

HTTP 200 acknowledges delivery of these voice instructions. It does not mean the request was accepted into the application, recorded successfully, or sent as an SMS. The message includes no caller data, project-name interpolation, exception text, transfer destination, or success claim. `processing_unavailable` is logged with a masked phone suffix. The handler returns immediately: it does not bypass the durable-store requirement or continue with an SMS. After an ambiguous send failure, the existing event claim is retained, so a provider retry cannot cause a second send attempt.

This deliberately replaces the earlier HTTP 503 processing response. Twilio documents non-2xx webhook results as a possible HTTP retrieval failure (11200); valid TwiML lets the voice engine read a message and hang up. The tradeoff is that this response does not request a transport-level 503 retry. Application monitoring must use `processing_unavailable`, not HTTP status alone, to detect the failure. Requests with invalid signatures, invalid fields, unsupported methods/content types, or oversized bodies retain their existing rejection statuses.

- [Twilio HTTP retrieval failure 11200](https://www.twilio.com/docs/api/errors/11200)
- [Voice TwiML, Say and Hangup](https://www.twilio.com/docs/voice/twiml)

## Evidence

`tests/webhook.test.js` checks generic fallback XML, safe logging, no storage/SMS side effects after an unavailable store, unavailable SMS-adapter behavior, retention of a claim after ambiguous delivery failure, hosted durable-store enforcement, and rejection before processing when the signature is invalid.

`node scripts/verify-voice-fallback-http.mjs` runs the built Next.js route against a fictional loopback PostgREST server that deliberately exceeds the production adapter's five-second timeout. It also restarts the route with outbound SMS enabled and no adapter, then verifies that this branch stops before claiming an event. Raw responses and minimal server logs are in `evidence/lab9-fallback/http-results.json` and `http-server.log`. The script checks unchanged 403/400/405/413/415 rejections and confirms those rejected requests never reach the local store transport.

The local PostgreSQL evidence applies the exact unchanged telephony migration and checks a first claim, an atomic duplicate-key rejection, a different CallSid, denied anonymous/authenticated inserts, and phone/identifier constraints. It uses direct local PostgreSQL, not hosted Supabase Auth or PostgREST. Logging evidence uses fictional input and verifies that full phone numbers, transcript text, recording URLs and the authentication token are absent from the stored event and logs.

No live Twilio/Vapi call, carrier playback, real SMS, or hosted durable-store execution is established by these local checks.
