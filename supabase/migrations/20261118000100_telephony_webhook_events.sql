-- Lab 9 hosted idempotency: apply only after instructor/project-owner review.
-- No full phone numbers, audio, transcripts, or request bodies are stored.
create table if not exists public.telephony_webhook_events (
  event_id text primary key check (event_id ~ '^CA[0-9a-fA-F]{32}$'),
  call_status text not null,
  phone_suffix text not null check (phone_suffix ~ '^\*\*\*[0-9]{4}$'),
  processed_at timestamptz not null default now()
);

alter table public.telephony_webhook_events enable row level security;
revoke all on table public.telephony_webhook_events from anon, authenticated;
grant insert on table public.telephony_webhook_events to service_role;
