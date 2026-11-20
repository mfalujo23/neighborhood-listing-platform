# Michael Falujo — AI Engineering Portfolio

This portfolio links actual prompts, outputs, technical decisions, checks and GitHub work. The six cases contain evidence-based decisions, and the complete reflection is an AI-assisted first-person draft for Michael's review and personal defense. The records distinguish Michael's directions/approvals from assistant-executed implementation and testing.

- [Interaction log](ai-interaction-log.md)
- [Architecture and scaffolding](case-studies/01-architecture-and-scaffolding.md)
- [Components and accessibility](case-studies/02-components-and-accessibility.md)
- [Structured JSON output](case-studies/03-structured-output.md)
- [Database and RLS](case-studies/04-database-and-rls.md)
- [Function calling](case-studies/05-function-calling.md)
- [Security and red-team testing](case-studies/06-security-and-red-team.md)
- [Model comparison](evaluations/model-comparison.md)
- [Hallucination and boundary tests](evaluations/hallucination-tests.md)
- [Security review and rejected output](evaluations/security-review.md)
- [Reflection](final-reflection.md)

## Artifact scope

`structured-output/property-schema.json` is the actual generated single-property contract; `property-collection-schema.json` adds the actual array boundary. `sample-response.json` preserves the exact accepted Gemini second response. Seed attempt 1 was rejected; attempt 2 was captured with structured mode off. It is not labeled a successful structured-mode run.

`sponsor-schema.json` is generated from the application's strict `SponsorContextSchema` (property ID, target ZIP, placement). It is an actual placement-input contract, not a complete sponsor database row. The separate `sponsor-copy-response.schema.json` is the prepared marketing-output contract; the real marketing generation also had structured mode off. Eligibility, destination reputation and production approval remain separate controls.

The function-calling record separates model proposals, validated mock results and subsequent answers. Later public synthetic callbacks used the hosted database; they did not place a real call or SMS. The selected capstone voice path is the permitted text simulator.

Original team files are outside this new folder and are not overwritten. No active credentials, private contacts, education records or caller recordings are included. Historical key findings are classified safely; current scans do not imply an empty Git history.

## Integrated implementation trace

[Current repository source](https://github.com/mfalujo23/neighborhood-listing-platform/tree/3e48dad16d9df3aa07630c90f0858f511e6c237c). Individual experiment and test links retain their recorded historical commits. [Later hosted checks](../docs/mfalujo23/hosted-reproduction.md) are separate from the original local fixtures.
