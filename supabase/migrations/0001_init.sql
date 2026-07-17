-- Pins dropped on the map (locations, easter eggs, leaks, etc.)
create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  title text not null,
  description text,
  category text not null default 'location' check (category in ('location', 'easter_egg', 'leak', 'other')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  upvote_count integer not null default 0
);

create index if not exists pins_created_at_idx on public.pins (created_at desc);

-- One vote per user per pin (primary key doubles as the uniqueness constraint)
create table if not exists public.pin_votes (
  pin_id uuid not null references public.pins(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pin_id, user_id)
);

alter table public.pins enable row level security;
alter table public.pin_votes enable row level security;

create policy "Pins are viewable by everyone"
  on public.pins for select
  using (true);

create policy "Authenticated users can insert pins"
  on public.pins for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Votes are viewable by everyone"
  on public.pin_votes for select
  using (true);

create policy "Users can insert their own vote"
  on public.pin_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own vote"
  on public.pin_votes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Keep pins.upvote_count denormalized so listing pins never needs a join/count.
create or replace function public.handle_pin_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.pins set upvote_count = upvote_count + 1 where id = new.pin_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.pins set upvote_count = greatest(upvote_count - 1, 0) where id = old.pin_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_pin_vote_insert
  after insert on public.pin_votes
  for each row execute function public.handle_pin_vote_change();

create trigger on_pin_vote_delete
  after delete on public.pin_votes
  for each row execute function public.handle_pin_vote_change();
