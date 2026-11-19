# Lab 13 UAT preparation — mfalujo23

Status: prepared, not conducted. No participant has consented, no pilot/live session has occurred, no observation or quote is claimed, and no stakeholder has approved a business-rule change. Codex prepared this plan using fictional fixtures. Automated browser checks of a simulator are engineering verification, not user acceptance testing.

The original course mode is team work with an approved stakeholder. The user reports permission to complete coursework solo; that does not establish a real participant session or stakeholder approval, and neither is invented here.

## Proposed consent script (not yet presented)

> You are invited to try a class prototype using fictional property and sponsor information. Participation is voluntary. You may skip any task, stop at any time, or ask for your session notes to be removed within seven days using your study code, without affecting a grade, service, or relationship with the class. We will observe task actions, time, errors and help requested. Please do not enter names, contact details, student records, grades, private business information or real caller information. The AI/voice experience may be a clearly labeled deterministic simulator; we will explain the mode before the task. No live call or SMS will be made without a separate agreed test plan. Recording, screenshots, audio and transcription are off by default. You may choose to participate with handwritten, de-identified notes only; any recording or quotation requires a separate explicit choice. Notes will use a study code, be accessible only to the approved course testing team/instructor, and be handled under the institution's approved privacy and FERPA procedures. We do not request education records. Proposed raw-note retention is fourteen days, followed by deletion and only de-identified issue summaries. Please tell the facilitator if you want to withdraw or correct a note. Do you consent to this session, and separately, do you permit any recording or direct quotation?

This is a proposed protocol requiring instructor/stakeholder review before use. It does not certify FERPA or other legal compliance. The facilitator must record each separate choice; elapsed time or continued browsing is not consent. Do not record names, signatures or contact details in the public repository. Keep any institution-required approval record in its approved restricted location, with only a non-identifying reference here.

## Setup and facilitation

Use a staging copy with resettable fictional data and no production credentials. Reset `/dashboard-demo` with “Revoke and delete local data,” then leave its optional checkbox off. `/listings` uses the generated fictional property dataset; `/voice-simulator` is a deterministic text mock. A real authenticated staging account and any real telephony number require separate setup; neither is supplied by this plan. Never use a classmate's account or invite a third party without authorization.

Pilot with a consenting classmate before the stakeholder session. Read only the task prompt, let the participant choose the path, and do not coach. Record an assistance request as assistance rather than a success without help. After each task ask: “How easy or difficult was that task, from 1 (very difficult) to 5 (very easy)?” and “What, if anything, would you change?” Ask separately before recording an exact quote. Capture timestamps as offsets from session start, not private calendars or messages.

The thresholds below are proposed acceptance targets, not measured outcomes. Confirm them with the instructor/proxy and adjust after the pilot without rewriting observations.

## Three realtor tasks

| ID | Neutral goal read to participant | Observable success / proposed target |
|---|---|---|
| R1 | “You need a home in ZIP 90032 with at least two bedrooms and a price no higher than $450,000. Find a suitable example and tell me its price and two features.” | Fictional 101 Imaginary Garden Lane, $425,000, two bedrooms; garden and parking. Correct visible result, no invented facts, no facilitator help; proposed target ≤60 seconds. Do not reveal the answer key. |
| R2 | “Your colleague gave you a set of search requirements with no matching homes. Determine whether any result meets them, then return to a useful set of results.” Give a sealed fixture card with max price $1 before the task. | Recognizes the empty state, avoids reporting a match, returns to at least one actual fictional listing; proposed target ≤60 seconds and no coaching. |
| R3 | “For the Cedar Court example, find out whether pets are allowed and whether an HOA fee is known. Tell me how confident you are in the answer.” | The text mock labels its mode and declines unsupported pet/HOA facts; participant identifies the limit and safe human follow-up option without a fabricated fee/policy. Proposed target ≤90 seconds. This is a simulator task, not the live telephony task required by Audit 13. |

## Three sponsor tasks

| ID | Neutral goal read to participant | Observable success / proposed target |
|---|---|---|
| S1 | “You are considering garden supplies after a move. Use the neighborhood example to learn about a business, and tell me how you interpret the information.” | Notices the adjacent sponsored disclosure without being told to click an ad; distinguishes paid example content from property facts. If navigation is tested, use an instructor-approved local destination stub rather than a real sponsor site. Proposed target ≤60 seconds. No promotional code is invented. |
| S2 | “Using the fictional dashboard, decide whether at least half of the shown impression opportunities led to a click. Explain the evidence and any limit on that conclusion.” | On the reset 30-event fixture: identifies 2/4 =50%, understands unique impression opportunities and small samples, does not infer revenue or real customer behavior. Proposed target ≤90 seconds. Permission to load fictional telemetry must be freely chosen, not required as participant consent. |
| S3 | “You decide that you no longer want this optional demonstration to retain activity. Make that choice and confirm its effect.” | Revokes fictional telemetry; checkbox becomes off, local events become zero and rates show insufficient data. Proposed target ≤45 seconds. Refresh also clears volatile memory. |

## Additional Audit 13 live telephony task — blocked until setup and consent

Proposed neutral prompt: “Using the approved test phone service, ask whether pets are allowed and whether HOA fees are known for the supplied fictional listing. Tell me what you would do next.” The approved number, participant/caller permission, safe destination, model mode and SMS consent must be established first. Measure actual call continuity, unsupported-fact handling and any separately consented SMS delivery against an agreed target (the audit gives 15 seconds as an example). Record real provider timing only if a real approved provider ran. The text simulator does not satisfy a live dial/SMS claim. Do not substitute its local elapsed time for provider latency.

## Traceability, triage and disposition

Use `lab13-observation-template.csv` only after consent. Every finding needs an observation ID, task ID, behavior evidence, allowed timestamp and assistance/time. Separate a direct observation from interpretation. Leave unavailable fields blank rather than inventing a quote, frequency or intent. Contradictory feedback remains separate until the instructor/proxy decides.

Create an issue only for a verified finding, with User Scenario, Observed Behavior, Expected Behavior, Reproduction Steps, observation IDs, a permitted label (bug/usability/content/accessibility/security/enhancement) and Given/When/Then acceptance criteria. Rank severity, observed frequency, stakeholder value and effort separately; count distinct actual observations, not repeated AI paraphrases. Confirm business-rule changes with the stakeholder/proxy before implementation. Use a separate branch/PR per feasible revision, reference the real issue in the commit, repeat the failed task and regression checks, then record fixed/planned/declined-with-reason/needs-decision.

Real issue URLs, fixing commit SHAs, participant task repetitions and disposition delivery remain pending. The blank traceability template is a preparation artifact, not an observed defect or a created GitHub issue.
