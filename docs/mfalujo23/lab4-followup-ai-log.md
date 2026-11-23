# Lab 4: Required AI process log

The follow-up used the existing Team Aster questions and de-identified P1 notes. The source files remain credited to their original author. Browser runs were performed by an assistant under Michael Falujo's direction.

## Tools and prompt

The actual responses were captured on November 19, 2026, Pacific time (November 20 at 01:11 UTC). ChatGPT showed the model label **Instant**, with no exact version shown. Google AI Studio showed **Gemini 4 Hydrogen**, model ID `gemini-4-hydrogen`. No API key or URL-context tool was used.

Both received the same [complete prompt](lab4-discovery-review/prompt.txt). It requested eight neutral questions, leading/privacy checks, source-linked themes, candidate requirements and remaining confirmation questions. The [settings record](lab4-discovery-review/model-settings.json) includes the prompt hash. The actual [ChatGPT output](lab4-discovery-review/chatgpt-response.txt) and [Gemini output](lab4-discovery-review/gemini-response.txt) are unchanged.

## Used and rejected

Used: neutral question wording, audience-role limits, broader access questions and the five themes supported by all six P1 source lines. These informed the value proposition, persona hypotheses and approval workflow.

Rejected or kept provisional: new duration tracking without an agreed definition; a correction process presented as an observed need; new interview, user-test, sponsor-consent or business-result claims; and a claim that a complete approval interface already exists.

## Verification and Git evidence

The [question review](lab4-question-review.md) explains each selected change. The [line-by-line theme check](lab4-theme-verification.md) compares every source line and records the decisions. The workflow was checked against listing, sponsor and media controls at commit `fa9d5780041996cc81c8ca1a25a9703f80d8c2cd`.

These are documentation changes for [PR 14](https://github.com/mfalujo23/neighborhood-listing-platform/pull/14) and [requirements issue 2](https://github.com/mfalujo23/neighborhood-listing-platform/issues/2). Their final commit is available in the PR file history. No new application test, interview, consent decision or partner review is claimed by this entry.
