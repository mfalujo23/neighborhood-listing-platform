import Link from 'next/link'
import { AUDIT_SPONSOR_CANDIDATES, AUDIT_SPONSOR_CONTEXT, SPONSOR_PROPERTY_DEMOS } from '../../lib/sponsorFixtures'
import { HOUSE_FALLBACK_SPONSOR, traceSponsorSelection } from '../../lib/sponsorMatcher'

export default function SponsorSimulatorPage() {
  const audit = traceSponsorSelection(AUDIT_SPONSOR_CONTEXT, AUDIT_SPONSOR_CANDIDATES)
  return <main className="max-w-4xl mx-auto p-6 space-y-6">
    <Link href="/" className="underline">Home</Link>
    <h1 className="text-3xl font-semibold">Fictional sponsor selection simulator</h1>
    <p>Deterministic local fixture. No database request, impression, outbound click or paid relationship is created by this page. The clock is fixed at {AUDIT_SPONSOR_CONTEXT.currentDate}.</p>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Audit 6: ZIP 90032</h2>
      <p>Selected: {audit.selected?.name}. Eligible order: C, B, A. D is pending and excluded before tier ranking.</p>
      <p>Precedence: approved, active, placement, inclusive dates, ZIP or radius and safe URL; then tier descending, distance ascending, impressions ascending and stable ID ascending.</p>
      <table className="w-full border-collapse text-left">
        <caption className="text-left">Fictional A/B/C/D fixture — teacher supplied tier, distance, impressions and status; remaining values are explicit test choices.</caption>
        <thead><tr>{['Sponsor', 'Tier', 'Miles', 'Impressions', 'Eligibility'].map((label) => <th scope="col" className="p-2 border" key={label}>{label}</th>)}</tr></thead>
        <tbody>{AUDIT_SPONSOR_CANDIDATES.map((candidate, index) => <tr key={candidate.id}>
          <th scope="row" className="p-2 border">{candidate.name}</th>
          <td className="p-2 border">{candidate.tier}</td><td className="p-2 border">{candidate.distanceMiles}</td>
          <td className="p-2 border">{candidate.impressions}</td><td className="p-2 border">{audit.candidates[index].reason}</td>
        </tr>)}</tbody>
      </table>
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Three fictional property contexts</h2>
      {SPONSOR_PROPERTY_DEMOS.map((demo) => {
        const trace = traceSponsorSelection(demo.context, demo.candidates)
        return <article className="border p-4 rounded" key={demo.property}>
          <h3 className="font-semibold">{demo.property} — ZIP {demo.context.zipCode}</h3>
          <p>{trace.selected ? `Simulated sponsored slot: ${trace.selected.name}` : HOUSE_FALLBACK_SPONSOR.disclosure}</p>
          <p>{trace.candidates[0].geography} / {trace.candidates[0].reason}</p>
        </article>
      })}
    </section>
    <p>Matching uses coarse property context only. No caller identity or sensitive profile data is used. This demonstration does not establish legal or accessibility compliance.</p>
  </main>
}
