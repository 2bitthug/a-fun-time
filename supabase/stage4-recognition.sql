-- Stage 4: contribution reputation and automatic recognition.
-- Safe to run after the Town foundation migration.

create or replace function public.add_reputation_event(
  target_user uuid,
  event_kind text,
  point_value integer,
  target_post uuid default null,
  target_comment uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user is null or point_value = 0 then return; end if;
  insert into public.reputation_events(user_id, event_type, points, post_id, comment_id)
  values (target_user, event_kind, point_value, target_post, target_comment);
  update public.profiles
  set reputation_score = coalesce(reputation_score, 0) + point_value
  where id = target_user;
end;
$$;

grant execute on function public.add_reputation_event(uuid, text, integer, uuid, uuid) to authenticated;

create or replace function public.reputation_on_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' then
    perform public.add_reputation_event(new.author_id, 'post_created', 2, new.id, null);
  end if;
  return new;
end; $$;

drop trigger if exists reputation_after_post on public.posts;
create trigger reputation_after_post after insert on public.posts for each row execute function public.reputation_on_post();

create or replace function public.reputation_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'removed' then
    perform public.add_reputation_event(new.author_id, 'comment_created', 1, new.post_id, new.id);
  end if;
  return new;
end; $$;

drop trigger if exists reputation_after_comment on public.comments;
create trigger reputation_after_comment after insert on public.comments for each row execute function public.reputation_on_comment();

create or replace function public.reputation_on_post_vote_for_value(author uuid, post_id uuid, vote_value smallint, multiplier integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if vote_value = 1 then perform public.add_reputation_event(author, 'post_upvoted', 2 * multiplier, post_id, null);
  else perform public.add_reputation_event(author, 'post_downvoted', -1 * multiplier, post_id, null); end if;
end; $$;

create or replace function public.reputation_on_post_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid; delta integer; kind text;
begin
  if tg_op = 'DELETE' then
    select author_id into author from public.posts where id = old.post_id;
    if author is not null and author <> old.user_id then
      delta := case when old.value = 1 then -2 else 1 end;
      kind := case when old.value = 1 then 'post_upvoted' else 'post_downvoted' end;
      perform public.add_reputation_event(author, kind, delta, old.post_id, null);
    end if;
    return old;
  end if;
  select author_id into author from public.posts where id = new.post_id;
  if author is null or author = new.user_id then return new; end if;
  if tg_op = 'UPDATE' and old.value = new.value then return new; end if;
  if tg_op = 'UPDATE' then perform public.reputation_on_post_vote_for_value(author, new.post_id, old.value, -1); end if;
  delta := case when new.value = 1 then 2 else -1 end;
  kind := case when new.value = 1 then 'post_upvoted' else 'post_downvoted' end;
  perform public.add_reputation_event(author, kind, delta, new.post_id, null);
  return new;
end; $$;

drop trigger if exists reputation_after_post_vote on public.post_votes;
create trigger reputation_after_post_vote after insert or update or delete on public.post_votes for each row execute function public.reputation_on_post_vote();

create or replace function public.reputation_on_comment_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid; delta integer; kind text;
begin
  if tg_op = 'DELETE' then
    select author_id into author from public.comments where id = old.comment_id;
    if author is not null and author <> old.user_id then
      delta := case when old.value = 1 then -1 else 1 end;
      kind := case when old.value = 1 then 'comment_upvoted' else 'comment_downvoted' end;
      perform public.add_reputation_event(author, kind, delta, null, old.comment_id);
    end if;
    return old;
  end if;
  select author_id into author from public.comments where id = new.comment_id;
  if author is null or author = new.user_id then return new; end if;
  if tg_op = 'UPDATE' and old.value = new.value then return new; end if;
  if tg_op = 'UPDATE' then
    if old.value = 1 then perform public.add_reputation_event(author, 'comment_upvoted', -1, null, new.comment_id); else perform public.add_reputation_event(author, 'comment_downvoted', 1, null, new.comment_id); end if;
  end if;
  delta := case when new.value = 1 then 1 else -1 end;
  kind := case when new.value = 1 then 'comment_upvoted' else 'comment_downvoted' end;
  perform public.add_reputation_event(author, kind, delta, null, new.comment_id);
  return new;
end; $$;

drop trigger if exists reputation_after_comment_vote on public.comment_votes;
create trigger reputation_after_comment_vote after insert or update or delete on public.comment_votes for each row execute function public.reputation_on_comment_vote();

-- First contribution badges. Awarding is idempotent.
insert into public.user_badges(user_id, badge_id)
select p.id, b.id from public.profiles p cross join public.badges b
where b.slug = 'first-post'
and exists (select 1 from public.posts po where po.author_id = p.id and po.status = 'published')
on conflict do nothing;

insert into public.user_badges(user_id, badge_id)
select p.id, b.id from public.profiles p cross join public.badges b
where b.slug = 'first-comment'
and exists (select 1 from public.comments c where c.author_id = p.id and c.status <> 'removed')
on conflict do nothing;
