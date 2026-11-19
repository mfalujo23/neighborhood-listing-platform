import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAX_BODY_BYTES = 16 * 1024;
const XML_TYPE = 'text/xml; charset=utf-8';
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const UNAVAILABLE_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>We are temporarily unavailable. Please try again later.</Say><Hangup/></Response>';
const CALL_STATUSES = new Set([
  'queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled',
]);

export function redactPhone(phone) {
  const digits = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
}

// Never pass raw request bodies, errors, headers, or credentials to this logger.
export function logEvent({ eventId, status, phone }, write = console.log) {
  write(JSON.stringify({ eventId, status, phoneSuffix: redactPhone(phone) }));
}

export function computeSignature(authToken, url, params) {
  const data = Object.keys(params).sort().reduce((value, key) => value + key + params[key], url);
  return crypto.createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
}

export function verifySignature(providedSig, params, env = process.env) {
  if (!providedSig || !env.TWILIO_AUTH_TOKEN || !env.PUBLIC_CALLBACK_URL) return false;
  const expected = Buffer.from(computeSignature(env.TWILIO_AUTH_TOKEN, env.PUBLIC_CALLBACK_URL, params));
  const provided = Buffer.from(providedSig);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

export function buildSmsConfirmation(projectName) {
  return `${projectName}: We received your call and logged your request. Reply STOP to opt out.`;
}

export async function maybeSendConfirmationSms({
  eventId, toPhone, hasExplicitConsent, smsClient, env = process.env, logger = console.log,
}) {
  if (!hasExplicitConsent) return { sent: false, reason: 'no_consent' };
  if (env.ENABLE_OUTBOUND_SMS !== 'true') return { sent: false, reason: 'flag_disabled' };
  if (typeof smsClient?.send !== 'function') return { sent: false, reason: 'client_unavailable' };

  const body = buildSmsConfirmation(env.PROJECT_NAME || 'Neighborhood Listing Platform');
  await smsClient.send({ to: toPhone, body, idempotencyKey: eventId });
  logEvent({ eventId, status: 'sms_dispatched', phone: toPhone }, logger);
  return { sent: true };
}

// Explicit local simulator only; exclusive file creation is atomic across local processes.
export function createLocalFileEventStore(directory) {
  return {
    async claim(record) {
      fs.mkdirSync(directory, { recursive: true });
      const key = crypto.createHash('sha256').update(record.eventId).digest('hex');
      try {
        fs.writeFileSync(path.join(directory, `${key}.json`), JSON.stringify(record), { flag: 'wx', mode: 0o600 });
        return true;
      } catch (error) {
        if (error.code === 'EEXIST') return false;
        throw new Error('Idempotency store unavailable');
      }
    },
  };
}

// A primary-key insert claims the provider ID atomically across hosted instances.
// The accompanying SQL migration is required; credentials remain server-only.
export function createSupabaseEventStore({ url, serviceRoleKey, fetchImpl = fetch }) {
  if (!url || !serviceRoleKey) throw new Error('Durable idempotency store is not configured');
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/telephony_webhook_events`;
  return {
    async claim(record) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          event_id: record.eventId,
          call_status: record.status,
          phone_suffix: record.phoneSuffix,
          processed_at: record.processedAt,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return true;
      if (response.status === 409) {
        const error = await response.json().catch(() => null);
        if (error?.code === '23505') return false;
      }
      throw new Error('Durable idempotency store unavailable');
    },
  };
}

export function configuredEventStore(env = process.env) {
  const hosted = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  if (env.WEBHOOK_STORE_DRIVER === 'local-file' && !hosted) {
    return createLocalFileEventStore(env.WEBHOOK_LOCAL_STORE_DIR || path.join(process.cwd(), 'data', 'webhook-events'));
  }
  if (env.WEBHOOK_STORE_DRIVER === 'supabase') {
    return createSupabaseEventStore({ url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY });
  }
  throw new Error('A durable event store is required for hosted webhook processing');
}

async function readBoundedBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return { error: new Response('Payload Too Large', { status: 413 }) };
  }
  const reader = request.body?.getReader();
  if (!reader) return { text: '' };
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return { error: new Response('Payload Too Large', { status: 413 }) };
    }
    chunks.push(value);
  }
  return { text: Buffer.concat(chunks).toString('utf8') };
}

export function methodNotAllowed() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}

function unavailableVoiceResponse() {
  // Acknowledges delivery of voice instructions, not successful processing.
  // Do not include caller data, raw errors, or a claim that work was recorded.
  return new Response(UNAVAILABLE_TWIML, { status: 200, headers: { 'Content-Type': XML_TYPE } });
}

export function createVoiceWebhookHandler({ store, smsClient, env = process.env, logger = console.log } = {}) {
  return async function handleVoiceWebhook(request) {
    if (request.method !== 'POST') return methodNotAllowed();
    const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/x-www-form-urlencoded') return new Response('Unsupported Media Type', { status: 415 });

    let body;
    try {
      body = await readBoundedBody(request);
    } catch {
      return new Response('Invalid request body', { status: 400 });
    }
    if (body.error) return body.error;
    const form = new URLSearchParams(body.text);
    const params = Object.fromEntries(form);
    if (Array.from(form.keys()).length !== Object.keys(params).length) {
      return new Response('Repeated webhook fields are not supported', { status: 400 });
    }
    if (!verifySignature(request.headers.get('x-twilio-signature'), params, env)) {
      return new Response('Invalid signature', { status: 403 });
    }

    const { CallSid, From, CallStatus, Consent } = params;
    if (!/^CA[0-9a-f]{32}$/i.test(CallSid || '') || !/^\+[1-9]\d{7,14}$/.test(From || '') || !CALL_STATUSES.has(CallStatus)) {
      return new Response('Missing or invalid required webhook fields', { status: 400 });
    }
    const hasExplicitConsent = Consent === 'true';
    if (hasExplicitConsent && env.ENABLE_OUTBOUND_SMS === 'true' && typeof smsClient?.send !== 'function') {
      logEvent({ eventId: CallSid, status: 'sms_client_unavailable', phone: From }, logger);
      logEvent({ eventId: CallSid, status: 'processing_unavailable', phone: From }, logger);
      return unavailableVoiceResponse();
    }

    try {
      const eventStore = store || configuredEventStore(env);
      const accepted = await eventStore.claim({
        eventId: CallSid, status: CallStatus, phoneSuffix: redactPhone(From), processedAt: new Date().toISOString(),
      });
      if (!accepted) {
        logEvent({ eventId: CallSid, status: 'duplicate_ignored', phone: From }, logger);
        return new Response(EMPTY_TWIML, { status: 200, headers: { 'Content-Type': XML_TYPE } });
      }
      logEvent({ eventId: CallSid, status: 'event_accepted', phone: From }, logger);
      const sms = await maybeSendConfirmationSms({ eventId: CallSid, toPhone: From, hasExplicitConsent, smsClient, env, logger });
      if (!sms.sent) logEvent({ eventId: CallSid, status: `sms_${sms.reason}`, phone: From }, logger);
      const name = escapeXml(env.PROJECT_NAME || 'Neighborhood Listing Platform');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for calling ${name}. Your request has been recorded.</Say></Response>`;
      return new Response(twiml, { status: 200, headers: { 'Content-Type': XML_TYPE } });
    } catch {
      // Keep a claim after ambiguous delivery failure: retries must not send twice.
      logEvent({ eventId: CallSid, status: 'processing_unavailable', phone: From }, logger);
      return unavailableVoiceResponse();
    }
  };
}
