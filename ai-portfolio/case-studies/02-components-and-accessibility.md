# Component and accessibility review

## Original problem
The property interface needed real keyboard-operable controls, working labeled filters, truthful sponsorship disclosure and a responsive route using the actual runtime contract.

## Initial prompt
Implementation task summary is recorded
Prepare accessible PropertyCard controls, labeled filters, a responsive listings route, strict boundary validation and actual evidence; preserve existing usages and teammate attribution.
- [Original source](../../docs/mfalujo23/ai-log.md).

## AI response summary
The AI coding assistant supplied article/heading structure, dynamic image alternatives, a Save button and expandable Details control, labeled City/Maximum Price controls, visible Sponsored language and scoped 1/2/3-column CSS.

## Recorded technical critique
Inherited generic audit snippets were not actual current controls. A type assertion was not a parser. The first fixture import traversed one directory too far and failed in the browser; that defect was corrected before successful checks. A later real rendered axe run found a favorite-button label-in-name mismatch and a media CTA naming defect; the services scan had an incomplete finding. The release checker rejected those actual artifacts instead of accepting a mocked axe test.

## Revised prompt / actual revision status
A specific correction was performed and recorded in coordination evidence
Correct the /listings JSON import to ../../../data, then typecheck and inspect the real route before claiming browser success. Later observed accessibility findings led to a label-in-name correction, named service region, media CTA name and discoverable home navigation; final real axe retesting remains separate.

## Final result
The published route validates its JSON before rendering. Filters produce real one-result and empty states; Save changes aria-pressed and Details reveals amenities/sponsors. Later provider integration changes the active fixture without relabeling the original locally authored data.

## Verification evidence
- Root browser Tab trace: skip link, back link, City, Maximum Price, Apply, Reset, sponsorship summary, first Save
- Space changed Save to Saved/aria-pressed=true; Enter opened Details; computed focus outline was 3px blue
- Actual 375/768/1280 layouts had 1/2/3 columns and no horizontal overflow
- Original Lab 2/3 snapshot: strict lint/typecheck, 43 Vitest + 5 inherited Node tests and production build passed
- Actual pre-fix axe artifacts were rejected with exit 1: listings had 1 violation, services 1 incomplete item, media 1 violation; raw output [exact rejected-axe output](../../docs/mfalujo23/release-evidence/actual-axe-blocking.log)
- Post-fix source gate passed 251 Vitest tests plus 21 webhook tests and local SQL/restore phases; source publication and actual rendered axe retest are not inferred from that gate

The actual final rendered axe captures now report zero violations and zero incomplete checks in both favorite states, the named service region, media CTA and final booking-error state. These are automated local browser results, not a screen-reader or hosted-session claim. [Real reports](../verification/axe-after-fixes-final.json).

## Related GitHub work
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/pull/5)
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/commit/926c40cfec072b29f92262981c13639b1b846a8c)

## My decision and lesson

I would keep a real button with an accessible name and state, a labelled filter form and purposeful image alternatives. The rendered favorite-label failure and service-region finding show why source inspection alone was insufficient. The recorded browser checks and fixes provide stronger evidence than a general claim of compliance.

I would also compare the code with the exact component instructions: the current card displays the address and facts, but an explicit facts list would be clearer and the requested shared type entry file is not present. Those are separate from the successful keyboard and layout checks. My lesson is to verify both behavior and the stated deliverable, without counting automated checks as a partner review or human UAT.
