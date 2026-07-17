-- Cap how often a single (anonymous) user can drop pins. Enforced server-side
-- so it can't be bypassed by a client that skips the UI cooldown.
create or replace function public.enforce_pin_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_pin_at timestamptz;
begin
  select created_at into last_pin_at
  from public.pins
  where created_by = new.created_by
  order by created_at desc
  limit 1;

  if last_pin_at is not null and now() - last_pin_at < interval '30 seconds' then
    raise exception 'rate_limited: wait before dropping another pin';
  end if;

  return new;
end;
$$;

create trigger enforce_pin_rate_limit_trigger
  before insert on public.pins
  for each row execute function public.enforce_pin_rate_limit();
