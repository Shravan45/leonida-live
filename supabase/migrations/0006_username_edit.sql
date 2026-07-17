-- Let users rename themselves (moderated + length-checked server-side in
-- /api/profile; this constraint is a defense-in-depth backstop, not the
-- primary validation).
alter table public.profiles
  add constraint display_name_length check (char_length(display_name) between 2 and 24);

create policy "Users can update their own display name"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
