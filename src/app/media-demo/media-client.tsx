'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { MediaAsset } from '../../media/schema'
import { fictionalSponsorBrief, copyDrafts } from '../../media/copy-drafts'
import { validateCopySubmission } from '../../media/copy'
import { captureMediaPerformance } from '../../media/performance'
import { exactMediaLoader } from '../../media/renditions'
import {providerCopyDrafts,providerDraftDataAvailable,providerDraftReviewRows} from '../../media/provider-copy'
import styles from './media.module.css'

function AssetImage({ asset, baseline = false, broken = false, navigation = false }: { asset: MediaAsset; baseline?: boolean; broken?: boolean; navigation?: boolean }) {
  const [failed, setFailed] = useState(false)
  const raster = asset.category === 'property-photo'
  const source = broken ? '/mfalujo23-media/simulated-missing.webp' : baseline && raster ? '/mfalujo23-media/property-baseline-1280.jpg' : asset.src
  const loader = exactMediaLoader(asset.renditions)
  return <div className={navigation ? styles.icon : styles.frame} style={{ aspectRatio: `${asset.width}/${asset.height}` }}>
    {failed ? <div className={styles.fallback} role={asset.purpose === 'decorative' ? undefined : 'img'} aria-hidden={asset.purpose === 'decorative' ? true : undefined} aria-label={asset.purpose === 'decorative' ? undefined : `Image unavailable. ${asset.alt}`}>
      {navigation ? '⌂' : 'Image unavailable — the description and page actions remain available.'}
    </div> : <Image
      data-media-asset={asset.id} src={source} alt={asset.purpose === 'decorative' ? '' : asset.alt}
      width={asset.width} height={asset.height}
      sizes={navigation ? '32px' : raster ? '(max-width: 600px) calc(100vw - 62px), (max-width: 1100px) calc(100vw - 102px), 998px' : '(max-width: 600px) calc(100vw - 62px), (max-width: 742px) calc(100vw - 102px), 640px'}
      {...(raster && !baseline && !broken ? { loader } : { unoptimized: true })}
      loading={raster || navigation ? 'eager' : 'lazy'} fetchPriority={raster ? 'high' : 'auto'}
      className={styles.image} onError={() => setFailed(true)}
    />}
  </div>
}

export default function MediaDemo({ assets, displayCopy, baseline = false, productionCount }: { assets: MediaAsset[]; displayCopy: { text: string; disclosure: string; endsOn: string } | null; baseline?: boolean; productionCount: number }) {
  const reviewDrafts=providerCopyDrafts.length?providerCopyDrafts:copyDrafts
  const [broken, setBroken] = useState(false)
  const [copyText, setCopyText] = useState(reviewDrafts[0].text)
  const [endDate, setEndDate] = useState(fictionalSponsorBrief.endsOn)
  const [validation, setValidation] = useState('Draft review sandbox. Validation never approves or publishes copy.')
  const [copyExpired, setCopyExpired] = useState(false)
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof captureMediaPerformance>> | null>(null)
  const lcp = useRef<number | null>(null)
  const lcpElement = useRef<string | null>(null)
  const lcpObserverStatus = useRef('not-started')
  useEffect(() => {
    if (!displayCopy) return
    const expiration = Date.parse(`${displayCopy.endsOn}T00:00:00Z`) + 86400000
    const timer = setTimeout(() => setCopyExpired(true), Math.max(0, expiration - Date.now()))
    return () => clearTimeout(timer)
  }, [displayCopy])
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined' || !PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) { lcpObserverStatus.current = 'unsupported'; return }
    const observer = new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1) as (PerformanceEntry & { element?: Element }) | undefined
      if (last) { lcp.current = last.startTime; lcpElement.current = last.element ? `${last.element.tagName}:${last.element.getAttribute('data-media-asset') ?? 'no-asset-id'}` : null }
    })
    try { observer.observe({ type: 'largest-contentful-paint', buffered: true }); lcpObserverStatus.current = 'observing' }
    catch { lcpObserverStatus.current = 'registration-failed' }
    return () => observer.disconnect()
  }, [])
  const property = assets.find((asset) => asset.category === 'property-photo')!
  const banner = assets.find((asset) => asset.category === 'partner-banner')!
  const icon = assets.find((asset) => asset.category === 'navigation-icon')!
  async function validateDraft() {
    const input = { briefId: fictionalSponsorBrief.id, text: copyText, startsOn: fictionalSponsorBrief.startsOn, endsOn: endDate }
    const local = validateCopySubmission(input, fictionalSponsorBrief)
    if (!local.valid) { setValidation(`UI validation: ${local.error.code}. Nothing published.`); return }
    try {
      const response = await fetch('/api/media/validate-copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      const result = await response.json()
      setValidation(response.ok ? 'Server validated the draft. Human approval is still required; nothing published.' : `Server validation: ${result.error?.code ?? 'UNAVAILABLE'}. Nothing published.`)
    } catch { setValidation('Validation service unavailable. Nothing published.') }
  }
  return <main className={styles.main}>
    <nav><Link href="/" className={styles.home}><AssetImage asset={icon} navigation />Home</Link><Link href="/media-demo">Optimized assets</Link><Link href="/media-demo/baseline">JPEG baseline</Link></nav>
    <header><p className={styles.label}>FICTIONAL CLASSROOM MEDIA</p><h1>Property and partner media</h1>
      <p>AI-generated fictional property and classroom partner media.</p>
      <p>{baseline ? 'JPEG baseline comparison.' : 'Responsive WebP comparison.'}</p>
    </header>
    <section className={styles.panel} aria-labelledby="property-title"><h2 id="property-title">Asset A — fictional property image</h2>
      <AssetImage key={`${baseline}-${broken}`} asset={property} baseline={baseline} broken={broken} />
      <p>AI-generated fictional cream house, wood entrance and front garden. Test-only asset approval; production human review pending.</p>
      <button onClick={() => setBroken(!broken)} aria-pressed={broken}>{broken ? 'Restore property image' : 'Simulate missing property image'}</button>
    </section>
    <aside className={styles.panel} aria-labelledby="partner-title"><p className={styles.label}>{!copyExpired && displayCopy ? displayCopy.disclosure : 'House message · no active approved fixture copy'}</p><h2 id="partner-title">Asset B — Fictional Garden Partner</h2>
      <div className={styles.banner}><AssetImage asset={banner} /></div>
      {!copyExpired && displayCopy ? <p>{displayCopy.text}</p> : <p>The fictional copy is inactive or expired. No campaign text is displayed.</p>}
      <p>Classroom test fixture. Human production approval is pending ({productionCount} assets approved).</p>
      <Link href="/media-demo/partner" aria-label="Open the Fictional Garden Partner classroom example">View fictional partner example</Link>
    </aside>
    <section className={styles.panel}><h2>Asset C — navigation graphic</h2><p>The house icon in the Home link is decorative because the adjacent “Home” text provides its accessible name. It uses <code>alt=&quot;&quot;</code> and a fixed 32px box.</p></section>
    <section className={styles.panel}><h2>Draft review queue</h2><p>Draft copy requires human approval.</p>
      {providerDraftDataAvailable?<table><caption>Unpublished draft variants</caption><thead><tr><th scope="col">Variant</th><th scope="col">Draft text</th><th scope="col">Characters</th><th scope="col">Status</th></tr></thead><tbody>{providerDraftReviewRows.map(row=><tr key={row.record.id}><th scope="row">{row.record.id}</th><td>{row.record.text}</td><td>{row.characterCount}</td><td>Awaiting human approval</td></tr>)}</tbody></table>:<p>Draft queue unavailable.</p>}
      <label>Review draft<select onChange={(event) => {const draft=reviewDrafts[Number(event.target.value)];if(draft)setCopyText(draft.text)}}>{reviewDrafts.map((draft, index) => <option key={draft.id} value={index}>Draft {index + 1}</option>)}</select></label>
      <label>Draft text (maximum 120 characters)<textarea value={copyText} maxLength={120} onChange={(event) => setCopyText(event.target.value)} /></label><p>{copyText.length} / 120 characters</p>
      <label>Offer end date (UTC)<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
      <button onClick={validateDraft}>Validate draft with server</button><p role="status">{validation}</p>
    </section>
    <section className={styles.panel}><h2>Browser measurement</h2><p>Wait for images to load, then capture the page at the recorded viewport and test conditions.</p>
      <button onClick={async () => setMetrics(await captureMediaPerformance(lcp.current, lcpElement.current, lcpObserverStatus.current))}>Capture browser metrics</button>
      {metrics && <pre className={styles.output} tabIndex={0}>{JSON.stringify(metrics, null, 2)}</pre>}
    </section>
  </main>
}
