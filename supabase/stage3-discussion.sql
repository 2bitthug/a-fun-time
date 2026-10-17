-- Stage 3: posting and discussion permissions/functions.
-- Safe to run after the Town foundation migration.

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_votes enable row level security;
alter table public.comment_votes enable row level security;
alter table public.saved_posts enable row level security;
alter table public.post_views enable row level security;

revoke all on public.posts, public.comments, public.post_votes, public.comment_votes, public.saved_posts, public.post_views from anon;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, update, delete on public.post_votes to authenticated;
grant select, insert, update, delete on public.comment_votes to authenticated;
grant select, insert, update, delete on public.saved_posts to authenticated;
grant select, insert, update on public.post_views to authenticated;

drop policy if exists "Published posts are publicly readable" on public.posts;
create policy "Published posts are publicly readable" on public.posts for select to authenticated using (status = 'published' or author_id = (select auth.uid()));

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts" on public.posts for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "Authors can edit their posts" on public.posts;
create policy "Authors can edit their posts" on public.posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

drop policy if exists "Authors can delete their posts" on public.posts;
create policy "Authors can delete their posts" on public.posts for delete to authenticated using (author_id = (select auth.uid()));

drop policy if exists "Published comments are readable" on public.comments;
create policy "Published comments are readable" on public.comments for select to authenticated using (status <> 'removed' or author_id = (select auth.uid()));

drop policy if exists "Users can create comments" on public.comments;
create policy "Users can create comments" on public.comments for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "Authors can edit comments" on public.comments;
create policy "Authors can edit comments" on public.comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

drop policy if exists "Authors can delete comments" on public.comments;
create policy "Authors can delete comments" on public.comments for delete to authenticated using (author_id = (select auth.uid()));

drop policy if exists "Users can read post votes" on public.post_votes;
create policy "Users can read post votes" on public.post_votes for select to authenticated using (true);
drop policy if exists "Users manage their post votes" on public.post_votes;
create policy "Users manage their post votes" on public.post_votes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users can read comment votes" on public.comment_votes;
create policy "Users can read comment votes" on public.comment_votes for select to authenticated using (true);
drop policy if exists "Users manage their comment votes" on public.comment_votes;
create policy "Users manage their comment votes" on public.comment_votes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users read their saved posts" on public.saved_posts;
create policy "Users read their saved posts" on public.saved_posts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users manage their saved posts" on public.saved_posts;
create policy "Users manage their saved posts" on public.saved_posts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users can read post views" on public.post_views;
create policy "Users can read post views" on public.post_views for select to authenticated using (true);
drop policy if exists "Users can record their post views" on public.post_views;
create policy "Users can record their post views" on public.post_views for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users can update their post views" on public.post_views;
create policy "Users can update their post views" on public.post_views for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.record_post_view(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_post_id is null or auth.uid() is null then return; end if;
  insert into public.post_views(post_id, user_id, view_count)
  values (target_post_id, auth.uid(), 1)
  on conflict (post_id, user_id)
  do update set view_count = public.post_views.view_count + 1, last_viewed_at = now();
end;
$$;
grant execute on function public.record_post_view(uuid) to authenticated;

-- Keep post statistics callable by the authenticated frontend.
grant execute on function public.get_public_post_stats(uuid[]) to authenticated;
