-- Enforce unique display names. Dedupe any pre-existing collisions first
-- (this project has only had a handful of test users so far, but the
-- unique constraint would fail to create otherwise).
with duped as (
  select id, display_name,
         row_number() over (partition by display_name order by created_at) as rn
  from public.profiles
)
update public.profiles p
set display_name = p.display_name || '-' || substr(p.id::text, 1, 4)
from duped d
where p.id = d.id and d.rn > 1;

alter table public.profiles
  add constraint profiles_display_name_unique unique (display_name);

-- The auto-generator can now collide with an existing name; retry with a
-- fresh random name on conflict, and fall back to a guaranteed-unique
-- suffix in the astronomically unlikely case it keeps colliding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := public.generate_random_username();
    begin
      insert into public.profiles (id, display_name) values (new.id, candidate);
      exit;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 20 then
        insert into public.profiles (id, display_name)
        values (new.id, candidate || '-' || substr(new.id::text, 1, 4));
        exit;
      end if;
    end;
  end loop;
  return new;
end;
$$;
