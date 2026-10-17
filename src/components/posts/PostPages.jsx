import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Frame({ eyebrow = 'DISCUSSION', title, actions, children }) {
  return <section className="town-page"><div className="town-page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{actions && <div className="town-page-actions">{actions}</div>}</div>{children}</section>
}
function State({ children }) { return <div className="town-state">{children}</div> }
function ErrorBox({ message, retry }) { return <div className="town-error"><span>{message}</span>{retry && <button className="button secondary" onClick={retry}>Retry</button>}</div> }
function ago(value) { const d = Math.max(0, Date.now() - new Date(value).getTime()); const m = Math.floor(d / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const days = Math.floor(h / 24); return days < 30 ? `${days}d ago` : new Date(value).toLocaleDateString() }

function VoteBar({ postId, currentUserId, initialScore = 0, initialVote = 0, compact = false }) {
  const [score, setScore] = useState(Number(initialScore) || 0)
  const [vote, setVote] = useState(Number(initialVote) || 0)
  const [busy, setBusy] = useState(false)
  const change = async value => {
    if (!currentUserId || busy) return
    setBusy(true)
    const next = vote === value ? 0 : value
    try {
      if (!next) { const { error } = await supabase.from('post_votes').delete().eq('post_id', postId).eq('user_id', currentUserId); if (error) throw error }
      else { const { error } = await supabase.from('post_votes').upsert({ post_id: postId, user_id: currentUserId, value: next }, { onConflict: 'post_id,user_id' }); if (error) throw error }
      setScore(score + next - vote); setVote(next)
    } catch (e) { console.error(e) } finally { setBusy(false) }
  }
  return <div className={`discussion-votes ${compact ? 'compact' : ''}`}><button disabled={!currentUserId || busy} className={vote === 1 ? 'selected' : ''} onClick={() => change(1)}>▲</button><strong>{score}</strong><button disabled={!currentUserId || busy} className={vote === -1 ? 'selected down' : ''} onClick={() => change(-1)}>▼</button></div>
}


function ReportDialog({ currentUserId, communityId, postId = null, commentId = null, onClose }) {
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false)
  const submit = async e => {
    e.preventDefault(); if (!reason.trim() || !currentUserId) return
    setBusy(true)
    const { error } = await supabase.from('reports').insert({ reporter_id: currentUserId, community_id: communityId, post_id: postId, comment_id: commentId, reason: reason.trim() })
    if (error) alert(error.message); else setDone(true)
    setBusy(false)
  }
  return <div className="report-backdrop" role="dialog" aria-modal="true" aria-label="Report content"><div className="report-dialog">
    {done ? <><h3>Report submitted</h3><p>Thanks. A moderator can review it from the community moderation queue.</p><button className="button primary" onClick={onClose}>Close</button></> : <form onSubmit={submit}><p className="eyebrow">REPORT</p><h3>What is wrong with this content?</h3><textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} placeholder="Briefly explain the problem…" required /><div className="town-form-actions"><button className="button primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit report'}</button><button type="button" className="button secondary" onClick={onClose}>Cancel</button></div></form>}
  </div></div>
}

function Comment({ comment, children, currentUserId, communityId, onChanged }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false), [reporting, setReporting] = useState(false)
  const [editText, setEditText] = useState(comment.body || '')
  const canEdit = currentUserId === comment.author_id
  const submitReply = async e => {
    e.preventDefault(); if (!text.trim() || !currentUserId) return
    setBusy(true)
    const { error } = await supabase.from('comments').insert({ post_id: comment.post_id, parent_id: comment.id, author_id: currentUserId, body: text.trim() })
    if (!error) { setText(''); setReplyOpen(false); onChanged() } else alert(error.message)
    setBusy(false)
  }
  const saveEdit = async e => {
    e.preventDefault(); if (!editText.trim()) return
    setBusy(true)
    const { error } = await supabase.from('comments').update({ body: editText.trim(), edited_at: new Date().toISOString() }).eq('id', comment.id).eq('author_id', currentUserId)
    if (!error) { setEditing(false); onChanged() } else alert(error.message)
    setBusy(false)
  }
  const remove = async () => { if (!confirm('Delete this comment?')) return; const { error } = await supabase.from('comments').update({ status: 'removed' }).eq('id', comment.id).eq('author_id', currentUserId); if (!error) onChanged(); else alert(error.message) }
  return <article className="comment-item">
    <div className="comment-head"><strong>{comment.author?.display_name || comment.author?.username || 'Town member'}</strong><span>{ago(comment.created_at)}{comment.edited_at ? ' · edited' : ''}</span></div>
    {editing ? <form className="comment-edit" onSubmit={saveEdit}><textarea value={editText} onChange={e => setEditText(e.target.value)} maxLength={2000} /><div><button className="button primary" disabled={busy}>Save</button><button type="button" className="button secondary" onClick={() => setEditing(false)}>Cancel</button></div></form> : <p>{comment.body}</p>}
    <div className="comment-actions">{currentUserId && <button onClick={() => setReplyOpen(v => !v)}>Reply</button>}{canEdit && <><button onClick={() => setEditing(true)}>Edit</button><button onClick={remove}>Delete</button></>}{currentUserId && !canEdit && <button onClick={() => setReporting(true)}>Report</button>}</div>
    {reporting && <ReportDialog currentUserId={currentUserId} communityId={communityId} commentId={comment.id} onClose={() => setReporting(false)} />}
    {replyOpen && <form className="reply-form" onSubmit={submitReply}><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write a reply…" maxLength={2000} required /><button className="button primary" disabled={busy}>{busy ? 'Posting…' : 'Reply'}</button></form>}
    {children && <div className="comment-children">{children}</div>}
  </article>
}

export function PostPage({ postId, currentUserId }) {
  const [post, setPost] = useState(null), [comments, setComments] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [commentText, setCommentText] = useState(''), [busy, setBusy] = useState(false), [editing, setEditing] = useState(false), [editTitle, setEditTitle] = useState(''), [editBody, setEditBody] = useState(''), [reporting, setReporting] = useState(false)
  const load = async () => {
    setLoading(true); setError('')
    try {
      const { data: p, error: pe } = await supabase.from('posts').select('id,community_id,topic_id,author_id,post_type,title,body,link_url,media_url,is_pinned,created_at,updated_at').eq('id', postId).eq('status', 'published').maybeSingle()
      if (pe) throw pe; if (!p) throw new Error('Post not found.')
      const [{ data: community, error: ce }, { data: topic, error: te }, { data: author, error: ae }, { data: cs, error: cse }, { data: vote, error: ve }] = await Promise.all([
        supabase.from('communities').select('id,name,slug,category').eq('id', p.community_id).maybeSingle(),
        p.topic_id ? supabase.from('topics').select('id,name').eq('id', p.topic_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('profiles').select('id,username,display_name').eq('id', p.author_id).maybeSingle(),
        supabase.from('comments').select('id,post_id,parent_id,author_id,body,status,created_at,edited_at').eq('post_id', p.id).neq('status', 'removed').order('created_at', { ascending: true }),
        currentUserId ? supabase.from('post_votes').select('value').eq('post_id', p.id).eq('user_id', currentUserId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ])
      if (ce || te || ae || cse || ve) throw ce || te || ae || cse || ve
      const authorIds = [...new Set((cs || []).map(c => c.author_id).filter(Boolean))]
      const { data: commentAuthors, error: cae } = authorIds.length ? await supabase.from('profiles').select('id,username,display_name').in('id', authorIds) : { data: [], error: null }
      if (cae) throw cae
      const authorMap = new Map((commentAuthors || []).map(a => [a.id, a]))
      const tree = (cs || []).map(c => ({ ...c, author: authorMap.get(c.author_id) }))
      const { data: stats } = await supabase.rpc('get_public_post_stats', { post_ids: [p.id] })
      setPost({ ...p, community, topic, author, score: Number(stats?.[0]?.upvote_score || 0), views: Number(stats?.[0]?.view_count || 0), myVote: vote?.value || 0 })
      setComments(tree)
      await supabase.rpc('record_post_view', { target_post_id: p.id })
    } catch (e) { setError(e.message || 'Unable to load this discussion.') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [postId, currentUserId])
  const grouped = useMemo(() => { const map = new Map(); comments.forEach(c => map.set(c.id, { ...c, children: [] })); const roots = []; map.forEach(c => { if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id).children.push(c); else roots.push(c) }); return roots }, [comments])
  const submitComment = async e => { e.preventDefault(); if (!commentText.trim() || !currentUserId) return; setBusy(true); const { error } = await supabase.from('comments').insert({ post_id: post.id, author_id: currentUserId, body: commentText.trim() }); if (!error) { setCommentText(''); load() } else alert(error.message); setBusy(false) }
  const savePost = async e => { e.preventDefault(); if (!editTitle.trim()) return; setBusy(true); const { error } = await supabase.from('posts').update({ title: editTitle.trim(), body: editBody.trim(), updated_at: new Date().toISOString() }).eq('id', post.id).eq('author_id', currentUserId); if (!error) { setEditing(false); load() } else alert(error.message); setBusy(false) }
  const deletePost = async () => { if (!confirm('Delete this post?')) return; const { error } = await supabase.from('posts').update({ status: 'removed' }).eq('id', post.id).eq('author_id', currentUserId); if (!error) window.location.hash = `#/community/${post.community.slug}`; else alert(error.message) }
  if (loading) return <Frame title="Loading discussion…"><State>Loading…</State></Frame>
  if (error || !post) return <Frame title="Discussion unavailable"><ErrorBox message={error || 'Post not found.'} retry={load} /></Frame>
  const canEdit = currentUserId === post.author_id
  return <Frame eyebrow={post.community?.name || 'DISCUSSION'} title={post.title} actions={<><a className="button secondary" href={`#/community/${post.community?.slug}`}>Back to community</a>{canEdit && <button className="button secondary" onClick={() => { setEditing(true); setEditTitle(post.title); setEditBody(post.body || '') }}>Edit</button>}{currentUserId && !canEdit && <button className="button secondary" onClick={() => setReporting(true)}>Report</button>}</>}>
    <article className="discussion-post">
      <div className="discussion-meta"><span>{post.post_type}</span>{post.topic?.name && <span>· {post.topic.name}</span>}<span>· by {post.author?.display_name || post.author?.username || 'Town member'}</span><span>· {ago(post.created_at)}</span></div>
      {editing ? <form className="town-form" onSubmit={savePost}><label>Title<input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={160} required /></label><label>Body<textarea value={editBody} onChange={e => setEditBody(e.target.value)} maxLength={10000} /></label><div className="town-form-actions"><button className="button primary" disabled={busy}>Save changes</button><button type="button" className="button secondary" onClick={() => setEditing(false)}>Cancel</button><button type="button" className="button danger" onClick={deletePost}>Delete post</button></div></form> : <><div className="discussion-body">{post.body && <p>{post.body}</p>}{post.link_url && <a className="discussion-link" href={post.link_url} target="_blank" rel="noreferrer">Open linked resource →</a>}{post.media_url && <img className="discussion-media" src={post.media_url} alt="Post media" />}</div></>}
      <div className="discussion-footer"><VoteBar postId={post.id} currentUserId={currentUserId} initialScore={post.score} initialVote={post.myVote} /><span>{post.views} views</span><span>{comments.length} comments</span></div>
    </article>
    {reporting && <ReportDialog currentUserId={currentUserId} communityId={post.community_id} postId={post.id} onClose={() => setReporting(false)} />}
    <section className="discussion-comments"><div className="town-section-heading"><div><p className="eyebrow">DISCUSSION</p><h2>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</h2></div></div>
      {currentUserId ? <form className="comment-composer" onSubmit={submitComment}><textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Join the discussion…" maxLength={2000} required /><button className="button primary" disabled={busy}>{busy ? 'Posting…' : 'Post comment'}</button></form> : <State>Sign in to join the discussion.</State>}
      {!grouped.length ? <div className="town-empty">No comments yet. Start the discussion.</div> : <div className="comment-tree">{grouped.map(c => <Comment key={c.id} comment={c} currentUserId={currentUserId} communityId={post.community_id} onChanged={load}>{c.children.map(child => <Comment key={child.id} comment={child} currentUserId={currentUserId} communityId={post.community_id} onChanged={load}>{child.children?.map(grand => <Comment key={grand.id} comment={grand} currentUserId={currentUserId} communityId={post.community_id} onChanged={load} />)}</Comment>)}</Comment>)}</div>}
    </section>
  </Frame>
}

export function CreatePostPage({ currentUserId, communitySlug, postId }) {
  const [communities, setCommunities] = useState([]), [topics, setTopics] = useState([])
  const [form, setForm] = useState({ community_id: '', topic_id: '', post_type: 'discussion', title: '', body: '', link_url: '' })
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => { (async () => { const { data } = await supabase.from('communities').select('id,name,slug').eq('status','active').order('name'); setCommunities(data || []); const target = (data || []).find(c => c.slug === communitySlug); if (target) setForm(f => ({ ...f, community_id: target.id })) })() }, [communitySlug])
  useEffect(() => { if (!form.community_id) { setTopics([]); return } supabase.from('topics').select('id,name').eq('community_id', form.community_id).order('position').then(({ data }) => setTopics(data || [])) }, [form.community_id])
  const submit = async e => { e.preventDefault(); if (!currentUserId) return; setBusy(true); setError(''); const payload = { ...form, author_id: currentUserId, topic_id: form.topic_id || null, link_url: form.link_url.trim() || null, body: form.body.trim() }; if (!payload.title.trim()) { setError('Add a title.'); setBusy(false); return } const { data, error: e1 } = await supabase.from('posts').insert(payload).select('id').single(); if (e1) { setError(e1.message); setBusy(false); return } window.location.hash = `#/post/${data.id}` }
  return <Frame eyebrow="POST" title="Start a discussion"><form className="town-form post-composer-form" onSubmit={submit}><label>Community<select value={form.community_id} onChange={e => setForm({ ...form, community_id: e.target.value, topic_id: '' })} required><option value="">Choose a community</option>{communities.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>{topics.length > 0 && <label>Topic<select value={form.topic_id} onChange={e => setForm({ ...form, topic_id: e.target.value })}><option value="">No specific topic</option>{topics.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>}<label>Post type<select value={form.post_type} onChange={e => setForm({ ...form, post_type: e.target.value })}><option value="discussion">Discussion</option><option value="question">Question</option><option value="link">Link</option><option value="media">Media</option></select></label><label>Title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={160} required placeholder="What do you want the town to discuss?" /></label><label>Body<textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} maxLength={10000} placeholder="Add context, details, or your question…" /></label>{form.post_type === 'link' && <label>Link URL<input type="url" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="https://…" required /></label>}{error && <div className="town-error">{error}</div>}<div className="town-form-actions"><button className="button primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish post'}</button><a className="button secondary" href={communitySlug ? `#/community/${communitySlug}` : '#/feed'}>Cancel</a></div></form></Frame>
}
