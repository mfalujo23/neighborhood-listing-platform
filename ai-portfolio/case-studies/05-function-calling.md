# Function calling and voice-agent design

## Original problem
An assistant needed grounded fictional property/sponsor answers and consent-based follow-up without treating a model-proposed call as an executed side effect.

## Initial prompt
Exact system instructions, declarations, UI code export and caller inputs retained
- [Exact retained record](../artifacts/voice-tools/system-instructions.txt).
- [Exact retained record](../artifacts/voice-tools/actual-ui-code-export.txt).
- [Exact retained record](../artifacts/voice-tools/FC1-proposed-call.json).

## AI response summary
The real AI Studio run proposed get_property_details with property_id demo-001. The strict local dispatcher executed a fictional mock, whose function response was supplied manually; the model then answered the listed price and bedroom count. A second real proposed get_nearby_sponsors call produced explicitly Sponsored fictional output after a supplied mock response.

## Recorded technical critique
The accepted minimal UI declaration does not enforce every runtime XOR, pattern, unknown-key or consent constraint. The local strict validator remains authoritative. A proposed function, accepted local mock and manually supplied function response are three distinct events. No API adapter, carrier call, SMS or agent contact follows from them.

## Revised prompt / actual revision status
Current actual UI export includes an explicit evaluation boundary
Never say a function ran or an agent was contacted without an actual function response; identify manually supplied local results as fictional; follow-up functions create drafts only.

## Final result
Published PR 7 provides the deterministic text simulator and strict dispatcher. Seven serial actual AI Studio cases now record three ordinary proposals, a missing-HOA refusal, a no-consent/injection refusal, an invalid-ZIP refusal and a property proposal followed by an explicitly supplied immediate mock TIMEOUT and next-turn response. These are not seven independent sessions or a live Vapi integration.

## Verification evidence
- 13 focused simulator tests and ten scripted local cases matched expected outcomes
- Actual simulator browser checks observed zero provider requests and zero submitted follow-ups
- FC1 and FC2 proposed arguments, local validator/adapter results, supplied responses and exact model answers are separately retained
- Minimal provider declaration versus canonical strict JSON/Zod constraints documented; no automatic provider execution is claimed
- Actual FC6 refused the exact ten-digit ZIP with no additional tool call.
- Actual FC7 proposed demo-002; strict local mock returned TIMEOUT, its result was manually supplied, then an explicit continuation elicited a truthful dialogue response. No measured network timeout occurred.

FC4 refused to invent the missing HOA fee and acknowledged the earlier draft as `submitted:false`. FC5 refused a combined no-consent/rule-override/credential/missing-ID request. FC6 refused the invalid ZIP without a call. FC7 returned a truthful dialogue after the immediate mock TIMEOUT was supplied manually and a separate continuation asked for the answer. [FC4](../artifacts/voice-tools/FC4-observation.json), [FC5](../artifacts/voice-tools/FC5-observation.json), [FC6](../artifacts/voice-tools/FC6-invalid-zip-observation.json), [FC7](../artifacts/voice-tools/FC7-model-timeout-observation.json). These are serial turns, not independent trials; no live transfer or timed network failure is inferred.

The later [hosted reproduction record](../../docs/mfalujo23/hosted-reproduction.md) captures saved provider settings and public synthetic callback checks. Configured tools are not evidence of a carrier call.

## Related GitHub work
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/pull/7)

## My decision and lesson

I selected the professor-permitted text/saved-fixture simulator instead of adding paid call requirements. I would retain strict server validation even when a model accepts the tool declaration. A proposed call, an executed adapter, a supplied result and a final model answer are separate events.

The unknown-HOA refusal and the no-consent/injection refusal are useful specific results. They do not establish a broad safety benchmark. The later public simulator matched ten expected outcomes, and synthetic callbacks checked the hosted data boundary; no real call, SMS or transfer occurred. My lesson is to offer an honest unavailable/manual-contact response rather than claim a human received an unsubmitted draft. The separate live-call audits still need the fields their own prompts request.
