import { createVoiceWebhookHandler, methodNotAllowed } from '../../../../lib/telephony-webhook.js';

// Real outbound SMS remains unavailable until a reviewed provider adapter is wired.
export const runtime = 'nodejs';
export const POST = createVoiceWebhookHandler();
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
