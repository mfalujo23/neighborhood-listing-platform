# Voice runbook

`/voice-simulator` is a deterministic text demonstration with fictional facts,
consent validation, duplicate handling and controlled failures. It does not make
calls, send messages or record a participant.

`/api/voice/tools` is the protected Vapi HTTP callback. Configure the actual
assistant ID and dedicated server credential privately. It validates the
assistant and strict UUID/ZIP arguments before approved property/sponsor reads.
Missing human follow-up transport returns unavailable, with no submitted
request, call or message. Seven public synthetic requests passed; they are not
provider-issued call or carrier-delivery evidence.

The optional `/api/webhooks/voice` validates the exact URL/signature and uses
durable duplicate protection when hosted. Keep outbound SMS disabled unless a
real approved sender and consented transport are verified. Processing failure
returns generic unavailable TwiML; it must not be reported as business success.

See [callback setup and limits](mfalujo23/vapi-live-callback.md),
[actual hosted results](mfalujo23/hosted-evidence/index.json) and
[operations](operations-runbook.md). Provider account settings and retention
must be checked separately; a saved tool is not a completed call test.

[Saved active configuration and mapping](mfalujo23/voice-active-config.md).
