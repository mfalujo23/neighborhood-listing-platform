import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {z} from 'zod'
import {CopyRecordSchema} from '../src/media/copy'

const destination='docs/mfalujo23/provider-artifacts/lab7'
const suppliedSource=path.resolve('../ai-experiments/lab7')
const source=fs.existsSync(path.join(suppliedSource,'gemini-copy-generation.raw.json')) ? suppliedSource : path.resolve(destination)
fs.mkdirSync(destination,{recursive:true})
const read=(name:string)=>JSON.parse(fs.readFileSync(path.join(source,name),'utf8'))
const hash=(value:string|Buffer)=>crypto.createHash('sha256').update(value).digest('hex')
const facts=read('source-facts.json')
const mapping={business_name:'businessName',offer:'offer',address:'address',url:'url',starts_on:'startsOn',ends_on:'endsOn',disclaimer:'disclaimer'} as const
const RawSchema=z.object({brief_id:z.literal('fictional-garden-v1'),variants:z.array(z.object({id:z.string().regex(/^variant-[123]$/),text:z.string().min(1).max(119),character_count:z.number().int().min(1).max(119),status:z.literal('draft'),fact_trace:z.array(z.object({phrase:z.string(),fact_id:z.enum(['business_name','offer','address','url','starts_on','ends_on','disclaimer'])}).strict()).min(3),connective_wording:z.array(z.string())}).strict()).length(3)}).strict()
const raw=RawSchema.parse(read('gemini-copy-generation.raw.json'))
const generationSettings=read('gemini-copy-generation.settings.json'),geminiSettings=read('gemini-copy-review.settings.json'),chatgptSettings=read('chatgpt-copy-review.settings.json')
const gemini=read('gemini-copy-review.raw.json'),chatgpt=read('chatgpt-copy-review.raw.json')
const variants=raw.variants.map(variant=>{
  if(variant.text.length!==variant.character_count)throw new Error('Provider character count mismatch')
  for(const trace of variant.fact_trace)if(!variant.text.includes(trace.phrase)||trace.phrase!==facts[trace.fact_id])throw new Error('Provider source phrase mismatch')
  const record=CopyRecordSchema.parse({id:variant.id,briefId:raw.brief_id,text:variant.text,startsOn:facts.starts_on,endsOn:facts.ends_on,status:'draft',approval:{scope:'production',actor:null,humanReviewed:false,date:null},factTrace:variant.fact_trace.map(trace=>({phrase:trace.phrase,fact:mapping[trace.fact_id]}))})
  return {record,characterCount:variant.text.length,connectiveWording:variant.connective_wording}
})
if(new Set(variants.map(variant=>variant.record.id)).size!==3)throw new Error('Duplicate provider IDs')
const actualPrompt=fs.readFileSync(path.join(source,'actual-copy-review.prompt.txt'),'utf8')
const samePrompt=geminiSettings.prompt===chatgptSettings.prompt
if(!samePrompt||actualPrompt.trimEnd()!==geminiSettings.prompt.trimEnd())throw new Error('Review prompts differ')
for(const review of [gemini,chatgpt])for(const variant of variants){const item=review.reviews.find((item:{id:string})=>item.id===variant.record.id);if(!item||item.recomputed_character_count!==variant.characterCount||item.verdict!=='needs_human_review')throw new Error('Unexpected review/count/approval result')}
const sourceFiles=['gemini-copy-generation.raw.json','gemini-copy-generation.settings.json','gemini-copy-review.raw.json','gemini-copy-review.settings.json','chatgpt-copy-review.raw.json','chatgpt-copy-review.settings.json','actual-copy-review.prompt.txt','copy-generation.prompt.txt','source-facts.json']
const artifacts=sourceFiles.map(name=>{const bytes=fs.readFileSync(path.join(source,name));fs.writeFileSync(path.join(destination,name),bytes);return {path:`${destination}/${name}`,sha256:hash(bytes)}})
const generationHasUtc=generationSettings.prompt.includes('The fixture dates are UTC campaign boundaries')
const reviewContext=geminiSettings.prompt.slice(0,geminiSettings.prompt.indexOf('CANDIDATE DRAFT JSON FOLLOWS:'))
const checks={capturedAtUTC:new Date().toISOString(),variants:variants.map(variant=>({id:variant.record.id,actualCharacters:variant.characterCount,under120:variant.characterCount<120,exactSourceTraces:true,status:'draft',humanReviewed:false})),sameReviewPromptExact:samePrompt,savedPromptMatchesAfterTrimming:actualPrompt.trimEnd()===geminiSettings.prompt.trimEnd(),generationContextIncludesUtc:generationHasUtc,reviewSourceContextIncludesUtc:reviewContext.includes('UTC'),contextInterpretation:'The generation instruction explicitly supplied UTC context. The review source-facts prefix omitted it. Both UTC critiques must be interpreted against that context difference; raw outputs and variant3 remain unchanged and draft.',modelComparisons:{geminiPreferred:gemini.comparison.most_fact_faithful_id,chatgptPreferred:chatgpt.comparison.most_fact_faithful_id},humanApproval:{status:'pending',actor:null,scope:null},artifacts}
const batch={briefId:raw.brief_id,source:{tool:generationSettings.tool,model:generationSettings.model,capturedAt:generationSettings.capturedAt,structuredOutputs:generationSettings.structuredOutputs,rawSha256:artifacts[0].sha256},variants}
fs.writeFileSync('config/mfalujo23-provider-copy-drafts.json',JSON.stringify(batch,null,2)+'\n')
fs.writeFileSync(`${destination}/local-validation.json`,JSON.stringify(checks,null,2)+'\n')
console.log(JSON.stringify({actualDrafts:variants.length,lengths:variants.map(variant=>variant.characterCount),sameReviewPrompt:samePrompt,geminiPreferred:checks.modelComparisons.geminiPreferred,chatgptPreferred:checks.modelComparisons.chatgptPreferred,generationHasUtc,reviewPrefixHasUtc:checks.reviewSourceContextIncludesUtc,humanApproval:'pending'}))
