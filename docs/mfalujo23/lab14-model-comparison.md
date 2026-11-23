# Lab 14 chart comparison

The question was: which inquiry-flow problem should the maintainer inspect next? Both tools received the same [prompt and fictional fixture](lab14-model-comparison/prompt.txt). ChatGPT showed **Instant**; its exact version was not shown. AI Studio showed **Gemini 4 Hydrogen** (`gemini-4-hydrogen`). Responses were captured on November 20, 2026, at 01:08 UTC. [Settings](lab14-model-comparison/model-settings.json).

## Calculation check

Both outputs matched the saved local calculation: 30 events, sponsor CTR 2/4 (50%), call completion 3/4 (75%), tool success 3/4 (75%), and escalation 1/4 (25%). Category counts were three property-details events and one unknown event. Daily UTC counts were 29 and 1.

Both correctly handled duplicate events, repeated clicks on one impression, UTC boundaries, unmatched clicks, small groups, conflicting IDs and unknown fields. [Verification and raw calculation](lab14-model-comparison/verification.json).

For fictional latencies of 800, 999 and 1000 ms, **2/3** meet the strict `<1000 ms` threshold. Exactly 1000 ms stays in the denominator. Gemini's answer was numerically correct, but its wording “1000ms excluded” needs this clarification. These values do not measure a live provider.

## Decision

Choose ChatGPT's inquiry-flow count chart as the **next design to evaluate**. Show completion, tool failure and escalation with explicit counts and denominator units. Do not combine these different measures into an additive funnel. Retain the existing daily chart and accessible table because the assignment requires a time series.

Gemini's percentage bars are an alternative, but sponsor CTR and failure rates have different denominators. A shared percentage scale must not imply that the rates measure the same thing. Keep clear labels, equivalent table/text, non-color cues and insufficient-data states.

| Response | Correctness | Privacy | Accessibility | Decision usefulness |
| --- | ---: | ---: | ---: | ---: |
| [ChatGPT Instant](lab14-model-comparison/chatgpt-response.txt) | 3 | 3 | 3 | 3 |
| [Gemini 4 Hydrogen](lab14-model-comparison/gemini-response.txt) | 2 | 3 | 3 | 2 |

Scores use the [0–3 rubric](lab14-model-comparison/scoring-rubric.txt). They assess these outputs only. Gemini loses points for ambiguous threshold wording and the risk of comparing different rates or removing the required time series. ChatGPT used 544 words, exceeding the requested maximum of 500; Gemini used 453.

Both recommendations to minimize fields and verify server authorization are useful. Scheduled 30-day deletion remains work to arrange and verify. No chart code, participant test or provider measurement changed. The existing chart predates these responses. Assigned partner Rahim's participation and review remain unverified. The [AI log](lab13-14-ai-log.md) records the actual assistance and source commit.
