-- Stage 11: Town fixed avatar library
-- Replaces the old generated/URL-based profile-picture system.

alter table public.profiles drop column if exists avatar_url;
alter table public.profiles drop column if exists avatar_preset;

alter table public.profiles add column if not exists avatar_id text;

update public.profiles
set avatar_id = 'avatar-01'
where avatar_id is null
   or avatar_id !~ '^avatar-(0[1-9]|1[01]|1[3-9]|2[01])$';

alter table public.profiles alter column avatar_id set default 'avatar-01';
alter table public.profiles alter column avatar_id set not null;

alter table public.profiles drop constraint if exists profiles_avatar_id_check;
alter table public.profiles
  add constraint profiles_avatar_id_check
  check (avatar_id ~ '^avatar-(0[1-9]|1[01]|1[3-9]|2[01])$');
