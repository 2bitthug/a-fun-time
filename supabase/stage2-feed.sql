-- Stage 2: aggregate post statistics for transparent feed sorting.
-- Run once in the Supabase SQL Editor.
create or replace function public.get_public_post_stats(post_ids uuid[])
returns table (
  post_id uuid,
  comment_count bigint,
  upvote_score bigint,
  view_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as post_id,
    coalesce((select count(*) from public.comments c where c.post_id = p.id and c.status <> 'removed'), 0)::bigint as comment_count,
    coalesce((select sum(v.value) from public.post_votes v where v.post_id = p.id), 0)::bigint as upvote_score,
    coalesce((select sum(pv.view_count) from public.post_views pv where pv.post_id = p.id), 0)::bigint as view_count
  from public.posts p
  where p.id = any(post_ids)
    and p.status <> 'removed';
$$;

grant execute on function public.get_public_post_stats(uuid[]) to authenticated;
