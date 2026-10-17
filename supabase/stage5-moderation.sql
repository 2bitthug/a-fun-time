-- Stage 5: moderation policy refresh
-- Safe to run after the Town foundation migration.

alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

drop policy if exists "Users can create reports" on public.reports;
drop policy if exists "Reporters can view own reports" on public.reports;
drop policy if exists "Moderators can manage community reports" on public.reports;
create policy "Users can create reports" on public.reports
for insert to authenticated
with check ((select auth.uid()) = reporter_id);
create policy "Reporters can view own reports" on public.reports
for select to authenticated
using ((select auth.uid()) = reporter_id);
create policy "Moderators can manage community reports" on public.reports
for all to authenticated
using (exists (select 1 from public.community_memberships cm where cm.community_id = reports.community_id and cm.user_id = (select auth.uid()) and cm.role in ('moderator','owner')))
with check (exists (select 1 from public.community_memberships cm where cm.community_id = reports.community_id and cm.user_id = (select auth.uid()) and cm.role in ('moderator','owner')));

drop policy if exists "Moderators can view moderation actions" on public.moderation_actions;
drop policy if exists "Moderators can create moderation actions" on public.moderation_actions;
create policy "Moderators can view moderation actions" on public.moderation_actions
for select to authenticated
using (exists (select 1 from public.community_memberships cm where cm.community_id = moderation_actions.community_id and cm.user_id = (select auth.uid()) and cm.role in ('moderator','owner')));
create policy "Moderators can create moderation actions" on public.moderation_actions
for insert to authenticated
with check ((select auth.uid()) = moderator_id and exists (select 1 from public.community_memberships cm where cm.community_id = moderation_actions.community_id and cm.user_id = (select auth.uid()) and cm.role in ('moderator','owner')));

grant select, insert, update on public.reports to authenticated;
grant select, insert on public.moderation_actions to authenticated;
