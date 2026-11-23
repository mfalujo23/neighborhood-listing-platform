// Local-only failure injection against a built Next.js route. No carrier calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { computeSignature } from '../src/lib/telephony-webhook.js';

const output = new URL('../docs/mfalujo23/evidence/lab9-fallback/', import.meta.url);
await mkdir(output, { recursive: true });
const callback = 'http://127.0.0.1:3044/api/webhooks/voice';
const token = 'offline-test-token-not-a-credential';
const params = { CallSid: 'CA00000000000000000000000000000001', From: '+12025550199', To: '+12025550100', CallStatus: 'ringing', Consent: 'true', Transcript: 'private-fictional-transcript', RecordingUrl: 'https://private.invalid/fictional-audio' };
const requests = [];
const results = [];
let child;
let serverLog = '';
const mock = http.createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  requests.push({ method: request.method, path: request.url, body: Buffer.concat(chunks).toString('utf8') });
  // Deliberately exceed the production adapter's 5-second AbortSignal timeout.
  const timer = setTimeout(() => { if (!response.destroyed) response.writeHead(503).end('synthetic storage timeout'); }, 6000);
  timer.unref();
});
mock.listen(0, '127.0.0.1');
await once(mock, 'listening');
const storeUrl = `http://127.0.0.1:${mock.address().port}`;

async function stopApp() {
  if (!child) return;
  const running = child;
  child = undefined;
  if (running.exitCode === null) { running.kill(); await once(running, 'exit'); }
}

async function startApp(smsEnabled) {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3044'], {
    cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', TWILIO_AUTH_TOKEN: token, PUBLIC_CALLBACK_URL: callback, WEBHOOK_STORE_DRIVER: 'supabase', SUPABASE_URL: storeUrl, SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-key-not-a-credential', ENABLE_OUTBOUND_SMS: String(smsEnabled), PROJECT_NAME: 'Neighborhood Listing Platform' },
  });
  child.stdout.on('data', chunk => { serverLog += chunk.toString(); });
  child.stderr.on('data', chunk => { serverLog += chunk.toString(); });
  for (let i = 0; i < 120; i += 1) {
    if (child.exitCode !== null) throw new Error('Next.js exited before readiness');
    try { if ((await fetch(callback)).status === 405) return; } catch { /* Wait for listener only. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Local Next.js route did not become ready');
}

async function invoke(name, options = {}) {
  const payload = options.payload || params;
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': computeSignature(token, callback, payload), ...options.headers };
  const started = performance.now();
  const response = await fetch(callback, { method: options.method || 'POST', headers, ...(options.method === 'GET' ? {} : { body: new URLSearchParams(payload) }) });
  const record = { name, status: response.status, contentType: response.headers.get('content-type'), body: await response.text(), elapsedMs: Math.round(performance.now() - started) };
  results.push(record);
  return record;
}

function checkFallback(record) {
  assert.equal(record.status, 200);
  assert.equal(record.contentType, 'text/xml; charset=utf-8');
  assert.match(record.body, /^<\?xml version="1\.0" encoding="UTF-8"\?><Response><Say>[^<]+<\/Say><Hangup\/><\/Response>$/);
  assert.match(record.body, /temporarily unavailable.*try again later/);
  assert.doesNotMatch(record.body, /recorded|sent|transfer|<Dial|<Redirect|<Record|<Message/);
  for (const forbidden of [params.From, params.Transcript, params.RecordingUrl, token]) assert.ok(!record.body.includes(forbidden));
}

try {
  await startApp(false);
  const timeout = await invoke('authenticated-valid-storage-timeout');
  checkFallback(timeout);
  assert.ok(timeout.elapsedMs >= 4500 && timeout.elapsedMs < 12000, 'The real HTTP adapter must reach its bounded timeout');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].path, '/rest/v1/telephony_webhook_events');
  assert.deepEqual(Object.keys(JSON.parse(requests[0].body)).sort(), ['call_status', 'event_id', 'phone_suffix', 'processed_at']);
  for (const forbidden of [params.From, params.Transcript, params.RecordingUrl]) assert.ok(!requests[0].body.includes(forbidden));
  assert.equal(JSON.parse(requests[0].body).phone_suffix, '***0199');
  const invalid = await invoke('invalid-signature-before-failing-store', { headers: { 'X-Twilio-Signature': 'forged-signature' } });
  assert.equal(invalid.status, 403); assert.equal(invalid.body, 'Invalid signature');
  assert.equal((await invoke('unsupported-method', { method: 'GET' })).status, 405);
  assert.equal((await invoke('unsupported-content-type', { headers: { 'Content-Type': 'application/json' } })).status, 415);
  assert.equal((await invoke('signed-invalid-required-field', { payload: { ...params, From: 'not-a-phone' } })).status, 400);
  assert.equal((await invoke('oversized-body', { payload: { ...params, Extra: 'x'.repeat(20000) } })).status, 413);
  assert.equal(requests.length, 1, 'Rejected requests must not reach the store');
  await stopApp();
  await startApp(true);
  checkFallback(await invoke('authenticated-valid-missing-sms-adapter'));
  assert.equal(requests.length, 1, 'Missing SMS adapter must stop before an event claim');
  await stopApp();
  const eventLines = serverLog.split(/\r?\n/).filter(line => line.startsWith('{"eventId":')).map(line => JSON.parse(line));
  assert.equal(eventLines.filter(line => line.status === 'processing_unavailable').length, 2);
  assert.ok(!eventLines.some(line => ['event_accepted', 'sms_dispatched'].includes(line.status)));
  for (const forbidden of [params.From, params.Transcript, params.RecordingUrl, token]) assert.ok(!serverLog.includes(forbidden));
  const data = { scope: 'Actual loopback Next.js HTTP requests with a fictional local PostgREST timeout server; no Supabase cloud, carrier, Vapi, calls or SMS', results, storeRequestCount: requests.length, storeRequestBodies: requests.map(request => JSON.parse(request.body)), storedBodyContainsOnlyMinimalFields: true, businessAccepted: false, eventLogLines: eventLines, passed: true };
  await writeFile(new URL('http-results.json', output), JSON.stringify(data, null, 2) + '\n');
  await writeFile(new URL('http-server.log', output), serverLog);
  console.log(JSON.stringify(data, null, 2));
} finally {
  await stopApp();
  await writeFile(new URL('http-server.log', output), serverLog);
  mock.closeAllConnections();
  await new Promise(resolve => mock.close(resolve));
}
