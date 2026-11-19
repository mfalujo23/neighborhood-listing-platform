import fs from 'node:fs';
if (fs.existsSync('config/mfalujo23-provider-copy-drafts.json')) {
  await import('./write-lab7-verified-report-data.mjs');
} else {
const manifest=JSON.parse(fs.readFileSync('config/mfalujo23-media-manifest.json','utf8'));
const generation=JSON.parse(fs.readFileSync('assets/mfalujo23-media/source/generation-record.json','utf8'));
const copies=JSON.parse(fs.readFileSync('docs/mfalujo23/evidence/lab7-copy-results.json','utf8'));
const read=(p)=>fs.readFileSync(p,'utf8').trim();
const client=read('src/app/media-demo/media-client.tsx');
const imageJSX=client.slice(client.indexOf('    </div> : <Image')+13,client.indexOf('    />}')+6).trim();
const labels=['Asset A: Primary Property Listing Image','Asset B: Local Business Partner Ad Banner','Asset C: UI / Navigation Graphic'];
const risks=[
  'Risk: a large raster or an unreserved box can waste bytes or shift layout. Mitigation: crop to 16:9, genuine 320/640/1280 WebP renditions, accurate sizes, explicit 1280×720 dimensions and a reserved aspect-ratio fallback. The3,052,760-byte source PNG is outside public.',
  'Risk: using a large raster for a simple banner can waste bytes. Mitigation: serve the 706-byte code-authored SVG, reserve its 640×240 ratio, cap the container at 640px and lazy-load it.',
  'Risk: a navigation graphic can shift adjacent text or repeat its label to assistive technology. Mitigation: a fixed 32×32 CSS box, 314-byte SVG, empty alt and adjacent Home link text.',
];
const audit=['Michael Falujo','','# Digital Asset Pipeline & Performance Audit',''];
manifest.assets.forEach((asset,index)=>{
  audit.push(`## ${labels[index]}`,'',
    `Source currently rendered on /media-demo: \`${asset.src}\`. Original: \`${asset.source.path}\`.`,
    `Permission source and proof: ${index===0?'the user-authorized built-in image generation, with exact prompt/result/date in assets/mfalujo23-media/source/generation-record.json':'code authored for this authorized fictional classroom project; exact SVG source is '+asset.source.path}. Project custodian: mfalujo23. No existing realtor photograph or real business endorsement is represented.`,
    `Approval record: local PostgreSQL \`media_asset_records.asset_id='${asset.id}'\`; \`approval_status='approved'\`, \`approval_scope='fixture_test'\`, \`human_reviewed=false\`, \`production_status='draft'\`. This is test-only clearance; actual human production approval is pending. The actual local rows are in evidence/lab7-local-approval-records.json.`,'',
    `Purpose: ${asset.purpose==='decorative'?'Decorative inside the Home navigation link. The visible Home text supplies the accessible name; alt="" prevents repetition.':'Informational.'}`,
    `Exact dynamic alt expression: \`alt={asset.purpose === 'decorative' ? '' : asset.alt}\`. Actual value: ${JSON.stringify(asset.alt)}.`,
    `Responsive configuration: the shared Next Image JSX below receives width=${asset.width}, height=${asset.height}, and category=${asset.category}. ${index===0?'The custom loader selects an exact existing WebP width from the configured 320/640/1280 set; the baseline comparison intentionally uses the same 1280×720 JPEG.':index===1?'The SVG remains vector; its CSS container has max-width 640px.':'The navigation box and sizes are both 32px.'}`,'',
    '| Network/layout observation | 390px viewport | 1280px viewport |','|---|---|---|',
    '| Rendered CSS image width | Pending actual browser measurement | Pending actual browser measurement |',
    '| Current image URL / encoded width | Pending actual browser measurement | Pending actual browser measurement |',
    '| Transferred file size (KB) | Pending cache-disabled browser measurement | Pending cache-disabled browser measurement |',
    '| Response Content-Type | Pending actual response headers | Pending actual response headers |',
    '| Download time (ms) | Pending actual browser measurement | Pending actual browser measurement |','',
    `Verified local file metadata: ${asset.renditions.find(r=>r.path===asset.src).format}, ${asset.width}×${asset.height}, ${asset.renditions.find(r=>r.path===asset.src).bytes} bytes. These file bytes are not transferred-byte measurements.`,
    risks[index],''
  );
});
audit.push('## Exact shared Image component JSX','', '```tsx',imageJSX,'```','');
fs.writeFileSync('docs/mfalujo23/Michael-Falujo-Audit-7.md',audit.join('\n'));
const baseline=manifest.assets[0].renditions.find(r=>r.format==='jpeg');
const primary=manifest.assets[0].renditions.find(r=>r.path===manifest.assets[0].src);
const lab=['Michael Falujo','','# Lab 7: Media Pipeline and AI-Assisted Marketing Copy','',
  '## Asset inventory and provenance','',
  '| Asset | Source and owner/custodian | Permission/provenance | Purpose | Expiration |','|---|---|---|---|---|',
  ...manifest.assets.map(asset=>`| ${asset.id} | ${asset.source.path}; mfalujo23 | ${asset.source.kind}; proof: ${asset.source.proof} | ${asset.purpose} | No image expiration supplied; production human review pending |`),'',
  '## Crop, formats and framework rendering','',
  'The generated 1672×941 PNG remains outside public. Sharp 0.35.5 crops the same fictional image to 16:9 and emits genuine 320×180, 640×360 and 1280×720 WebP/AVIF files. AVIF is verified by AV1 compression and the ftypavif container brand; Sharp reports its decoder container as HEIF. Original and derivative byte sizes/dimensions/SHA256 values are in config/mfalujo23-media-manifest.json. The two simple graphics remain SVGs in the page; genuine WebP derivatives are also decoded and recorded. No legacy asset or teammate record is overwritten.','',
  `Matched 1280×720 comparison: JPEG baseline ${baseline.bytes} bytes; WebP ${primary.bytes} bytes (${((1-primary.bytes/baseline.bytes)*100).toFixed(2)}% fewer encoded file bytes). This is a file-weight result, not a network or LCP result.`,
  'Next Image uses explicit dimensions, responsive sizes, eager/high-priority loading for the property image and lazy loading for the banner. Missing-image handling preserves the box and accessible description. The navigation icon is decorative because Home supplies the link name.','',
  '## Facts-only sponsor brief','', '```json',JSON.stringify(copies.brief,null,2),'```','',
  '## Three constrained copy variants and phrase trace','',
  ...copies.variants.flatMap(variant=>[`### ${variant.id} (${variant.characterCount} characters)`,variant.text,'',...variant.factTrace.map(trace=>`- ${JSON.stringify(trace.phrase)} → ${trace.fact}`),'Status: draft. Human approver/date: pending. Tool actually used for these drafts: Codex; no Gemini/AI Studio execution is claimed.','']),
  '## Review, approval and display','',
  'Raw draft records are separate from the fixture-approved record. The production gate rejects every current draft and every test-only approval. The classroom card can show only the separate fixture_test record, visibly labeled test-only with humanReviewed=false. Public validation accepts only the closed facts/template vocabulary,≤120 characters, the correct brief and dates inside the brief. Unknown keys, client approval fields, unsafe or unsupported claims and invalid/expired dates are rejected. A successful validation remains draft and requires human approval.','',
  'The campaign date gate is evaluated on each server request; the client also removes displayed fixture copy at its UTC expiration. Empty, rejected, expired or unapproved states use a house message. No real offer or stakeholder endorsement is made.','',
  '## Missing-image, slow-network and performance comparison','',
  'The local route has a missing-property-image control and separate optimized/JPEG baseline pages. Actual browser fallback behavior, cache-disabled transferred bytes, 390/1280 rendered widths, slow-network behavior and before/after LCP are pending the coordinated browser session. No measured result is substituted from file sizes. The browser capture button records actual ResourceTiming and last-observed LCP only when invoked; it also labels Content-Type as coming from a separate same-origin HEAD request.','',
  '## Content correction and unpublishing','',
  'The project maintainer can immediately change a record to draft/rejected or remove it from the display set, record the affected claim/brief/version and correction, and rerun the date/length/fact/display tests. A designated human reviewer must verify each sentence and source before production approval; no reviewer is assigned or impersonated here. Reapproval requires an identified approver and date. An expired record remains unpublished. Preserve the prior draft/model output and correction trace separately; never silently replace it with an approved claim.','',
  '## AI collaboration evidence','',
  'One actual built-in image_gen run is recorded with its exact prompt, returned artifact, date, output hash and model-name-not-exposed in source/generation-record.json and lab7-ai-log.md. The image is explicitly fictional. ChatGPT/Gemini/AI Studio copy generation and fidelity critique remain unperformed; those required tool outputs must be recorded after an actual run, not inferred from Codex drafts.','',
];
fs.writeFileSync('docs/mfalujo23/Michael-Falujo-Lab-7.md',lab.join('\n'));
const log=['# Lab 7 AI interaction record — mfalujo23','',
  '## Actual image-generation interaction','',
  `Captured UTC: ${generation.capturedAtUTC}. Local date: ${generation.localDate}. Tool: ${generation.tool}. Model: ${generation.modelName}.`,'',
  'Exact prompt:', '', '```text',generation.prompt,'```','',
  `Returned artifact: ${generation.toolArtifact}. Saved source: ${generation.workspaceSource}. Format: PNG; ${generation.width}×${generation.height}; ${generation.bytes} bytes; SHA256 ${generation.sha256}.`,'',
  'Output used: the fictional house image. Inspected result: no visible people, address numbers, readable signs, brands or watermark; cream exterior, wood entry and garden match the prompt. Original is preserved. No realtor approval, model-specific identity, copyright certification or real listing is inferred from generation. Production human review remains pending.','',
  '## Actual Codex copy and implementation work','',
  'Objective: implement the exact Lab7/Audit7 media and factual-copy requirements in a new personal namespace; preserve prior assets/logs; author three fictional draft variants under 120 characters with phrase traces; make genuine optimized derivatives; fail closed on production approval; add strict runtime/date/length/claim validation and accessible fallback behavior.','',
  'Used: actual Sharp decoding/conversion; separate raw drafts and fixture-only approved record; closed factual-template vocabulary; whole-word claim checks; typed metadata and local approval-record evidence. Rejected: renaming PNG as WebP, upscaling a logo into a property photo, claiming a test actor is a human approver, treating absence of banned words as fact verification, false-positive matching of best inside Bestow, serving raw source images publicly, static build-time expiry decisions, and presenting file bytes as network/LCP measurements.','',
  'Verification: exact pass totals and actual local SQL/file evidence are stored under evidence/ and the working Lab7 evidence directory. Initial AVIF decoder-label validation and JSX lint errors were corrected; AVIF now retains both actual HEIF decoder format and AV1/ftypavif verification. No source publication or external human message was sent by this agent.','',
  '## Required external copy tools','',
  'AI Studio/Gemini/ChatGPT copy generation, factual review and comparison have not been run in this scope. The inherited team logs are preserved without re-certification. Use this public fictional brief only for the actual required run and retain its genuine outputs/settings/date and the resulting review decisions.','',
  '```text','Using only the approved fictional fixture facts below, create three sponsor blurbs under 120 characters. Do not add superlatives, guarantees, urgency, demographic targeting, or facts not supplied. Return a fact-to-phrase trace for each variant. These are draft classroom examples; do not claim real stakeholder approval.',JSON.stringify(copies.brief,null,2),'```','',
];
fs.writeFileSync('docs/mfalujo23/lab7-ai-log.md',log.join('\n'));
console.log(JSON.stringify({reports:['Michael-Falujo-Audit-7.md','Michael-Falujo-Lab-7.md'],baselineBytes:baseline.bytes,primaryWebpBytes:primary.bytes,draftLengths:copies.variants.map(v=>v.characterCount)}));
}
