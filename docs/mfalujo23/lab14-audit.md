# Audit 14: telemetry pipeline and decision-support metrics — mfalujo23

Current status: [coursework status](../current-status.md). The calculations below retain their original fixture scope. Later [session support](session-auth.md), [hosted checks](hosted-reproduction.md) and [actual chart comparison](lab14-model-comparison.md) are now recorded.

This answer is grounded in the implemented `public.analytics_events` model, strict event contract, protected API and actual fictional local PostgreSQL execution. It does not claim deployed analytics, real UAT, real calls or provider performance. The live source has no supplied samples.

## Five core metrics

All windows are `[from UTC midnight, midnight after through)`, with optional property scope in a POST body. Aggregation deduplicates event IDs; PostgreSQL uses the event primary key. A changed payload under an existing ID is a conflict. The same event ID never increments counters twice. Rates below three denominator observations are `null` and displayed as “Insufficient data.” Counts and definitions remain visible in this fictional prototype.

| Metric / trigger | Exact numerator / denominator | Grain and deduplication | Access / retention | Decision and limit |
|---|---|---|---|---|
| Sponsor CTR / sponsor_impression + sponsor_click | Distinct in-window impression IDs with ≥1 matching in-window click / distinct in-window impression IDs. A match shares property, correlation and source. | ZIP neighborhood + optional property + UTC window. Multiple click IDs on the same impression count once; unique event IDs prevent retry inflation. | Protected provider sees owned properties; admin sees all; existing legacy property_professional is read-only. Raw events target 30 days, no persisted rollup here. | Inspect placement engagement after enough observations; not revenue or unique-person conversion. |
| Successful inquiry completion / call_started + call_completed + escalation | Started property/correlation sessions with latest completion `resolved` and no escalation / distinct started sessions. | Property + correlation within the selected window; latest completion uses timestamp, then stable event ID. | Same scoped roles / 30-day raw-event design. | Investigate incomplete flows. This is a successful-inquiry proxy, not proven first-call resolution: no caller identity/history is collected. |
| Webhook timeout/fallback / call_started + escalation | Distinct started sessions with webhook_timeout or fallback_transfer / distinct started sessions. | Property + correlation + UTC window; repeated escalation callbacks do not multiply sessions. | Same scoped roles / 30-day raw-event design. | Investigate infrastructure/fallback configuration; controlled fixture categories are not observed provider incidents. |
| Property inquiry conversion / listing_view + intent_category | Distinct property/correlation listing-view sessions with property_details, availability or booking intent / distinct listing-view sessions. | Property + short-lived correlation + UTC window; multiple intent events within one session count once. | Same scoped roles / 30-day raw-event design. | Inspect the transition from listing discovery to an inquiry; not a sale, lead identity or causal attribution. |
| Voice pipeline latency SLA / call_completed | Completed started sessions with supplied latency <1000ms / completed started sessions with latency from the requested source. | Latest completion per property/correlation; missing measurements excluded. Exactly 1000ms fails the strict threshold. | Same scoped roles / 30-day raw-event design. | Investigate verified end-to-end slowness. Public fixture 800/999/1000ms yields 2/3 only as fictional arithmetic; live source has 0 samples and insufficient data. |

Supplemental metrics: call completion = completed started sessions / started sessions; tool success = success=true tool-result events / all tool-result events; escalation = started sessions with any escalation / started sessions. Top inquiry categories count derived intent-category events, not people. Daily volume counts unique events by UTC date.

The window requires both the start/opportunity and its result to appear inside the selected interval. A call completion or click whose start/impression is outside the window does not enter the rate. This defines a same-window cohort and can right-censor late results; it must not be interpreted as final lifetime resolution. Counts can be incomplete at a live window boundary. No financial or caller-level conclusion is justified.

## Executable protected query path

The exact `/api/analytics` POST route delegates to the authenticated handler. Filters are strict JSON in the body; no caller-selected role is accepted. Responses contain aggregates only.

```ts
import { handleAnalyticsSummary } from '../../../analytics/http'
import { createServerAnalyticsDependencies } from '../../../analytics/server'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  return handleAnalyticsSummary(request, createServerAnalyticsDependencies())
}
```

Exact server call after bearer-token/profile authorization; the caller uses its user-scoped client so PostgreSQL RLS remains active:

```ts
const { data, error } = await verified.client.rpc('analytics_event_window', {
        p_from: bounds.start, p_end_exclusive: bounds.endExclusive,
        p_property_id: filter.propertyId ?? null, p_source: source,
      })
```

The bounded event-window RPC uses the same SQL statement snapshot for the event window and CTR. Actual function:

```sql
create or replace function public.analytics_event_window(
  p_from timestamptz, p_end_exclusive timestamptz,
  p_property_id uuid default null, p_source text default 'provider_measured'
) returns jsonb language sql stable security invoker
set search_path=pg_catalog,public,pg_temp as $$
  with selected as (
    select event_id,event_name,occurred_at,property_id,correlation_id,source,
      filter_key,sponsor_id,neighborhood,impression_id,intent_category,
      tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms
    from public.analytics_events
    where occurred_at>=p_from and occurred_at<p_end_exclusive and source=p_source
      and (p_property_id is null or property_id=p_property_id) and p_from<p_end_exclusive
    order by occurred_at,event_id limit 5001
  ) select jsonb_build_object(
    'truncated',count(*)>5000,
    'events',coalesce(jsonb_agg(to_jsonb(selected)),'[]'::jsonb),
    'sponsorCtr',coalesce((select jsonb_agg(to_jsonb(ctr)) from public.analytics_sponsor_ctr(p_from,p_end_exclusive,p_property_id,p_source) ctr),'[]'::jsonb)
  ) from selected;
$$;
```

Metric 1 is computed by this exact SQL function. COUNT(DISTINCT i.event_id) deduplicates opportunities; the numerator counts each matched impression at most once. The join checks event kind/property/correlation/source and bounds click timestamps; WHERE checks impression kind/source/property and bounds impression timestamps. RLS limits rows to the verified role/property scope.

```sql
create or replace function public.analytics_sponsor_ctr(
  p_from timestamptz, p_end_exclusive timestamptz,
  p_property_id uuid default null, p_source text default 'provider_measured'
) returns table(neighborhood text, impression_count bigint, clicked_impressions bigint, ctr_percent numeric)
language sql stable security invoker set search_path=pg_catalog,public,pg_temp
as $$
  select i.neighborhood,
    count(distinct i.event_id) as impression_count,
    count(distinct case when c.event_id is not null then i.event_id end) as clicked_impressions,
    case when count(distinct i.event_id)>=3 then
      100.0*count(distinct case when c.event_id is not null then i.event_id end)/count(distinct i.event_id)
      else null end as ctr_percent
  from public.analytics_events i
  left join public.analytics_events c on c.impression_id=i.event_id
    and c.event_name='sponsor_click' and c.property_id=i.property_id
    and c.correlation_id=i.correlation_id and c.source=i.source
    and c.occurred_at>=p_from and c.occurred_at<p_end_exclusive
  where i.event_name='sponsor_impression' and i.source=p_source
    and i.occurred_at>=p_from and i.occurred_at<p_end_exclusive
    and (p_property_id is null or i.property_id=p_property_id)
    and p_from<p_end_exclusive
  group by i.neighborhood order by i.neighborhood;
$$;
```

## Actual local evidence

The fixture has 30 fictional events. Local JavaScript and actual disposable PostgreSQL both produced CTR 2/4=50% for ZIP90032. The unit suite checks duplicate/conflicting IDs, real calendar/UTC boundaries, missing/small samples, strict shapes, role verification, default-off consent, revocation and safe errors. PostgreSQL checks table/RPC permissions, owner scoping, exact distinct CTR, duplicate-key rejection, event shape, retention and forward-migration reapplication. Its auth profiles are local stubs, not actual Supabase sessions.

Actual fixture summary:

```json
{
  "eventCount": 30,
  "bounds": {
    "start": "2026-11-17T00:00:00.000Z",
    "endExclusive": "2026-11-19T00:00:00.000Z"
  },
  "latencySource": "fixture",
  "metrics": {
    "sponsorCtr": {
      "numerator": 2,
      "denominator": 4,
      "percent": 50,
      "definition": "Distinct matched impression IDs clicked / distinct impression IDs in the UTC window."
    },
    "inquiryCompletion": {
      "numerator": 2,
      "denominator": 4,
      "percent": 50,
      "definition": "Started property/correlation sessions resolved without escalation / started sessions. Successful-inquiry proxy; no caller identity or first-call history."
    },
    "webhookFallback": {
      "numerator": 1,
      "denominator": 4,
      "percent": 25,
      "definition": "Started sessions with webhook_timeout or fallback_transfer / started sessions."
    },
    "propertyInquiry": {
      "numerator": 3,
      "denominator": 4,
      "percent": 75,
      "definition": "Listing-view sessions with a property-details, availability or booking intent / listing-view sessions."
    },
    "latencySla": {
      "numerator": 2,
      "denominator": 3,
      "percent": 66.66666666666666,
      "definition": "Completed sessions with supplied fixture latency <1000ms / completed sessions with that latency source. Missing measurements excluded."
    },
    "callCompletion": {
      "numerator": 3,
      "denominator": 4,
      "percent": 75,
      "definition": "Started sessions with a completion event / started sessions."
    },
    "toolSuccess": {
      "numerator": 3,
      "denominator": 4,
      "percent": 75,
      "definition": "Successful tool-result events / all tool-result events."
    },
    "escalation": {
      "numerator": 1,
      "denominator": 4,
      "percent": 25,
      "definition": "Started sessions with any escalation / started sessions."
    }
  },
  "daily": [
    {
      "day": "2026-11-17",
      "count": 29
    },
    {
      "day": "2026-11-18",
      "count": 1
    }
  ],
  "categories": [
    {
      "category": "property_details",
      "count": 3
    },
    {
      "category": "unknown",
      "count": 1
    }
  ],
  "neighborhoods": [
    {
      "neighborhood": "90032",
      "impressions": 4,
      "clickedImpressions": 2,
      "percent": 50
    }
  ]
}
```

Provider-only latency result (fixture times excluded):

```json
{
  "numerator": 0,
  "denominator": 0,
  "percent": null,
  "definition": "Completed sessions with supplied provider_measured latency <1000ms / completed sessions with that latency source. Missing measurements excluded."
}
```

Raw evidence: `evidence/dashboard-actual-results.json`, `evidence/analytics-local-postgres.json`, `evidence/dashboard-tests.txt` and `evidence/analytics-postgres-terminal.txt`. The complete model is `supabase/migrations/20261118000600_minimized_analytics.sql`; strict JSON Schema is in `evidence/analytics-events.schema.json`.

Protected session integration, hosted checks and the required ChatGPT/Gemini chart comparison have separate later records linked above. The new protected date/property controls passed local checks, exact-commit CI and production verification. Narrow-screen reflow, operational retention scheduling, actual provider measurements and empirical UAT remain unverified; none is inferred from these fixture calculations.
