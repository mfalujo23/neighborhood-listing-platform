# Michael Falujo — AI Engineering Portfolio

This portfolio contains recorded AI interactions, technical decisions, actual checks and source references. It does not assign assisting-agent execution, teammate history or a model's claims to Michael as personal work. The six evidence cases are below; Michael's personal critique, lessons, model preference and final reflection still require his own entry.

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
- [Student reflection](final-reflection.md)

## Artifact scope

`structured-output/property-schema.json` is the actual generated single-property contract; `property-collection-schema.json` adds the actual array boundary. `sample-response.json` preserves the exact accepted Gemini second response. Seed attempt 1 was rejected; attempt 2 was captured with structured mode off. It is not labeled a successful structured-mode run.

`sponsor-schema.json` is generated from the application's strict `SponsorContextSchema` (property ID, target ZIP, placement). It is an actual placement-input contract, not a complete sponsor database row. The separate `sponsor-copy-response.schema.json` is the prepared marketing-output contract; the real marketing generation also had structured mode off. Eligibility, destination reputation and production approval remain separate controls.

The function-calling record distinguishes model proposals, local strict validation, fictional adapter results, manually supplied responses and later model answers. It establishes no live Vapi/Twilio call, SMS, human transfer or hosted database access.

Original team files are outside this new folder and are not overwritten. No active credentials, private contacts, education records or caller recordings are included. Historical key findings are classified safely; current scans do not imply an empty Git history.

## Integrated implementation trace

[Published source](https://github.com/mfalujo23/neighborhood-listing-platform/tree/5d30224b2c406a7f32b7d14b32da0120fcaa41fc). Exact implementation checkpoint: `5d30224b2c406a7f32b7d14b32da0120fcaa41fc`. This documentation addition does not turn earlier experiment captures into tests of later code.
