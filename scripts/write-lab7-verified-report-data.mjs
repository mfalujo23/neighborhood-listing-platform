import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('config/mfalujo23-media-manifest.json','utf8'));
const batch=JSON.parse(fs.readFileSync('config/mfalujo23-provider-copy-drafts.json','utf8'));
const artifact='docs/mfalujo23/provider-artifacts/lab7';
const localChecks=JSON.parse(fs.readFileSync(`${artifact}/local-validation.json`,'utf8'));
const genSettings=JSON.parse(fs.readFileSync(`${artifact}/gemini-copy-generation.settings.json`,'utf8'));
const gemSettings=JSON.parse(fs.readFileSync(`${artifact}/gemini-copy-review.settings.json`,'utf8'));
const chatSettings=JSON.parse(fs.readFileSync(`${artifact}/chatgpt-copy-review.settings.json`,'utf8'));
const source=JSON.parse(fs.readFileSync(`${artifact}/source-facts.json`,'utf8'));
const suppliedEvidence=path.resolve('../integrated-browser-evidence');
const rootEvidence=fs.existsSync(path.join(suppliedEvidence,'media-final-comparison.json')) ? suppliedEvidence : path.resolve('docs/mfalujo23/evidence');
const mediaFile=fs.existsSync(path.join(rootEvidence,'media-final-comparison.json')) ? 'media-final-comparison.json' : 'lab7-media-final-comparison.json';
const functionalFile=fs.existsSync(path.join(rootEvidence,'media-initial-qa.json')) ? 'media-initial-qa.json' : 'lab7-media-functional.json';
const mediaRaw=fs.readFileSync(path.join(rootEvidence,mediaFile));
const media=JSON.parse(mediaRaw.toString());if(media.runs.length!==4||media.profile.chromeSlow3G||media.profile.browserDevtoolsCacheDisabled)throw new Error('Unexpected measurement profile');
if(!media.runs.every(run=>run.records.length===3&&run.records.every(record=>record.complete)))throw new Error('Incomplete media observations');
fs.writeFileSync('docs/mfalujo23/evidence/lab7-media-final-comparison.json',mediaRaw);
const functionalTarget=path.resolve('docs/mfalujo23/evidence/lab7-media-functional.json');
if (path.join(rootEvidence,functionalFile)!==functionalTarget) fs.copyFileSync(path.join(rootEvidence,functionalFile),functionalTarget);
const client=fs.readFileSync('src/app/media-demo/media-client.tsx','utf8');
const jsx=client.slice(client.indexOf('    </div> : <Image')+13,client.indexOf('    />}')+6).trim();
const optimized=media.runs.filter(run=>run.page==='/media-demo');
const kb=number=>(number/1000).toFixed(3);
const assetSections=manifest.assets.map((asset,index)=>({
 label:['Asset A: Primary Property Listing Image','Asset B: Local Business Partner Ad Banner','Asset C: UI / Navigational Graphic'][index],asset,
 observations:[390,1280].map(width=>{const run=optimized.find(run=>run.viewport.width===width);if(!run)throw new Error('Missing viewport');const record=run.records.find(record=>record.assetId===asset.id);return{viewport:run.viewport,capturedAtUTC:run.capturedAtUTC,...record}}),
 risk:[
  'Risk: oversized raster payloads and layout movement. The source PNG remains outside public; Sharp crops genuine 16:9 WebP/AVIF renditions. Next generates only 320/640/1280 width descriptors matched to exact files, with explicit dimensions/sizes and a reserved fallback frame.',
  'Risk: rasterizing a simple banner wastes payload. The page serves the 706-byte SVG with a reserved 640x240 ratio and a 640px maximum container; loading is lazy.',
  'Risk: navigation shifts or duplicate screen-reader labels. The SVG has a fixed 32px CSS box and empty alt because adjacent Home text supplies the name.',
 ][index]
}));
const reportData={name:'Michael Falujo',auditTitle:'Digital Asset Pipeline & Performance Audit',labTitle:'Lab 7: Media Pipeline and AI-Assisted Marketing Copy',assets:assetSections,imageJSX:jsx,profile:media.profile,protocol:media.protocol,limitations:media.limitations,runs:media.runs,measuredBuild:'The media-correction build, before the subsequent provider-draft review UI overlay.',mediaEvidenceSha256:crypto.createHash('sha256').update(mediaRaw).digest('hex'),brief:source,variants:batch.variants,generationSettings:genSettings,geminiReviewSettings:gemSettings,chatgptReviewSettings:chatSettings,reviewComparison:localChecks.modelComparisons,utcContext:localChecks.contextInterpretation,humanApproval:{status:'pending',actor:null},sourcePaths:{manifest:'config/mfalujo23-media-manifest.json',approvalRecords:'docs/mfalujo23/evidence/lab7-local-approval-records.json',measurements:'docs/mfalujo23/evidence/lab7-media-final-comparison.json',providerArtifacts:artifact}};
fs.mkdirSync('../lab7-report-evidence',{recursive:true});fs.writeFileSync('../lab7-report-evidence/final-report-data.json',JSON.stringify(reportData,null,2)+'\n');
const audit=['Michael Falujo','','# '+reportData.auditTitle,''];
for(const section of assetSections){const asset=section.asset;audit.push('## '+section.label,'',
 `Source: ${asset.src}. Original/proof: ${asset.source.path}; ${asset.source.proof}. Custodian: mfalujo23.`,
 `Permission source: ${asset.source.kind==='actual-built-in-image-generation'?'the user-authorized actual built-in image-generation request and saved result':'SVG source authored for this authorized fictional project'}. No existing realtor photograph or real business endorsement is represented.`,
 `Approval field: media_asset_records.asset_id='${asset.id}', approval_status='approved', approval_scope='fixture_test', human_reviewed=false, production_status='draft'. The actual local database record is test-only; human production clearance is pending.`,
 `Purpose: ${asset.purpose}. Exact attribute: alt={asset.purpose === 'decorative' ? '' : asset.alt}. Actual alt: ${JSON.stringify(asset.alt)}.${asset.purpose==='decorative'?' The visible Home text gives the link its name, so empty alt avoids repetition.':''}`,
 `Responsive binding: width=${asset.width}, height=${asset.height}; ${asset.category==='navigation-icon'?'fixed 32px CSS/navigation sizes':asset.category==='partner-banner'?'640px maximum banner container':'exact 320/640/1280 WebP source widths and responsive sizes'}. Shared actual JSX follows the asset answers.`,
 '| Network/layout | 390px viewport | 1280px viewport |','|---|---|---|',
 `| Rendered CSS width | ${section.observations[0].renderedCssWidth}px | ${section.observations[1].renderedCssWidth}px |`,
 `| Selected file | ${path.posix.basename(section.observations[0].path)} | ${path.posix.basename(section.observations[1].path)} |`,
 `| Transferred kB (1000B) | ${kb(section.observations[0].transferBytes)} | ${kb(section.observations[1].transferBytes)} |`,
 `| Content-Type | ${section.observations[0].contentType} | ${section.observations[1].contentType} |`,
 `| Download ms | ${section.observations[0].downloadMs.toFixed(1)} | ${section.observations[1].downloadMs.toFixed(1)} |`,
 section.risk,'');}
audit.push('## Responsive Image JSX','', '```tsx',jsx,'```','',
 'Network method: exact-currentSrc ResourceTiming img/preload-link matches; Content-Type from separate successful same-origin HEAD requests. The controlled loopback proxy paces only raster image bodies at 64KiB/s after 400ms; all responses use no-store. HTML/JS/CSS/SVG are unthrottled. No Chrome Slow3G or DevTools cache-disabled setting was used. These are four fresh foreground observations with all images complete, from the media-correction build before the provider-draft review overlay.','');
fs.writeFileSync('docs/mfalujo23/Michael-Falujo-Audit-7.md',audit.join('\n'));
const lab=['Michael Falujo','','# '+reportData.labTitle,'','## Asset inventory and provenance','',
 '| Asset | Source | Permission/proof | Purpose | Expiration |','|---|---|---|---|---|',...manifest.assets.map(asset=>`| ${asset.id} | ${asset.source.path} | ${asset.source.kind}; ${asset.source.proof}; custodian mfalujo23 | ${asset.purpose} | None supplied for image; production human review pending |`),'',
 '## Crop, export and rendering','The generated PNG is retained outside public. Sharp 0.35.5 crops the property to 16:9 and produces genuine 320/640/1280 WebP and AVIF renditions, recording decoded formats, dimensions, byte counts and SHA256. AVIF is verified as AV1/ftypavif within the HEIF container. The matched 1280 JPEG is 360629 encoded bytes; WebP is 161092 bytes (55.33% fewer file bytes). Simple banner/navigation art remains SVG. Next Image has explicit dimensions, exact-width srcset/sizes and stable fallback boxes.','',
 '## Facts-only brief','```json',JSON.stringify(source,null,2),'```','',
 '## Three actual generated variants and phrase trace',
 `AI Studio generation: ${genSettings.label}, ${genSettings.thinking} thinking, structured outputs off; captured ${genSettings.capturedAt}.`,
 ...batch.variants.flatMap(variant=>['',`### ${variant.record.id} (${variant.characterCount} characters)`,variant.record.text,...variant.record.factTrace.map(trace=>`- ${JSON.stringify(trace.phrase)} -> ${trace.fact}`),'Status: draft. Human approver/date: pending.']),
 '', '## Factual review and approval workflow',
 `The identical critique prompt was run in Gemini (${gemSettings.label}, ${gemSettings.thinking}) and ChatGPT (${chatSettings.modelLabel}; exact version not exposed). Both recomputed 83/102/110 correctly and required human review. Gemini preferred variant 1; ChatGPT preferred variant 2. The latter flagged presents/lists as action implications. Both flagged UTC because the review source-facts prefix omitted the UTC context present in the generation instructions. The exact raw outputs are preserved; variant 3 is unchanged and draft.`,
 'All actual variants remain in the unpublished review queue. The campaign card uses only a separate, visibly test-only fixture. Production approval fails closed. A named human reviewer must check every sentence and record the decision/date before any approved copy record is created; no Supabase identity or approval is invented. Drafts/raw model outputs remain separate from approved display records.','',
 '## Server/UI validation and expiration',
 'The server and UI enforce the 120-character maximum, strict fields, known fact/template vocabulary and the brief date range. Client-supplied approval fields are rejected. Each validation success remains draft. The date gate runs on every request; the client removes active copy at UTC expiration. Unknown/unapproved/rejected/expired content yields a house message.','',
 '## Slow-network, missing-image and performance comparison',
 'Actual condition: a loopback-only proxy paces personal raster bodies at 64KiB/s plus 400ms initial delay; all responses use no-store; HTML/JS/CSS/SVG are unthrottled. No Chrome Slow3G or DevTools cache-disabled setting was used. All images completed before each foreground capture.',
 '| Viewport | JPEG observed page transfer B | WebP observed page transfer B | JPEG LCP ms / candidate | WebP LCP ms / candidate |','|---|---|---|---|---|',
 ...[390,1280].map(width=>{const before=media.runs.find(run=>run.viewport.width===width&&run.page.endsWith('/baseline')),after=media.runs.find(run=>run.viewport.width===width&&run.page==='/media-demo');return`| ${width}px | ${before.observedDocumentAndResourceTransferBytes} | ${after.observedDocumentAndResourceTransferBytes} | ${before.lcpMs} / ${before.lcpElement} | ${after.lcpMs} / ${after.lcpElement} |`}),
 'Only these four fresh runs are used. They measure the media-correction build before the provider-draft review overlay. LCP candidates differ and totals include framework/prefetch activity; these single observations do not establish causality or field Core Web Vitals.',
 'Missing-image fallback preserved the 998x561.375px frame before/after. A known draft passed server validation without approval; an unsupported claim was blocked; native-calendar November 18 was rejected as INVALID_CAMPAIGN_DATES. The 390px layout had no horizontal overflow.','',
 '## Correction and unpublishing',
 'The maintainer can unpublish by changing the trusted record to draft/rejected or removing it from the display set. Record the affected source/version and correction; preserve raw output; rerun date/length/fact/display checks; require a named human reapproval with date. Expired copy remains unpublished.','',
 '## Submission evidence',
 'Repository: https://github.com/mfalujo23/neighborhood-listing-platform . Local demos: /media-demo and /media-demo/baseline. Media publication/deployed-commit references will be added after the actual publication. The individual work is the new personal media pipeline, strict draft/approval gates, tests and recorded provider comparison; previous teammate artifacts are preserved.',''];
fs.writeFileSync('docs/mfalujo23/Michael-Falujo-Lab-7.md',lab.join('\n'));
const marker='## Actual AI Studio and ChatGPT copy experiment';
let log=fs.readFileSync('docs/mfalujo23/lab7-ai-log.md','utf8');if(log.includes(marker))log=log.slice(0,log.indexOf(marker));log=log.replace('## Required external copy tools','## Initial checkpoint before actual provider experiments').replace('AI Studio/Gemini/ChatGPT copy generation, factual review and comparison have not been run in this scope.','At the original snapshot, AI Studio/Gemini/ChatGPT copy generation, factual review and comparison had not run. The later actual runs are recorded below.');
log+='\n'+marker+'\n\n'+`Generation: ${genSettings.tool}, ${genSettings.model}, ${genSettings.thinking}, structuredOutputs=${genSettings.structuredOutputs}, captured ${genSettings.capturedAt}. Critiques: Gemini captured ${gemSettings.capturedAt}; ChatGPT website ${chatSettings.modelLabel} (exact version unexposed), captured ${chatSettings.capturedAt}. Exact prompts/settings/raw outputs and SHA256 checks are in ${artifact}.\n\nActual generated lengths:83/102/110, independently recounted; exact phrase traces checked. All3 remain draft. The same full critique prompt was sent to both tools. Gemini preferred variant 1; ChatGPT preferred variant 2. Used: source-supported phrases, exact URL, count/trace checks and a review queue. Rejected: treating model critique as human approval, silently accepting presents/lists implications, or deleting UTC from raw output without considering the omitted review context. The generation instruction supplied UTC; the review source prefix did not.\n\nHuman decision is pending as of this record; no actor/UUID, stakeholder endorsement or production authorization is fabricated. The existing classroom card remains test-only. Browser transport observations are actual4fresh foreground runs on the media-correction build, separate from provider model performance. No real UAT or telephony run is claimed.\n`;
fs.writeFileSync('docs/mfalujo23/lab7-ai-log.md',log);
console.log(JSON.stringify({runsUsed:4,draftLengths:batch.variants.map(variant=>variant.characterCount),humanApproval:'pending',reportData:'work/lab7-report-evidence/final-report-data.json'}));
