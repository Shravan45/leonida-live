-- Admin allowlist: a single (or few) real Supabase auth accounts, distinct
-- from the anonymous visitor flow, that can moderate content.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "Users can check their own admin status"
  on public.admins for select
  using (auth.uid() = user_id);

create policy "Admins can delete any pin"
  on public.pins for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

-- Email-on-new-pin: a trigger posts to a webhook route, which sends the
-- email via Resend. The webhook secret lives in Supabase Vault (set via a
-- separate, non-committed SQL command — see the setup instructions), never
-- in this file, since the repo is public.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_pin()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  webhook_secret text;
begin
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'new_pin_webhook_secret'
  limit 1;

  -- Secret not configured yet — skip quietly rather than failing the insert.
  if webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://leonida-live.vercel.app/api/webhooks/new-pin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'title', new.title,
      'description', new.description,
      'category', new.category,
      'author_name', new.author_name,
      'lat', new.lat,
      'lng', new.lng,
      'created_at', new.created_at
    )
  );
  return new;
end;
$$;

create trigger notify_new_pin_trigger
  after insert on public.pins
  for each row execute function public.notify_new_pin();
