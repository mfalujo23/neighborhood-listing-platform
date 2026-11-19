// Called only by an explicit local demo button. Nothing is persisted or sent.
export async function captureMediaPerformance(lcpMs: number | null, lcpElement: string | null = null, observerStatus = 'not-provided') {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const images = [...document.querySelectorAll<HTMLImageElement>('img[data-media-asset]')]
  const records = await Promise.all(images.map(async (image) => {
    const url = new URL(image.currentSrc || image.src)
    const matches = resources.filter((entry) => entry.name === url.href && ['img', 'link'].includes(entry.initiatorType))
    const timing = matches.filter((entry) => entry.transferSize > 0).at(-1) ?? matches.at(-1)
    let contentType: string | null = null; let headerStatus: number | null = null
    if (url.origin === location.origin && url.pathname.startsWith('/mfalujo23-media/')) {
      try { const response = await fetch(url.href, { method: 'HEAD', cache: 'no-store' }); contentType = response.headers.get('content-type'); headerStatus = response.status } catch { /* Unknown stays null. */ }
    }
    return {
      assetId: image.dataset.mediaAsset, path: url.pathname, currentSrc: url.href, requestURL: timing?.name ?? null,
      initiatorType: timing?.initiatorType ?? null, complete: image.complete, renderedCssWidth: image.getBoundingClientRect().width,
      naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
      transferBytes: timing?.transferSize ?? null, encodedBodyBytes: timing?.encodedBodySize ?? null,
      downloadMs: timing ? timing.responseEnd - timing.responseStart : null,
      requestDurationMs: timing?.duration ?? null, contentType, headerStatus,
      matchingImageRequests: matches.map((entry) => ({requestURL:entry.name,initiatorType:entry.initiatorType,transferBytes:entry.transferSize,encodedBodyBytes:entry.encodedBodySize,downloadMs:entry.responseEnd-entry.responseStart})),
      timingSelection: 'Latest positive-transfer exact currentSrc match among img/link; otherwise latest exact match. HEAD fetch entries excluded.',
      contentTypeSource: 'Separate same-origin HEAD request; ResourceTiming does not expose MIME.',
    }
  }))
  return { capturedAtUTC: new Date().toISOString(), page: location.pathname, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, lcpMs, lcpElement,
    lcpDiagnostics: {observerStatus,supportedEntryTypes:typeof PerformanceObserver==='undefined'?[]:PerformanceObserver.supportedEntryTypes,visibilityState:document.visibilityState,documentHidden:document.hidden,documentHasFocus:document.hasFocus(),observedLcpAvailable:lcpMs!==null},
    observedDocumentAndResourceTransferBytes: (navigation?.transferSize ?? 0) + resources.reduce((sum, entry) => sum + entry.transferSize, 0),
    observedEncodedDocumentAndResourceBytes: (navigation?.encodedBodySize ?? 0) + resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
    resourceEntryCount: resources.length,
    pageWeightDefinition: 'Sum of available navigation/resource timing entries before the separate MIME HEAD requests. Earlier interactions, development HMR, caching and buffer limits can affect this observation; use a fresh controlled reload.',
    lcpDefinition: 'Last observed largest-contentful-paint startTime from this navigation; null means unavailable.',
    cacheNote: 'Zero transfer bytes can indicate a cache hit. Record the actual cache policy and transport profile; this capture does not change browser settings.',
    telemetry: 'Local in-memory audit only; no external recipient, storage, provider or user identity.', records }
}
