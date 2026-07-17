-- Reddit-style anonymous display names, auto-generated per user and
-- denormalized onto pins so realtime payloads carry the author name
-- without needing a join.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create or replace function public.generate_random_username()
returns text
language sql
volatile
as $$
  select (
    (array[
      'Swift','Clever','Mighty','Sly','Bold','Lucky','Wild','Quiet','Sharp','Rapid',
      'Neon','Rogue','Iron','Silent','Bright','Fierce','Nimble','Golden','Shadow','Solar'
    ])[floor(random() * 20) + 1]
    || (array[
      'Pelican','Gator','Flamingo','Marlin','Panther','Iguana','Dolphin','Heron','Manatee','Cobra',
      'Falcon','Shark','Raptor','Turtle','Osprey','Cougar','Viper','Wolf','Hawk','Otter'
    ])[floor(random() * 20) + 1]
    || floor(random() * 100)::text
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, public.generate_random_username())
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users created before this migration existed.
insert into public.profiles (id, display_name)
select u.id, public.generate_random_username()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Denormalize the author's display name onto pins.
alter table public.pins add column if not exists author_name text;

create or replace function public.set_pin_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_name is null and new.created_by is not null then
    select display_name into new.author_name
    from public.profiles
    where id = new.created_by;
  end if;
  return new;
end;
$$;

create trigger set_pin_author_name_trigger
  before insert on public.pins
  for each row execute function public.set_pin_author_name();

-- Backfill pins created before this migration existed.
update public.pins p
set author_name = pr.display_name
from public.profiles pr
where p.created_by = pr.id and p.author_name is null;
