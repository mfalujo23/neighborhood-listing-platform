# Saved voice assistant configuration

The redacted [configuration](../../config/mfalujo23-vapi-active-v5.redacted.json) records the actual saved Vapi assistant version **v5**. The Configuration UI was checked on **2026-11-19 at 19:33:15.252 UTC**; the model-field comparison was checked at **19:45:20.059 UTC**. These are observations of saved settings, not call results.

| Saved configuration field | Observed value |
| --- | --- |
| `latestVersion` | `v5` |
| `model.provider` | `openai` |
| `model.model` | `gpt-4.1` |
| `model.messages[0]` | System instruction for a disclosed fictional classroom assistant |
| `model.toolRefs` | Three references, in saved order: `v2`, `v2`, `v3` |
| `maxDurationSeconds` | `120` |
| `artifactPlan.transcriptPlan.enabled` | `false` |
| `artifactPlan.recordingEnabled` | `false` |
| `artifactPlan.loggingEnabled` | `false` |
| `compliancePlan.zdrEnabled` | `false` |
| Assistant-level server URL | Not configured in the saved observation |

The export has no explicit temperature field. No temperature value is inferred. Disabling the three artifact settings does not establish zero data retention or verify the provider's complete retention behavior.

The exact UTF-8 system-instruction content has SHA256 `426dafc73fe4b8d4d41d41c94f4e31cf7a1cfce4a0469155a8ae244c28d8e016`. The redacted JSON file has SHA256 `8807163a5a8cdb4a93fc81ba914daba4f0e0ba7066154c2b086b0e2b228931a6`. Its only redacted fields are `orgId` and `isServerUrlSecretSet`; the original redacted bytes are preserved.

The user selected the permitted simulator path. **Completed real calls: 0.** This saved configuration does not establish carrier playback, live fallback recovery, call latency, message delivery or a completed human transfer.
