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

## Student decision required

Michael must state which response was more useful to him and support that decision with the recorded evidence. This portfolio does not invent his preference or experience.
