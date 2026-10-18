-- Town profile settings repair. Safe to run more than once.
-- Run in Supabase SQL Editor before expecting account-level profile settings to persist.
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists accent_color text not null default '#39ff14';
alter table public.profiles add column if not exists profile_sections jsonb not null default '{"interests":true,"achievements":true,"memberSince":true,"completion":true}'::jsonb;
alter table public.profiles add column if not exists pet_id text not null default 'none';
alter table public.profiles add column if not exists banner_preset text not null default 'default';

-- Profile owners may update only their own row. This does not grant users access to other profiles.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

grant update (display_name, bio, interests, avatar_id, accent_color, profile_sections, pet_id, banner_preset) on public.profiles to authenticated;
