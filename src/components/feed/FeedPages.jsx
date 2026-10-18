import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const SORT_KEY = 'town-feed-sort'
const SORTS = [['latest', 'Latest'], ['discussed', 'Most Discussed'], ['upvoted', 'Most Upvoted'], ['viewed', 'Most Viewed']]

function PageFrame({ title, children, actions }) {
  return <section className="town-page"><div className="town-page-heading"><div><p className="eyebrow">TOWN FEED</p><h1>{title}</h1></div>{actions && <div className="town-page-actions">{actions}</div>}</div>{children}</section>
}
function Empty({ children }) { return <div className="town-empty">{children}</div> }
function age(date) { const diff = Math.max(0, Date.now() - new Date(date).getTime()); const m = Math.floor(diff / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`; return new Date(date).toLocaleDateString() }

async function loadStats(ids) {
  if (!ids.length) return []
  const { data, error } = await supabase.rpc('get_public_post_stats', { post_ids: ids })
  if (error) throw error
  return data || []
}

export function FeedPage({ currentUserId }) {
  const [posts, setPosts] = useState([]), [communities, setCommunities] = useState([]), [joinedIds, setJoinedIds] = useState(new Set())
  const [sort, setSort] = useState(() => localStorage.getItem(SORT_KEY) || 'latest'), [communityFilter, setCommunityFilter] = useState('all'), [joinedOnly, setJoinedOnly] = useState(false), [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [busyVote, setBusyVote] = useState(null), [saved, setSaved] = useState(new Set())

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [{ data: rawPosts, error: pe }, { data: cs, error: ce }] = await Promise.all([
        supabase.from('posts').select('id,community_id,topic_id,author_id,post_type,title,body,link_url,media_url,is_pinned,created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(100),
        supabase.from('communities').select('id,name,slug,category').eq('status', 'active').eq('visibility', 'public').order('name')
      ])
      if (pe) throw pe; if (ce) throw ce
      const rows = rawPosts || [], ids = rows.map(p => p.id), authorIds = [...new Set(rows.map(p => p.author_id).filter(Boolean))]
      const [{ data: profiles, error: pre }, { data: memberships, error: me }, { data: votes, error: ve }, { data: saves, error: se }, stats] = await Promise.all([
        authorIds.length ? supabase.from('profiles').select('id,username,display_name').in('id', authorIds) : Promise.resolve({ data: [], error: null }),
        currentUserId ? supabase.from('community_memberships').select('community_id').eq('user_id', currentUserId) : Promise.resolve({ data: [], error: null }),
        currentUserId && ids.length ? supabase.from('post_votes').select('post_id,value').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [], error: null }),
        currentUserId && ids.length ? supabase.from('saved_posts').select('post_id').eq('user_id', currentUserId).in('post_id', ids) : Promise.resolve({ data: [], error: null }),
        loadStats(ids)
      ])
      if (pre) throw pre; if (me) throw me; if (ve) throw ve; if (se) throw se
      const pm = new Map((profiles || []).map(p => [p.id, p])), cm = new Map((cs || []).map(c => [c.id, c])), sm = new Map((stats || []).map(s => [s.post_id, s])), vm = new Map((votes || []).map(v => [v.post_id, v.value]))
      setPosts(rows.map(post => ({ ...post, author: pm.get(post.author_id), community: cm.get(post.community_id), stats: sm.get(post.id) || { comment_count: 0, upvote_score: 0, view_count: 0 }, myVote: vm.get(post.id) || 0 })))
      setCommunities(cs || []); setJoinedIds(new Set((memberships || []).map(m => m.community_id))); setSaved(new Set((saves || []).map(s => s.post_id)))
    } catch (err) { setError(err.message || 'Unable to load the town feed.') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [currentUserId])
  useEffect(() => { localStorage.setItem(SORT_KEY, sort) }, [sort])

  const visiblePosts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const result = posts.filter(post => {
      if (communityFilter !== 'all' && post.community_id !== communityFilter) return false
      if (joinedOnly && !joinedIds.has(post.community_id)) return false
      return !needle || `${post.title} ${post.body} ${post.community?.name || ''} ${post.author?.username || ''}`.toLowerCase().includes(needle)
    })
    return [...result].sort((a, b) => {
      if (sort === 'discussed') return Number(b.stats.comment_count) - Number(a.stats.comment_count) || new Date(b.created_at) - new Date(a.created_at)
      if (sort === 'upvoted') return Number(b.stats.upvote_score) - Number(a.stats.upvote_score) || new Date(b.created_at) - new Date(a.created_at)
      if (sort === 'viewed') return Number(b.stats.view_count) - Number(a.stats.view_count) || new Date(b.created_at) - new Date(a.created_at)
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [posts, communityFilter, joinedOnly, joinedIds, query, sort])

  const vote = async (post, value) => {
    if (!currentUserId || busyVote) return
    setBusyVote(post.id); const next = post.myVote === value ? 0 : value
    try {
      if (next === 0) { const { error: e } = await supabase.from('post_votes').delete().eq('post_id', post.id).eq('user_id', currentUserId); if (e) throw e }
      else { const { error: e } = await supabase.from('post_votes').upsert({ post_id: post.id, user_id: currentUserId, value: next }, { onConflict: 'post_id,user_id' }); if (e) throw e }
      setPosts(current => current.map(item => item.id === post.id ? { ...item, myVote: next, stats: { ...item.stats, upvote_score: Number(item.stats.upvote_score) + next - post.myVote } } : item))
    } catch (err) { setError(err.message || 'Unable to update vote.') } finally { setBusyVote(null) }
  }
  const toggleSave = async post => {
    if (!currentUserId) return
    const isSaved = saved.has(post.id), next = new Set(saved)
    try {
      if (isSaved) { const { error: e } = await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', currentUserId); if (e) throw e; next.delete(post.id) }
      else { const { error: e } = await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUserId }); if (e) throw e; next.add(post.id) }
      setSaved(next)
    } catch (err) { setError(err.message || 'Unable to update saved posts.') }
  }

  return <PageFrame title="Your town, sorted by you." actions={<a className="button primary" href="#/communities">Browse communities</a>}>
    <div className="feed-principle"><strong>No hidden ranking.</strong><span>Choose the sort and communities. The platform does not decide what deserves your attention.</span></div>
    <div className="feed-controls"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search posts…" aria-label="Search posts" /><select value={communityFilter} onChange={e => setCommunityFilter(e.target.value)} aria-label="Filter by community"><option value="all">All communities</option>{communities.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select><select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort feed">{SORTS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select><label className="feed-check"><input type="checkbox" checked={joinedOnly} onChange={e => setJoinedOnly(e.target.checked)} /> Joined only</label></div>
    {error && <div className="town-error">{error}<button className="button secondary" onClick={load}>Retry</button></div>}
    {loading && <div className="town-state">Loading the town feed…</div>}
    {!loading && !visiblePosts.length && <Empty>{posts.length ? <><p>No posts match these filters.</p><div className="feed-empty-actions"><button className="button secondary" onClick={() => { setCommunityFilter('all'); setJoinedOnly(false); setQuery('') }}>Clear filters</button><a className="button secondary" href="#/communities">Explore communities</a></div></> : <><p>There are no published posts to show yet. Town won’t invent activity to fill the feed.</p><div className="feed-empty-actions"><a className="button primary" href="#/communities">Find a community</a><a className="button secondary" href="#/create-post">Start a discussion</a></div></>}</Empty>}
    <div className="feed-list">{visiblePosts.map(post => { const author = post.author?.display_name || post.author?.username || 'Town member'; const score = Number(post.stats.upvote_score || 0); return <article className="feed-card" key={post.id}>
      <div className="feed-card-meta"><a href={`#/community/${post.community?.slug || ''}`}>{post.community?.name || 'Community'}</a><span>·</span><span>{post.community?.category || 'General'}</span>{post.is_pinned && <span className="post-pin-inline">PINNED</span>}</div>
      <h2>{post.title}</h2>{post.body && <p>{post.body}</p>}
      <div className="feed-card-footer"><span>by {author} · {age(post.created_at)}</span><div className="feed-stats"><button className={`feed-action ${post.myVote === 1 ? 'active' : ''}`} disabled={busyVote === post.id} onClick={() => vote(post, 1)}>▲ {score}</button><button className={`feed-action ${post.myVote === -1 ? 'down' : ''}`} disabled={busyVote === post.id} onClick={() => vote(post, -1)}>▼</button><span>{post.stats.comment_count} comments</span><span>{post.stats.view_count} views</span><button className={`feed-action ${saved.has(post.id) ? 'active' : ''}`} onClick={() => toggleSave(post)}>{saved.has(post.id) ? 'Saved' : 'Save'}</button></div></div>
    </article> })}</div>
  </PageFrame>
}
