import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const SORTS = [
  ['latest', 'Latest'],
  ['discussed', 'Most discussed'],
]

function PageFrame({ eyebrow = 'TOWN', title, children, actions }) {
  return (
    <section className="town-page">
      <div className="town-page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {actions && <div className="town-page-actions">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

function Loading() {
  return <div className="town-state">Loading…</div>
}

function Empty({ children }) {
  return <div className="town-empty">{children}</div>
}

export function TownHomePage() {
  return (
    <PageFrame eyebrow="TOWN" title="A place to find people and conversations.">
      <div className="town-hero town-hero-clean">
        <div className="town-hero-copy">
          <p className="town-kicker">A TOWN BUILT BY ITS MEMBERS</p>
          <h2>The platform helps you find things. It doesn’t decide what you should care about.</h2>
          <p>Browse communities, search deliberately, and choose how discussions are sorted. No hidden recommendation score.</p>
        </div>
      </div>
    </PageFrame>
  )
}

export function CommunitiesPage() {
  const [communities, setCommunities] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('latest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await supabase
      .from('communities')
      .select('id,name,slug,description,category,icon_url,creator_id,created_at,status')
      .eq('status', 'active')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
    if (fetchError) setError(fetchError.message)
    setCommunities(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const categories = useMemo(() => ['All', ...Array.from(new Set(communities.map(c => c.category).filter(Boolean))).sort()], [communities])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const result = communities.filter(c => {
      const matchesQuery = !needle || `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(needle)
      const matchesCategory = category === 'All' || c.category === category
      return matchesQuery && matchesCategory
    })
    if (sort === 'latest') return result
    return [...result].sort((a, b) => a.name.localeCompare(b.name))
  }, [communities, query, category, sort])
  const curated = useMemo(() => {
    if (showAll || query.trim() || category !== 'All') return filtered
    return filtered.slice(0, 7)
  }, [filtered, showAll, query, category])

  return (
    <PageFrame
      eyebrow="COMMUNITIES"
      title="Choose where to spend your attention."
      actions={<a className="button primary" href="#/create-community">Create community</a>}
    >
      <div className="town-directory-intro"><p>Start with a small set of communities. Explore the full directory whenever you want.</p><button type="button" className="button secondary" onClick={() => setShowAll(v => !v)}>{showAll ? 'Show curated selection' : `Show all ${communities.length} communities`}</button></div>
      <div className="town-directory-controls">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search communities…" aria-label="Search communities" />
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category">
          {categories.map(item => <option key={item}>{item}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort communities">
          <option value="latest">Latest</option>
          <option value="name">Name</option>
        </select>
      </div>

      {loading && <Loading />}
      {error && <div className="town-error">{error}<button className="button secondary" onClick={load}>Retry</button></div>}
      {!loading && !error && !filtered.length && <Empty>{query || category !== 'All' ? 'No communities match your filters.' : 'No communities have been seeded yet.'}</Empty>}
      <div className="community-grid">
        {curated.map(community => (
          <a className="community-card" href={`#/community/${community.slug}`} key={community.id}>
            <div className="community-card-icon">{community.icon_url ? <img src={community.icon_url} alt="" /> : community.name.slice(0, 1).toUpperCase()}</div>
            <div className="community-card-body">
              <div className="community-card-topline"><span>{community.category}</span></div>
              <h2>{community.name}</h2>
              <p>{community.description || 'A community in the town.'}</p>
              <span className="community-open">Open community →</span>
            </div>
          </a>
        ))}
      </div>
    </PageFrame>
  )
}

export function CommunityPage({ slug, currentUserId }) {
  const [community, setCommunity] = useState(null)
  const [categories, setCategories] = useState([])
  const [posts, setPosts] = useState([])
  const [member, setMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const { data: communityData, error: communityError } = await supabase
      .from('communities')
      .select('id,name,slug,description,rules,category,icon_url,created_at')
      .eq('slug', slug)
      .maybeSingle()
    if (communityError || !communityData) {
      setError(communityError?.message || 'Community not found.')
      setLoading(false)
      return
    }
    const [{ data: categoryData, error: categoryError }, { data: postData, error: postError }, membership] = await Promise.all([
      supabase.from('community_categories').select('id,name,description,position').eq('community_id', communityData.id).order('position'),
      supabase.from('posts').select('id,title,body,post_type,created_at,is_pinned,author_id').eq('community_id', communityData.id).eq('status', 'published').order('created_at', { ascending: false }).limit(20),
      currentUserId ? supabase.from('community_memberships').select('role').eq('community_id', communityData.id).eq('user_id', currentUserId).maybeSingle() : Promise.resolve({ data: null })
    ])
    if (categoryError || postError) setError(categoryError?.message || postError?.message || 'Unable to load community.')
    setCommunity(communityData)
    setCategories(categoryData || [])
    setPosts(postData || [])
    setMember(Boolean(membership?.data))
    setLoading(false)
  }

  useEffect(() => { load(); window.dispatchEvent(new CustomEvent('town-pet-event', { detail: { kind: 'community-opened', label: slug } })) }, [slug, currentUserId])

  const toggleMembership = async () => {
    if (!currentUserId || !community) return
    setBusy(true)
    if (member) {
      const { error: leaveError } = await supabase.from('community_memberships').delete().eq('community_id', community.id).eq('user_id', currentUserId)
      if (leaveError) setError(leaveError.message)
      else setMember(false)
    } else {
      const { error: joinError } = await supabase.from('community_memberships').insert({ community_id: community.id, user_id: currentUserId, role: 'member' })
      if (joinError) setError(joinError.message)
      else setMember(true)
    }
    setBusy(false)
  }

  if (loading) return <PageFrame eyebrow="COMMUNITY" title="Loading…"><Loading /></PageFrame>
  if (error && !community) return <PageFrame eyebrow="COMMUNITY" title="Community unavailable"><div className="town-error">{error}<button className="button secondary" onClick={load}>Retry</button></div></PageFrame>

  return (
    <PageFrame
      eyebrow={community.category}
      title={community.name}
      actions={<><a className="button primary" href="#/create-post">New post</a>{currentUserId && <button className={`button ${member ? 'secondary' : 'primary'}`} disabled={busy} onClick={toggleMembership}>{busy ? 'Working…' : member ? 'Leave community' : 'Join community'}</button>}</>}
    >
      <div className="community-header">
        <p>{community.description || 'No description yet.'}</p>
        <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
      </div>
      {error && <div className="town-error">{error}</div>}

      <div className="community-layout">
        <section>
          <div className="town-section-heading"><div><p className="eyebrow">DISCUSSION</p><h2>Recent posts</h2></div></div>
          {!posts.length ? <Empty>No posts yet. Be the first person to start a discussion.</Empty> : <div className="post-list">
            {posts.map(post => <article className="post-card" key={post.id}>
              {post.is_pinned && <span className="post-pin">PINNED</span>}
              <span className="post-type">{post.post_type}</span>
              <h3><a className="post-title-link" href={`#/post/${post.id}`}>{post.title}</a></h3>
              <p>{post.body || 'No body text.'}</p>
              <span>{new Date(post.created_at).toLocaleString()}</span>
            </article>)}
          </div>}
        </section>
        <aside className="community-sidebar">
          <div className="town-side-card"><p className="eyebrow">TOPICS</p><h3>Community structure</h3>{categories.length ? <ul>{categories.map(c => <li key={c.id}><strong>{c.name}</strong><span>{c.description}</span></li>)}</ul> : <p>No categories yet.</p>}</div>
          <div className="town-side-card"><p className="eyebrow">RULES</p><h3>Community rules</h3><p>{community.rules || 'No rules have been published yet.'}</p></div>
        </aside>
      </div>
    </PageFrame>
  )
}

export function CreateCommunityPage({ currentUserId }) {
  const [form, setForm] = useState({ name: '', slug: '', description: '', category: 'General', rules: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const { data, error: createError } = await supabase.from('communities').insert({ ...form, name: form.name.trim(), slug, creator_id: currentUserId }).select('id,slug').single()
    if (createError) {
      setError(createError.message)
      setBusy(false)
      return
    }
    const { error: memberError } = await supabase.from('community_memberships').insert({ community_id: data.id, user_id: currentUserId, role: 'owner' })
    if (memberError) {
      setError(memberError.message)
      setBusy(false)
      return
    }
    window.location.hash = `#/community/${data.slug}`
  }

  return <PageFrame eyebrow="COMMUNITIES" title="Create a community">
    <form className="town-form" onSubmit={submit}>
      <label>Name<input value={form.name} onChange={e => update('name', e.target.value)} minLength={2} maxLength={80} required placeholder="e.g. Bengaluru Builders" /></label>
      <label>Slug<input value={form.slug} onChange={e => update('slug', e.target.value)} maxLength={80} required placeholder="bengaluru-builders" /></label>
      <label>Category<input value={form.category} onChange={e => update('category', e.target.value)} maxLength={60} required /></label>
      <label>Description<textarea value={form.description} onChange={e => update('description', e.target.value)} maxLength={500} placeholder="What belongs here?" /></label>
      <label>Rules<textarea value={form.rules} onChange={e => update('rules', e.target.value)} maxLength={5000} placeholder="Keep the discussion useful and respectful." /></label>
      {error && <div className="town-error">{error}</div>}
      <div className="town-form-actions"><button className="button primary" disabled={busy}>{busy ? 'Creating…' : 'Create community'}</button><a className="button secondary" href="#/communities">Cancel</a></div>
    </form>
  </PageFrame>
}
