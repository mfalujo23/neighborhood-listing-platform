# Planned provider mapping - not applied or dashboard verified

The local no-cost simulator is implemented at `/voice-simulator`. This document maps its artifacts to a possible future provider configuration. There is **no configured assistant ID, phone number, API credential, model run, STT service, TTS service, or live call** for this work.

| Local source | Intended provider concept | Current status |
| --- | --- | --- |
| `config/mfalujo23-voice-system-prompt.md` | Assistant system message/persona | Versioned locally; no provider import verified |
| `config/mfalujo23-voice-tools.schema.json` | Three named tools and argument schemas | Runtime Zod validation tested locally; provider envelope/subset acceptance pending |
| `src/voice/fixtures.ts` | Approved knowledge source | Fictional fixture only; no real client/instructor approval implied |
| First-message disclosure in provider plan | AI disclosure, fictional-data notice, narrow scope | Planned; no audio or live caller test |
| Mock timeout/provider/human failure paths | Tool error handling and manual escalation | Deterministic local outcomes tested; no actual provider outage test |
| Random correlation ID and event set | Traceable routing and callback deduplication | In-memory simulator only; no live/distributed callback guarantee |
| No follow-up dispatcher | Consent and minimal data boundary | Local validation only; no real contact collected or sent |

## Artifact privacy configuration to verify before any real call

Vapi's current documentation describes artifact settings under `artifactPlan`; its older root recording options are deprecated. The proposed values below are not an API request and have not been applied to a dashboard. [Vapi recording/logging/transcription documentation](https://docs.vapi.ai/assistants/call-recording).

```json
{
  "artifactPlan": {
    "recordingEnabled": false,
    "loggingEnabled": false,
    "pcapEnabled": false,
    "transcriptPlan": { "enabled": false },
    "fullMessageHistoryEnabled": false
  }
}
```

Before claiming external privacy configuration, inspect the selected assistant/call configuration and retention behavior with the instructor/project owner, verify the current supported fields, and capture actual evidence without caller data. This local mock does not prove a provider has stopped retaining audio, messages, or metadata.

The proposed full mapping is in `config/mfalujo23-voice-provider-plan.json`. It deliberately keeps IDs null, provider tests unverified, real telephony disabled, and model-run history empty. No existing teammate provider configuration is replaced.
