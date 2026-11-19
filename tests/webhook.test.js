import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GET } from '../src/app/api/webhooks/voice/route.js';
import {
  computeSignature, createLocalFileEventStore, createSupabaseEventStore,
  createVoiceWebhookHandler, configuredEventStore, maybeSendConfirmationSms,
} from '../src/lib/telephony-webhook.js';

// Fictional NANP 555-01xx numbers; tests never contact a provider or a database.
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/inbound-call.json', import.meta.url), 'utf8'));
let env;
let store;
let directory;
let logs;
let handler;

async function assertUnavailableVoiceResponse(response) {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/xml; charset=utf-8');
  const xml = await response.text();
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?><Response><Say>[^<]+<\/Say><Hangup\/><\/Response>$/);
  assert.match(xml, /temporarily unavailable.*try again later/);
  assert.doesNotMatch(xml, /recorded|sent|transfer|<Dial|<Redirect|<Record|<Message/);
  return xml;
}

function request(payload = fixture, options = {}) {
  const signature = options.signature === undefined
    ? computeSignature(env.TWILIO_AUTH_TOKEN, env.PUBLIC_CALLBACK_URL, payload)
    : options.signature;
  const headers = { 'Content-Type': options.contentType || 'application/x-www-form-urlencoded', ...options.headers };
  if (signature) headers['X-Twilio-Signature'] = signature;
  return new Request(env.PUBLIC_CALLBACK_URL, {
    method: 'POST', headers, body: options.body || new URLSearchParams(payload).toString(),
  });
}

function makeHandler(options = {}) {
  return createVoiceWebhookHandler({ env, store, logger: (line) => logs.push(line), ...options });
}

describe('Lab 9: signature, idempotency, consent, and privacy', () => {
  beforeEach(() => {
    env = {
      TWILIO_AUTH_TOKEN: 'offline-test-token-not-a-credential',
      PUBLIC_CALLBACK_URL: 'http://localhost:3000/api/webhooks/voice',
      ENABLE_OUTBOUND_SMS: 'false',
      PROJECT_NAME: 'Neighborhood Listing Platform',
    };
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lab9-synthetic-test-'));
    store = createLocalFileEventStore(directory);
    logs = [];
    handler = makeHandler();
  });

  it('accepts a valid signed form and returns XML', async () => {
    const result = await handler(request());
    assert.equal(result.status, 200);
    assert.match(result.headers.get('content-type'), /^text\/xml/);
    assert.match(await result.text(), /^<\?xml.*<Response><Say>.*<\/Say><\/Response>$/);
  });

  it('rejects invalid and missing signatures without persisting an event', async () => {
    for (const signature of ['forged-signature', null]) {
      assert.equal((await handler(request(fixture, { signature }))).status, 403);
    }
    assert.equal(fs.readdirSync(directory).length, 0);
  });

  it('rejects a payload changed after signing', async () => {
    const signature = computeSignature(env.TWILIO_AUTH_TOKEN, env.PUBLIC_CALLBACK_URL, fixture);
    assert.equal((await handler(request({ ...fixture, Consent: 'true' }, { signature }))).status, 403);
  });

  it('uses the configured callback URL rather than Host headers', async () => {
    const forged = computeSignature(env.TWILIO_AUTH_TOKEN, 'https://attacker.invalid/api/webhooks/voice', fixture);
    const result = await handler(request(fixture, { signature: forged, headers: { Host: 'attacker.invalid' } }));
    assert.equal(result.status, 403);
  });

  it('rejects missing and malformed required fields even when signed', async () => {
    const { CallStatus: removedStatus, ...withoutStatus } = fixture;
    assert.ok(removedStatus);
    for (const payload of [withoutStatus, { ...fixture, CallSid: '__proto__' }, { ...fixture, From: 'not-a-phone' }]) {
      assert.equal((await handler(request(payload))).status, 400);
    }
  });

  it('rejects ambiguous repeated form fields', async () => {
    const body = `${new URLSearchParams(fixture)}&Consent=true`;
    assert.equal((await handler(request(fixture, { body }))).status, 400);
  });

  it('enforces methods and an exact documented content type', async () => {
    assert.equal(GET().status, 405);
    assert.equal(GET().headers.get('allow'), 'POST');
    assert.equal((await handler(new Request(env.PUBLIC_CALLBACK_URL, { method: 'PUT' }))).status, 405);
    assert.equal((await handler(request(fixture, { contentType: 'application/json' }))).status, 415);
    assert.equal((await handler(request(fixture, { contentType: 'application/x-www-form-urlencoded-evil' }))).status, 415);
    assert.equal((await handler(request(fixture, { contentType: 'application/x-www-form-urlencoded; charset=utf-8' }))).status, 200);
  });

  it('rejects oversized streamed bodies before signature or persistence', async () => {
    const oversized = { ...fixture, Extra: 'x'.repeat(20000) };
    assert.equal((await handler(request(oversized))).status, 413);
    assert.equal(fs.readdirSync(directory).length, 0);
  });

  it('prevents two sends when duplicate requests arrive concurrently', async () => {
    env.ENABLE_OUTBOUND_SMS = 'true';
    const sent = [];
    handler = makeHandler({ smsClient: { send: async (message) => sent.push(message) } });
    const payload = { ...fixture, Consent: 'true' };
    const responses = await Promise.all([handler(request(payload)), handler(request(payload))]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    assert.equal(sent.length, 1);
    assert.match(sent[0].body, /Reply STOP to opt out\./);
    assert.equal(sent[0].idempotencyKey, fixture.CallSid);
    assert.ok((await Promise.all(responses.map((response) => response.text()))).includes('<?xml version="1.0" encoding="UTF-8"?><Response></Response>'));
  });

  it('retains duplicate protection across separate local adapter instances', async () => {
    assert.equal((await handler(request())).status, 200);
    const restartedHandler = makeHandler({ store: createLocalFileEventStore(directory) });
    const retry = await restartedHandler(request());
    assert.equal(retry.status, 200);
    assert.equal(await retry.text(), '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });

  it('sends nothing without explicit consent, or with the default-disabled flag', async () => {
    let sends = 0;
    const smsClient = { send: async () => { sends += 1; } };
    env.ENABLE_OUTBOUND_SMS = 'true';
    assert.equal((await makeHandler({ smsClient })(request())).status, 200);
    env.ENABLE_OUTBOUND_SMS = 'false';
    const payload = { ...fixture, CallSid: 'CA00000000000000000000000000000002', Consent: 'true' };
    assert.equal((await makeHandler({ smsClient })(request(payload))).status, 200);
    assert.equal(sends, 0);
  });

  it('never reports a successful SMS without a configured client', async () => {
    env.ENABLE_OUTBOUND_SMS = 'true';
    const result = await maybeSendConfirmationSms({
      eventId: fixture.CallSid, toPhone: fixture.From, hasExplicitConsent: true, env, logger: (line) => logs.push(line),
    });
    assert.deepEqual(result, { sent: false, reason: 'client_unavailable' });
    await assertUnavailableVoiceResponse(await handler(request({ ...fixture, Consent: 'true' })));
    assert.equal(fs.readdirSync(directory).length, 0);
    assert.ok(logs.every((line) => !line.includes('sms_dispatched')));
    assert.ok(logs.some((line) => JSON.parse(line).status === 'processing_unavailable'));
  });

  it('does not send twice after an ambiguous provider failure', async () => {
    env.ENABLE_OUTBOUND_SMS = 'true';
    let attempts = 0;
    handler = makeHandler({ smsClient: { send: async () => { attempts += 1; throw new Error('Synthetic ambiguous failure'); } } });
    const payload = { ...fixture, Consent: 'true' };
    await assertUnavailableVoiceResponse(await handler(request(payload)));
    const retry = await handler(request(payload));
    assert.equal(retry.status, 200);
    assert.equal(await retry.text(), '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    assert.equal(attempts, 1);
    assert.ok(logs.every((line) => !line.includes('sms_dispatched')));
  });

  it('escapes project-name XML text', async () => {
    env.PROJECT_NAME = 'Aster & Community <Demo> "Team"';
    const xml = await (await handler(request())).text();
    assert.match(xml, /Aster &amp; Community &lt;Demo&gt; &quot;Team&quot;/);
    assert.ok(!xml.includes('<Demo>'));
  });

  it('stores and logs only minimal redacted fields', async () => {
    const payload = { ...fixture, RecordingUrl: 'https://private.invalid/audio', Transcript: 'do-not-log-this' };
    assert.equal((await handler(request(payload))).status, 200);
    const allEvidence = logs.join('\n') + fs.readFileSync(path.join(directory, fs.readdirSync(directory)[0]), 'utf8');
    for (const forbidden of [fixture.From, fixture.To, payload.RecordingUrl, payload.Transcript, env.TWILIO_AUTH_TOKEN]) {
      assert.ok(!allEvidence.includes(forbidden));
    }
    for (const line of logs) assert.deepEqual(Object.keys(JSON.parse(line)).sort(), ['eventId', 'phoneSuffix', 'status']);
  });

  it('fails closed on hosted deployments without a durable store', async () => {
    env.NODE_ENV = 'production';
    env.WEBHOOK_STORE_DRIVER = 'local-file';
    assert.throws(() => configuredEventStore(env), /durable/);
    handler = createVoiceWebhookHandler({ env, logger: (line) => logs.push(line) });
    await assertUnavailableVoiceResponse(await handler(request()));
    assert.equal(fs.readdirSync(directory).length, 0);
    assert.ok(logs.every((line) => !line.includes('event_accepted')));
  });

  it('does not send when the event store is unavailable', async () => {
    env.ENABLE_OUTBOUND_SMS = 'true';
    let sends = 0;
    handler = makeHandler({
      store: { claim: async () => { throw new Error('Synthetic storage failure'); } },
      smsClient: { send: async () => { sends += 1; } },
    });
    await assertUnavailableVoiceResponse(await handler(request({ ...fixture, Consent: 'true' })));
    assert.equal(sends, 0);
    assert.equal(fs.readdirSync(directory).length, 0);
    assert.ok(logs.some((line) => JSON.parse(line).status === 'processing_unavailable'));
  });

  it('keeps raw errors and caller data out of fallback XML and failure logs', async () => {
    const payload = { ...fixture, Consent: 'true', Transcript: 'private-fictional-transcript', RecordingUrl: 'https://private.invalid/audio' };
    env.ENABLE_OUTBOUND_SMS = 'true';
    env.PROJECT_NAME = '<script>caller-controlled-name</script>';
    let sends = 0;
    handler = makeHandler({
      store: { claim: async () => { throw new Error([payload.From, payload.Transcript, payload.RecordingUrl, env.TWILIO_AUTH_TOKEN, env.PROJECT_NAME].join(' ')); } },
      smsClient: { send: async () => { sends += 1; } },
    });
    const xml = await assertUnavailableVoiceResponse(await handler(request(payload)));
    const visible = xml + logs.join('\n');
    for (const forbidden of [payload.From, payload.Transcript, payload.RecordingUrl, env.TWILIO_AUTH_TOKEN, env.PROJECT_NAME]) {
      assert.ok(!visible.includes(forbidden));
    }
    assert.equal(sends, 0);
    assert.equal(fs.readdirSync(directory).length, 0);
    assert.equal(logs.length, 1);
    assert.deepEqual(JSON.parse(logs[0]), { eventId: fixture.CallSid, status: 'processing_unavailable', phoneSuffix: '***0199' });
  });

  it('rejects an invalid signature before attempting an unavailable store or SMS adapter', async () => {
    env.ENABLE_OUTBOUND_SMS = 'true';
    let claims = 0;
    let sends = 0;
    handler = makeHandler({
      store: { claim: async () => { claims += 1; throw new Error('must not run'); } },
      smsClient: { send: async () => { sends += 1; } },
    });
    const response = await handler(request({ ...fixture, Consent: 'true' }, { signature: 'forged-signature' }));
    assert.equal(response.status, 403);
    assert.equal(await response.text(), 'Invalid signature');
    assert.equal(claims, 0);
    assert.equal(sends, 0);
    assert.equal(logs.length, 0);
    assert.equal(fs.readdirSync(directory).length, 0);
  });

  it('handles atomic hosted insert and duplicate conflicts using a fake transport', async () => {
    const requests = [];
    const responses = [new Response(null, { status: 201 }), new Response(JSON.stringify({ code: '23505' }), { status: 409 })];
    const durable = createSupabaseEventStore({
      url: 'https://example.invalid', serviceRoleKey: 'synthetic-test-key',
      fetchImpl: async (url, options) => { requests.push({ url, options }); return responses.shift(); },
    });
    const record = { eventId: fixture.CallSid, status: 'ringing', phoneSuffix: '***0199', processedAt: '2026-11-18T00:00:00Z' };
    assert.equal(await durable.claim(record), true);
    assert.equal(await durable.claim(record), false);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].options.method, 'POST');
    assert.equal(JSON.parse(requests[0].options.body).event_id, fixture.CallSid);
    assert.ok(!requests[0].options.body.includes(fixture.From));
  });

  it('surfaces hosted storage failures instead of treating them as duplicates', async () => {
    const durable = createSupabaseEventStore({
      url: 'https://example.invalid', serviceRoleKey: 'synthetic-test-key',
      fetchImpl: async () => new Response('Service unavailable', { status: 503 }),
    });
    await assert.rejects(durable.claim({ eventId: fixture.CallSid }), /unavailable/);
  });
});
