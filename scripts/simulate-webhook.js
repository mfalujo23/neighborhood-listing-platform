import crypto from 'node:crypto';
import fs from 'node:fs';
import { computeSignature, redactPhone } from '../src/lib/telephony-webhook.js';

// Local-only simulator: no real phone numbers, no SMS client, no external target.
const url = process.env.PUBLIC_CALLBACK_URL || 'http://localhost:3000/api/webhooks/voice';
const target = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('The simulator only sends synthetic fixtures to a local loopback server.');
}
const token = process.env.TWILIO_AUTH_TOKEN;
if (!token) throw new Error('Set a synthetic local TWILIO_AUTH_TOKEN before starting the server and simulator.');
if (process.env.ENABLE_OUTBOUND_SMS === 'true') throw new Error('Disable outbound SMS for the local simulator.');

const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/inbound-call.json', import.meta.url), 'utf8'));
const payload = { ...fixture, CallSid: `CA${crypto.randomBytes(16).toString('hex')}`, Consent: 'false' };
const signature = computeSignature(token, url, payload);

for (let attempt = 1; attempt <= 2; attempt += 1) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': signature },
    body: new URLSearchParams(payload).toString(),
  });
  console.log(JSON.stringify({ eventId: payload.CallSid, status: `http_${response.status}_attempt_${attempt}`, phoneSuffix: redactPhone(payload.From) }));
  console.log(await response.text());
  if (!response.ok) process.exitCode = 1;
}
