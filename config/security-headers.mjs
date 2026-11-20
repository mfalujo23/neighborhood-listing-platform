// This CSP enforces framing/base/form/object boundaries. Script/style nonces
// require a separately tested dynamic-rendering policy; none are claimed here.
export const baselineCsp = "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"

export function securityHeaders(production = false) {
  const headers = [
    { key: 'Content-Security-Policy', value: baselineCsp },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ]
  if (production) headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000' })
  return headers
}
