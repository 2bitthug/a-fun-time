import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function GrowthPage({ currentUserId }) {
  const [communities, setCommunities] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [form, setForm] = useState({ name: '', description: '', reason: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true); setError('')
    const { data, error: e } = await supabase.from('communities').select('id,name,slug,category,created_at').eq('status', 'active').eq('visibility', 'public').order('created_at', { ascending: false })
    if (e) setError(e.message); setCommunities(data || [])
    if (currentUserId) {
      const { data: own, error: se } = await supabase.from('community_suggestions').select('id,name,description,reason,status,created_at').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(10)
      if (se) setError(se.message); setSuggestions(own || [])
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [currentUserId])
  const categoryCount = useMemo(() => new Set(communities.map(c => c.category).filter(Boolean)).size, [communities])
  const recent = communities.slice(0, 8)
  const submit = async e => {
    e.preventDefault(); setMessage(''); setError('')
    if (!currentUserId) return setError('Sign in to suggest a community.')
    const { error: ie } = await supabase.from('community_suggestions').insert({ user_id: currentUserId, name: form.name.trim(), description: form.description.trim(), reason: form.reason.trim() })
    if (ie) return setError(ie.message)
    setForm({ name: '', description: '', reason: '' }); setMessage('Community suggestion submitted.'); load()
  }
  return <section className="town-page">
    <div className="town-page-heading"><div><p className="eyebrow">GROW THE TOWN</p><h1>Help the town expand deliberately.</h1></div><a className="button primary" href="#/create-community">Create a community</a></div>
    <div className="growth-metrics"><div><strong>{loading ? '—' : communities.length}</strong><span>public communities</span></div><div><strong>{loading ? '—' : categoryCount}</strong><span>community categories</span></div><div><strong>{loading ? '—' : recent.length}</strong><span>recent communities shown</span></div></div>
    <div className="growth-grid"><section className="growth-card"><p className="eyebrow">EXPANSION PRINCIPLES</p><h2>Grow where there is a reason to gather.</h2><ul><li>Prefer communities with a clear subject and audience.</li><li>Seed useful starter discussions before inviting people.</li><li>Let active topics become specialized communities when discussion warrants it.</li><li>Reward useful contribution rather than raw posting volume.</li><li>Use explicit discovery instead of a hidden recommendation system.</li></ul></section><section className="growth-card"><p className="eyebrow">RECENT TOWN ADDITIONS</p>{recent.length ? <div className="growth-community-list">{recent.map(c => <a key={c.id} href={`#/community/${c.slug}`}><strong>{c.name}</strong><span>{c.category || 'General'}</span></a>)}</div> : <p className="growth-muted">No communities yet.</p>}</section></div>
    <section className="growth-card growth-suggestion"><p className="eyebrow">COMMUNITY SUGGESTION</p><h2>What should exist next?</h2><form className="town-form" onSubmit={submit}><label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} minLength={2} maxLength={80} required placeholder="Community name" /></label><label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={500} required placeholder="What would people discuss here?" /></label><label>Why it belongs here<textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} maxLength={1000} placeholder="What need or discussion does it serve?" /></label>{message && <p className="growth-success">{message}</p>}{error && <p className="town-error">{error}</p>}<button className="button primary" type="submit">Submit suggestion</button></form></section>
    {currentUserId && <section className="growth-card"><p className="eyebrow">YOUR SUGGESTIONS</p>{!suggestions.length ? <p className="growth-muted">You have not suggested a community yet.</p> : <div className="suggestion-list">{suggestions.map(s => <article key={s.id}><div><strong>{s.name}</strong><span>{s.description}</span></div><em>{s.status}</em></article>)}</div>}</section>}
  </section>
}
