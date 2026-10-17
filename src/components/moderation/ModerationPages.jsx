import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Frame({ title, children }) { return <section className="town-page"><div className="town-page-heading"><div><p className="eyebrow">MODERATION</p><h1>{title}</h1></div></div>{children}</section> }
function State({ children }) { return <div className="town-state">{children}</div> }

export function ModerationPage({ currentUserId }) {
  const [reports, setReports] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [allowed, setAllowed] = useState(false), [busy, setBusy] = useState('')
  const load = async () => {
    if (!currentUserId) return
    setLoading(true); setError('')
    try {
      const { data: memberships, error: me } = await supabase.from('community_memberships').select('community_id,role').eq('user_id', currentUserId).in('role', ['moderator','owner'])
      if (me) throw me
      const ids = (memberships || []).map(m => m.community_id)
      setAllowed(ids.length > 0)
      if (!ids.length) { setReports([]); return }
      const { data, error: re } = await supabase.from('reports').select('id,community_id,reporter_id,post_id,comment_id,reported_user_id,reason,status,created_at').in('community_id', ids).in('status', ['open','reviewing']).order('created_at', { ascending: false })
      if (re) throw re
      const postIds = [...new Set((data || []).map(r => r.post_id).filter(Boolean))]
      const commentIds = [...new Set((data || []).map(r => r.comment_id).filter(Boolean))]
      const communityIds = [...new Set((data || []).map(r => r.community_id).filter(Boolean))]
      const [{ data: posts }, { data: comments }, { data: communities }] = await Promise.all([
        postIds.length ? supabase.from('posts').select('id,title,status').in('id', postIds) : Promise.resolve({ data: [] }),
        commentIds.length ? supabase.from('comments').select('id,body,status').in('id', commentIds) : Promise.resolve({ data: [] }),
        communityIds.length ? supabase.from('communities').select('id,name,slug').in('id', communityIds) : Promise.resolve({ data: [] })
      ])
      const pm = new Map((posts || []).map(x => [x.id, x])), cm = new Map((comments || []).map(x => [x.id, x])), com = new Map((communities || []).map(x => [x.id, x]))
      setReports((data || []).map(r => ({ ...r, post: pm.get(r.post_id), comment: cm.get(r.comment_id), community: com.get(r.community_id) })))
    } catch (e) { setError(e.message || 'Unable to load moderation queue.') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [currentUserId])
  const act = async (report, action) => {
    setBusy(report.id)
    try {
      if (action !== 'dismiss') {
        const payload = { community_id: report.community_id, moderator_id: currentUserId, post_id: report.post_id || null, comment_id: report.comment_id || null, action_type: action, reason: report.reason }
        const { error: ae } = await supabase.from('moderation_actions').insert(payload); if (ae) throw ae
      }
      const status = action === 'dismiss' ? 'dismissed' : 'resolved'
      const { error: re } = await supabase.from('reports').update({ status, resolved_at: new Date().toISOString(), resolved_by: currentUserId }).eq('id', report.id)
      if (re) throw re
      if (action === 'remove_post' && report.post_id) await supabase.from('posts').update({ status: 'removed' }).eq('id', report.post_id)
      if (action === 'remove_comment' && report.comment_id) await supabase.from('comments').update({ status: 'removed' }).eq('id', report.comment_id)
      await load()
    } catch (e) { alert(e.message || 'Moderation action failed.') } finally { setBusy('') }
  }
  if (loading) return <Frame title="Moderation queue"><State>Loading…</State></Frame>
  if (error) return <Frame title="Moderation queue"><div className="town-error">{error}</div></Frame>
  if (!allowed) return <Frame title="Moderation"><State>You are not a moderator or owner of any community yet.</State></Frame>
  return <Frame title="Moderation queue">
    <p className="widget-help">Review reports from communities where you are a moderator or owner. Actions are recorded in the moderation log.</p>
    {!reports.length ? <div className="town-empty">No open reports.</div> : <div className="moderation-list">{reports.map(r => <article className="moderation-card" key={r.id}>
      <div><p className="eyebrow">{r.community?.name || 'COMMUNITY'} · {r.status}</p><h3>{r.post ? r.post.title : 'Reported comment'}</h3><p>{r.comment ? r.comment.body : r.reason}</p><small>Reason: {r.reason}</small></div>
      <div className="actions"><button className="button danger" disabled={busy === r.id} onClick={() => act(r, r.post_id ? 'remove_post' : 'remove_comment')}>{r.post_id ? 'Remove post' : 'Remove comment'}</button><button className="button secondary" disabled={busy === r.id} onClick={() => act(r, 'dismiss')}>Dismiss</button></div>
    </article>)}</div>}
  </Frame>
}
