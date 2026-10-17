-- Stage 6: platform navigation, public profiles and community leadership access.
-- Safe to run after stages 2-5.
alter table public.community_memberships enable row level security;
grant select, insert, update, delete on public.community_memberships to authenticated;
drop policy if exists "Members are readable by authenticated users" on public.community_memberships;
create policy "Members are readable by authenticated users" on public.community_memberships for select to authenticated using (true);
drop policy if exists "Users can join communities" on public.community_memberships;
create policy "Users can join communities" on public.community_memberships for insert to authenticated with check (user_id = (select auth.uid()) and role = 'member');
drop policy if exists "Users can leave communities" on public.community_memberships;
create policy "Users can leave communities" on public.community_memberships for delete to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.community_memberships cm where cm.community_id = community_memberships.community_id and cm.user_id = (select auth.uid()) and cm.role = 'owner'));
drop policy if exists "Owners manage community roles" on public.community_memberships;
create policy "Owners manage community roles" on public.community_memberships for update to authenticated using (exists (select 1 from public.community_memberships cm where cm.community_id = community_memberships.community_id and cm.user_id = (select auth.uid()) and cm.role = 'owner')) with check (role in ('member','moderator','owner'));
grant select on public.profiles to authenticated;
