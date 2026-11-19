import Link from 'next/link';

const features = [
  {
    id: 'listings',
    title: 'Listings',
    description:
      'Explore the details that matter when comparing homes, including location, price, and property features.',
  },
  {
    id: 'sponsors',
    title: 'Neighborhood sponsors',
    description:
      'Discover local businesses through clearly identified sponsored content connected to the neighborhood.',
  },
  {
    id: 'voice-help',
    title: 'Text assistance',
    description:
      'Try a text conversation about sample listings and nearby businesses.',
  },
];

export default function Page() {
  return (
    <main className="space-y-10 py-12">
      <header className="max-w-3xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-800">
          Neighborhood Listing Platform
        </p>
        <h1>BarrioList</h1>
        <p className="text-lg text-slate-700">
          A place to explore neighborhood listings, discover local sponsors, and
          get help finding the information you need.
        </p>
        <nav aria-label="Explore BarrioList" className="flex flex-wrap gap-3">
          {[
            ['/listings', 'Browse homes'],
            ['/services', 'Find services'],
            ['/voice-simulator', 'Try text assistant'],
            ['/dashboard-demo', 'View sample dashboard'],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="inline-block rounded border border-blue-700 px-4 py-2 font-semibold text-blue-800 focus-visible:ring-2 focus-visible:ring-offset-2">
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <section aria-labelledby="features-heading" className="space-y-6">
        <h2 id="features-heading" className="text-2xl font-semibold">
          Explore your neighborhood
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.id}
              aria-labelledby={`${feature.id}-heading`}
              className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm"
            >
              <h3
                id={`${feature.id}-heading`}
                className="mb-3 text-xl font-semibold text-slate-900"
              >
                {feature.title}
              </h3>
              <p className="text-slate-700">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
