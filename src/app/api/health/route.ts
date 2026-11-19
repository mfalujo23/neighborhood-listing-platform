const headers = { 'Cache-Control': 'no-store' }

export const dynamic = 'force-dynamic'

export function GET() {
  const configured = process.env.VERCEL_GIT_COMMIT_SHA
  const commit = configured && /^[0-9a-f]{40}$/i.test(configured) ? configured : 'local'
  return Response.json({
    status: 'ok',
    level: 'liveness',
    service: 'neighborhood-listing-platform',
    commit,
    checks: {
      application: 'running',
      database: 'not_checked',
      voice_provider: 'not_checked',
    },
  }, { headers })
}

export function HEAD() {
  return new Response(null, { status: 200, headers })
}
