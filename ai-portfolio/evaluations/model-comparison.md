# ChatGPT / Gemini comparison

Meaningful shared problem: normalization, strict property schema and returned valid/invalid examples. Both received the [same prompt](../artifacts/lab3/normalization-prompt.txt).

| Dimension | Recorded evidence |
| --- | --- |
| Technical accuracy | Both complete example sets produced one valid result and four intended rejections under the actual canonical validator. |
| Completeness | Gemini returned five complete examples. ChatGPT also included three earlier partial/schema illustrations; these were not counted as complete property examples. |
| Clarity | Complete records, partial examples and schema suggestions must be distinguished before automated extraction. |
| Security | Unknown-key cases were actually rejected; a plausible model example did not bypass the strict runtime boundary. |
| Accessibility | This schema-normalization prompt did not evaluate rendered UI accessibility; no accessibility winner is inferred. |
| Assumptions | Storage normalization, embedded read projections and controlled enums were reviewed separately from unconfirmed business rules. |
| Unsupported claims | Model predictions were tested; no model claim is treated as a command execution or stakeholder decision. |
| Proposed tests | Both supplied missing-ID, negative-price, malformed-ZIP and unknown-field records; exact returned examples were executed unchanged. |

[Actual results](../verification/lab3-returned-data-validation.json). The [midterm](../artifacts/midterm/) and [consolidated](../artifacts/consolidated/) paired critiques provide additional comparisons, but each pair is one shared experiment rather than a collection of invented weekly runs.

## My decision

For direct extraction of the normalization examples, I would choose Gemini's response because it supplied five complete records without ChatGPT's earlier partial illustrations. The actual validator outcomes were equal: one accepted and four intended rejections for each complete set. This supports a completeness/clarity preference, not a technical-accuracy winner or an accessibility claim.

For the separate App Shell problem, I would favor ChatGPT's src-directory plan while rejecting its tablet-three-column example. Gemini's checklist was useful, but its no-src-dir command did not match the course. The [actual comparison and two decisions](../../docs/mfalujo23/lab1-ai-log.md) provide that context. I would choose a response by the specific requirement and executed check, rather than declare one model best for every task.
