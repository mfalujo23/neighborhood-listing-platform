import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// The verified /api/webhooks/voice contract replaces the inherited handler.
// Retired requests never parse caller data, construct provider clients or send.
function retired() {
  return NextResponse.json(
    { error: 'LEGACY_WEBHOOK_RETIRED' },
    { status: 410, headers: { 'Cache-Control': 'no-store', Link: '</api/webhooks/voice>; rel="successor-version"' } },
  )
}

export const GET = retired
export const POST = retired
