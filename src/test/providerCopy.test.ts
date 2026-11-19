import fs from 'node:fs'
import crypto from 'node:crypto'
import {describe,expect,test} from 'vitest'
import batch from '../../config/mfalujo23-provider-copy-drafts.json'
import {ProviderDraftBatchSchema,providerCopyDrafts} from '../media/provider-copy'
import {fictionalSponsorBrief as brief} from '../media/copy-drafts'
import {selectDisplayCopy,validateCopySubmission} from '../media/copy'

const clock=()=>new Date('2026-11-19T12:00:00Z')
const directory='docs/mfalujo23/provider-artifacts/lab7'
describe('Actual provider response import and draft boundary',()=>{
  test('raw response is preserved exactly and normalized text/counts remain83/102/110',()=>{
    const bytes=fs.readFileSync(`${directory}/gemini-copy-generation.raw.json`)
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(batch.source.rawSha256)
    const raw=JSON.parse(bytes.toString())
    expect(providerCopyDrafts.map(record=>record.text)).toEqual(raw.variants.map((variant:{text:string})=>variant.text))
    expect(providerCopyDrafts.map(record=>record.text.length)).toEqual([83,102,110])
  })
  test('all actual variants validate for review but neither test nor production publication',()=>{
    for(const record of providerCopyDrafts){expect(validateCopySubmission({briefId:record.briefId,text:record.text,startsOn:record.startsOn,endsOn:record.endsOn},brief,clock)).toMatchObject({valid:true,status:'draft',humanApprovalRequired:true});expect(selectDisplayCopy(record,brief,'production',clock).visible).toBe(false);expect(selectDisplayCopy(record,brief,'fixture_test',clock).visible).toBe(false)}
  })
  test('a model approval flag, human identity or incorrect count invalidates the imported batch',()=>{
    const approved=structuredClone(batch);approved.variants[0].record.status='approved';expect(ProviderDraftBatchSchema.safeParse(approved).success).toBe(false)
    const wrong=structuredClone(batch);wrong.variants[0].characterCount++;expect(ProviderDraftBatchSchema.safeParse(wrong).success).toBe(false)
  })
  test('the same actual review prompt was sent to both tools and their preferences are preserved',()=>{
    const geminiSettings=JSON.parse(fs.readFileSync(`${directory}/gemini-copy-review.settings.json`,'utf8')),chatSettings=JSON.parse(fs.readFileSync(`${directory}/chatgpt-copy-review.settings.json`,'utf8'))
    expect(geminiSettings.prompt).toBe(chatSettings.prompt)
    const gemini=JSON.parse(fs.readFileSync(`${directory}/gemini-copy-review.raw.json`,'utf8')),chat=JSON.parse(fs.readFileSync(`${directory}/chatgpt-copy-review.raw.json`,'utf8'))
    expect(gemini.comparison.most_fact_faithful_id).toBe('variant-1');expect(chat.comparison.most_fact_faithful_id).toBe('variant-2')
    expect([...gemini.reviews,...chat.reviews].every(review=>review.verdict==='needs_human_review')).toBe(true)
  })
  test('UTC context difference is recorded without changing the raw third variant',()=>{
    const checks=JSON.parse(fs.readFileSync(`${directory}/local-validation.json`,'utf8'))
    expect(checks).toMatchObject({generationContextIncludesUtc:true,reviewSourceContextIncludesUtc:false,humanApproval:{status:'pending',actor:null}})
    expect(providerCopyDrafts[2].text).toContain('UTC')
  })
  test('structured-output enforcement is not claimed for the actual UI run',()=>{
    const settings=JSON.parse(fs.readFileSync(`${directory}/gemini-copy-generation.settings.json`,'utf8'))
    expect(settings).toMatchObject({model:'gemini-4-hydrogen',thinking:'High',structuredOutputs:false})
    const chat=JSON.parse(fs.readFileSync(`${directory}/chatgpt-copy-review.settings.json`,'utf8'))
    expect(chat).toMatchObject({modelLabel:'Instant',exactModelVersionNotExposed:true})
  })
})
