# Voice provider mapping

Current status: [coursework status](../current-status.md). The [saved v5 configuration](voice-active-config.md) and [hosted callback results](hosted-reproduction.md) supersede the original plan below. Recorded real calls remain zero.

The local no-cost simulator is implemented at `/voice-simulator`. The table below preserves the original pre-configuration plan. It does not describe the later saved assistant or prove live speech, carrier or provider-call behavior.

| Local source | Intended provider concept | Original plan status |
| --- | --- | --- |
| `config/mfalujo23-voice-system-prompt.md` | Assistant system message/persona | Versioned locally; no provider import verified |
| `config/mfalujo23-voice-tools.schema.json` | Three named tools and argument schemas | Runtime Zod validation tested locally; provider envelope/subset acceptance pending |
| `src/voice/fixtures.ts` | Approved knowledge source | Fictional fixture only; no real client/instructor approval implied |
| First-message disclosure in provider plan | AI disclosure, fictional-data notice, narrow scope | Planned; no audio or live caller test |
| Mock timeout/provider/human failure paths | Tool error handling and manual escalation | Deterministic local outcomes tested; no actual provider outage test |
| Random correlation ID and event set | Traceable routing and callback deduplication | In-memory simulator only; no live/distributed callback guarantee |
| No follow-up dispatcher | Consent and minimal data boundary | Local validation only; no real contact collected or sent |

## Artifact privacy configuration to verify before any real call

Vapi's current documentation describes artifact settings under `artifactPlan`; its older root recording options are deprecated. The values below are the original proposal, not an API request. Consult the saved v5 export for the settings actually observed. [Vapi recording/logging/transcription documentation](https://docs.vapi.ai/assistants/call-recording).

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

The original mapping remains in `config/mfalujo23-voice-provider-plan.json`, with its placeholder IDs and unverified fields intact. The later redacted active export is linked above; neither record establishes a completed real call.
