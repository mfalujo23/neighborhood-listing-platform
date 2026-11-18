'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createVoiceSession, runScriptedCases, runVoiceTurn, scriptedCases, type VoiceSession, type VoiceTurn } from '../../voice/simulator';
import { PROMPT_VERSION, SYSTEM_PROMPT } from '../../voice/prompt';
import type { Fault } from '../../voice/tools';
import styles from './voice-simulator.module.css';

type CaseResults = ReturnType<typeof runScriptedCases>;

export default function VoiceSimulator() {
  const session = useRef<VoiceSession | null>(null);
  const [message, setMessage] = useState('Tell me about demo-001.');
  const [fault, setFault] = useState<Fault>('none');
  const [consent, setConsent] = useState(false);
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [result, setResult] = useState<VoiceTurn | null>(null);
  const [caseResults, setCaseResults] = useState<CaseResults>([]);

  function run(event?: FormEvent<HTMLFormElement>, repeat = false) {
    event?.preventDefault();
    if (!session.current) session.current = createVoiceSession();
    setResult(runVoiceTurn(session.current, message, {
      fault, explicitConsent: consent, preferredChannel: channel,
      ...(repeat && result ? { eventId: result.eventId } : {}),
    }));
  }

  function reset() {
    session.current = null;
    setResult(null);
    setConsent(false);
    setMessage('Tell me about demo-001.');
    setFault('none');
  }

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">BarrioList home</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>CIS 3610 · Labs 10–12</p>
        <h1>Voice workflow simulator</h1>
        <p>Explore tool boundaries and failure recovery with fictional property facts.</p>
        <p className={styles.notice}><strong>Deterministic text mock.</strong> No AI provider, microphone, real call, SMS, or contact request is connected. Gemini and Vapi have not run this conversation.</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="mock-input-title">
          <h2 id="mock-input-title">Try a fictional request</h2>
          <p id="privacy-note">Keep entries fictional. Only current page memory is used; nothing is sent to a provider or saved as a transcript. Demo IDs: <code>demo-001</code>, <code>demo-002</code>; ZIP: <code>90032</code>.</p>
          <form onSubmit={run}>
            <label htmlFor="mock-message">Request text</label>
            <textarea id="mock-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={4} aria-describedby="privacy-note" required />
            <label htmlFor="mock-fault">Failure condition</label>
            <select id="mock-fault" value={fault} onChange={(event) => setFault(event.target.value as Fault)}>
              <option value="none">No injected failure</option>
              <option value="tool-timeout">Mock tool timeout</option>
              <option value="provider-unavailable">Mock provider unavailable</option>
              <option value="human-unavailable">Mock human unavailable</option>
            </select>
            <label htmlFor="mock-channel">Fictional follow-up channel</label>
            <select id="mock-channel" value={channel} onChange={(event) => setChannel(event.target.value as 'email' | 'phone')}>
              <option value="email">Email draft</option>
              <option value="phone">Phone draft</option>
            </select>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              I consent to validate a fictional follow-up draft. No real request will be sent.
            </label>
            <div className={styles.actions}>
              <button type="submit">Run mock turn</button>
              <button type="button" className={styles.secondary} disabled={!result} onClick={() => run(undefined, true)}>Repeat callback</button>
              <button type="button" className={styles.secondary} onClick={reset}>New session</button>
            </div>
          </form>
        </section>

        <section className={styles.panel} aria-labelledby="mock-result-title" aria-live="polite" aria-atomic="true">
          <h2 id="mock-result-title">Mock result</h2>
          {result ? <>
            <p className={styles.outcome}>{result.outcome}</p>
            <p className={styles.response}>{result.response}</p>
            <dl className={styles.facts}>
              <div><dt>Correlation ID</dt><dd><code>{result.correlationId}</code></dd></div>
              <div><dt>Local logic duration</dt><dd>{result.localDurationMs.toFixed(3)} ms</dd></div>
              <div><dt>Provider requests / submitted follow-ups</dt><dd>0 / 0</dd></div>
            </dl>
            <p className={styles.small}>Duration is a local JavaScript proxy, not model response, telephony latency, or provider uptime.</p>
            <details><summary>Validated mock tool trace</summary><pre>{JSON.stringify(result.toolCalls, null, 2)}</pre></details>
          </> : <p>Run a turn to see its scoped response, tool result, and anonymous correlation ID.</p>}
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="scripted-cases-title">
        <h2 id="scripted-cases-title">Ten scripted scenarios</h2>
        <p>Known listing, sponsored facts, unknown fact, injection, discriminatory steering, emergency, ambiguity, timeout, unavailable human, and duplicate callback. Every scenario is fictional.</p>
        <button type="button" onClick={() => setCaseResults(runScriptedCases())}>Run all ten mock scenarios</button>
        <div role="status" className={styles.small}>{caseResults.length ? `${caseResults.filter((item) => item.passed).length} of 10 expected outcomes matched.` : 'Scenarios have not run in this page yet.'}</div>
        {caseResults.length > 0 && <div className={styles.tableScroll}><table>
          <caption>Actual local deterministic outcomes; no provider tests</caption>
          <thead><tr><th scope="col">Scenario</th><th scope="col">Expected</th><th scope="col">Actual</th><th scope="col">Local ms</th><th scope="col">Result</th></tr></thead>
          <tbody>{caseResults.map((item) => <tr key={item.id}>
            <th scope="row">{item.id}</th><td>{item.expected}</td><td>{item.result.outcome}</td><td>{item.result.localDurationMs.toFixed(3)}</td><td>{item.passed ? 'Matched' : 'Mismatch'}</td>
          </tr>)}</tbody>
        </table></div>}
        <details><summary>View the fictional scenario inputs</summary><ol>{scriptedCases.map((item) => <li key={item.id}><strong>{item.id}:</strong> {item.message}</li>)}</ol></details>
      </section>

      <section className={styles.panel}>
        <h2>Scope and provenance</h2>
        <p>Facts marked approved are approved only within this fictional fixture. They are not actual listings, client approvals, business recommendations, or live availability. Sponsored statements are disclosed separately from property facts.</p>
        <p>Prompt version: <code>{PROMPT_VERSION}</code>. The prompt is versioned for a planned provider configuration; this mock uses deterministic rules and validated tools, not a language model.</p>
        <details><summary>View the planned system prompt</summary><pre>{SYSTEM_PROMPT}</pre></details>
      </section>
    </main>
  );
}
