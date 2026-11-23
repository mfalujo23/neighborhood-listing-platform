type Fetch = (url: string, init?: RequestInit) => Promise<Response>
export async function smokeDeployment(base: string, expectedCommit: string, options: { applicationOnly?: boolean; fetchImpl?: Fetch } = {}) {
  const origin = new URL(base)
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password
      || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname)))) {
    throw new Error('SMOKE_REQUIRES_HTTPS_OR_LOOPBACK_ORIGIN')
  }
  if (expectedCommit !== 'local' && !/^[0-9a-f]{40}$/i.test(expectedCommit)) throw new Error('SMOKE_COMMIT_REQUIRED')
  const fetchImpl = options.fetchImpl ?? fetch
  const results: { path: string; status: number; passed: boolean; reason?: string }[] = []
  const paths = ['/', '/api/health', '/api/admin/bookings', '/api/webhooks/twilio', ...(!options.applicationOnly ? ['/api/services'] : [])]
  for (const path of paths) {
    try {
      const response = await fetchImpl(new URL(path, origin).href, { redirect: 'error', signal: AbortSignal.timeout(15_000), cache: 'no-store' })
      let passed = response.status === (path === '/api/admin/bookings' ? 401 : path === '/api/webhooks/twilio' ? 410 : 200)
      if (path === '/api/health') {
        const data = await response.json() as Record<string, unknown>
        passed = passed && data.status === 'ok' && data.level === 'liveness' && data.commit === expectedCommit
      }
      if (path === '/api/services') {
        const data: unknown = await response.json()
        const rows = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).join(',') === 'data' && 'data' in data ? data.data : null
        passed = passed && Array.isArray(rows) && rows.length > 0 && rows.every((row) => {
          if (!row || typeof row !== 'object') return false
          return Object.keys(row).sort().join(',') === 'coverage_radius_miles,duration_minutes,hourly_rate,id,title'
        })
      }
      passed = passed && response.headers.get('x-content-type-options') === 'nosniff'
      results.push({ path, status: response.status, passed })
    } catch {
      // Never retain a response body, auth header, query string, or transport error.
      results.push({ path, status: 0, passed: false, reason: 'REQUEST_OR_CONTRACT_FAILED' })
    }
  }
  return { passed: results.every((result) => result.passed), applicationOnly: options.applicationOnly === true,
    sourceCommit: expectedCommit, hosted: origin.protocol === 'https:' && expectedCommit !== 'local', results }
}

// The provider adapter must be supplied and approved by the deployment owner.
// A successful rollback still fails the candidate release.
export async function monitorAndRollback(checkCandidate: () => Promise<boolean>, restorePrevious: () => Promise<void>, checkPrevious: () => Promise<boolean>) {
  let candidatePassed = false
  try { candidatePassed = await checkCandidate() } catch { /* Transport failure is a failed smoke check. */ }
  if (candidatePassed) return { releasePassed: true, rollback: 'not_needed' as const }
  try {
    await restorePrevious()
    return { releasePassed: false, rollback: await checkPrevious() ? 'verified' as const : 'verification_failed' as const }
  } catch { return { releasePassed: false, rollback: 'failed' as const } }
}
