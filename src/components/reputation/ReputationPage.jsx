import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const badgeIcons = { post: 'P', comment: 'C', helpful: 'H', community: 'T', moderator: 'M' }

export function ReputationPage({ currentUserId }) {
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [badges, setBadges] = useState([])
  const [stats, setStats] = useState({ posts: 0, comments: 0, votes: 0 })
  const [daysJoined, setDaysJoined] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      const [profileRes, eventsRes, badgesRes, postsRes, commentsRes, votesRes] = await Promise.all([
        supabase.from('profiles').select('id,username,reputation_score,created_at,bio,interests').eq('id', currentUserId).single(),
        supabase.from('reputation_events').select('id,event_type,points,post_id,comment_id,created_at').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(50),
        supabase.from('user_badges').select('awarded_at,badges(id,slug,name,description,icon)').eq('user_id', currentUserId).order('awarded_at', { ascending: false }),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', currentUserId),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', currentUserId),
        supabase.from('post_votes').select('post_id', { count: 'exact', head: true }).eq('user_id', currentUserId)
      ])
      if (!active) return
      if (profileRes.error) setError(profileRes.error.message)
      setProfile(profileRes.data)
      const joinedAt = profileRes.data?.created_at ? new Date(profileRes.data.created_at) : null
      setDaysJoined(joinedAt && !Number.isNaN(joinedAt.getTime()) ? Math.max(0, Math.floor((Date.now() - joinedAt.getTime()) / 86400000)) : null)
      setEvents(eventsRes.data || [])
      setBadges((badgesRes.data || []).map(x => ({ ...x.badges, awarded_at: x.awarded_at })).filter(Boolean))
      setStats({ posts: postsRes.count || 0, comments: commentsRes.count || 0, votes: votesRes.count || 0 })
      setLoading(false)
    }
    if (currentUserId) load()
    return () => { active = false }
  }, [currentUserId])

  const positive = useMemo(() => events.filter(e => e.points > 0).reduce((sum, e) => sum + e.points, 0), [events])
  const negative = useMemo(() => Math.abs(events.filter(e => e.points < 0).reduce((sum, e) => sum + e.points, 0)), [events])
  const label = (type) => ({ post_created: 'Published a post', comment_created: 'Added a comment', post_upvoted: 'Received a post upvote', comment_upvoted: 'Received a comment upvote', post_downvoted: 'Received a post downvote', comment_downvoted: 'Received a comment downvote', moderator_recognition: 'Moderator recognition', badge_awarded: 'Badge awarded', manual_adjustment: 'Manual adjustment' }[type] || type)

  if (loading) return <section className="card"><p className="status">Loading contribution profile…</p></section>
  if (error) return <section className="card"><p className="status error">{error}</p></section>

  return <div className="reputation-page">
    <section className="reputation-hero card">
      <div><p className="eyebrow">CONTRIBUTION</p><h1>{profile?.username || 'Member'}'s reputation</h1><p className="feature-text">Reputation reflects useful participation, not time spent on the platform.</p></div>
      <div className="reputation-score"><strong>{profile?.reputation_score || 0}</strong><span>reputation</span></div>
    </section>
    <div className="reputation-grid">
      <section className="card"><div className="card-heading"><div><p className="eyebrow">ACTIVITY</p><h2>Contribution</h2></div></div><div className="reputation-stat-grid"><div><strong>{daysJoined === null ? '—' : daysJoined}</strong><span>Days joined</span></div><div><strong>{stats.posts}</strong><span>Posts</span></div><div><strong>{stats.comments}</strong><span>Comments</span></div><div><strong>{stats.votes}</strong><span>Votes cast</span></div><div><strong>+{positive}</strong><span>Positive points</span></div><div><strong>-{negative}</strong><span>Negative points</span></div></div></section>
      <section className="card"><div className="card-heading"><div><p className="eyebrow">RECOGNITION</p><h2>Badges</h2></div></div>{badges.length ? <div className="badge-grid">{badges.map(b => <div className="badge-card" key={b.id}><span className="badge-icon">{badgeIcons[b.icon] || '★'}</span><div><strong>{b.name}</strong><p>{b.description}</p></div></div>)}</div> : <div className="empty-state"><strong>No badges yet.</strong><span>Keep contributing. Recognition is based on useful participation.</span></div>}</section>
    </div>
    <section className="card"><div className="card-heading"><div><p className="eyebrow">TRANSPARENT LEDGER</p><h2>Recent reputation</h2></div></div>{events.length ? <div className="reputation-events">{events.map(e => <div className="reputation-event" key={e.id}><div><strong>{label(e.event_type)}</strong><span>{new Date(e.created_at).toLocaleString()}</span></div><b className={e.points >= 0 ? 'points positive' : 'points negative'}>{e.points >= 0 ? '+' : ''}{e.points}</b></div>)}</div> : <div className="empty-state"><strong>No reputation events yet.</strong><span>Your contribution history will appear here.</span></div>}</section>
  </div>
}
