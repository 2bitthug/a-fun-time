import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { avatarUrl } from '../../avatar'

function Frame({ title, eyebrow = 'TOWN', actions, children }) {
  return <section className="town-page"><div className="town-page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{actions && <div className="town-page-actions">{actions}</div>}</div>{children}</section>
}
const ago = (value) => { const d = new Date(value); const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000)); if (s < 60) return `${s}s ago`; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`; return d.toLocaleDateString() }
function State({ children }) { return <div className="town-state">{children}</div> }
function Empty({ children }) { return <div className="town-empty">{children}</div> }
function ErrorBox({ children }) { return <div className="town-error">{children}</div> }

export function SearchPage({ currentUserId }) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('posts')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const search = async (event) => {
    event?.preventDefault(); const q = query.trim(); if (!q) { setResults([]); return }
    setLoading(true); setError('')
    try {
      if (scope === 'communities') {
        const { data, error: e } = await supabase.from('communities').select('id,name,slug,description,category').eq('status','active').or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`).order('name').limit(50)
        if (e) throw e; setResults(data || [])
      } else if (scope === 'users') {
        const { data, error: e } = await supabase.from('profiles').select('id,username,display_name,bio').or(`username.ilike.%${q}%,display_name.ilike.%${q}%,bio.ilike.%${q}%`).limit(50)
        if (e) throw e; setResults(data || [])
      } else {
        const { data, error: e } = await supabase.from('posts').select('id,title,body,community_id,author_id,created_at,status').neq('status','removed').or(`title.ilike.%${q}%,body.ilike.%${q}%`).order('created_at',{ascending:false}).limit(50)
        if (e) throw e
        const ids = [...new Set((data || []).map(p => p.community_id).filter(Boolean))]
        const { data: communities } = ids.length ? await supabase.from('communities').select('id,name,slug').in('id',ids) : { data: [] }
        const map = new Map((communities || []).map(c => [c.id,c])); setResults((data || []).map(p => ({ ...p, community: map.get(p.community_id) })))
      }
    } catch (e) { setError(e.message || 'Search failed.') } finally { setLoading(false) }
  }
  return <Frame title="Search" eyebrow="FIND DELIBERATELY"><form className="platform-search" onSubmit={search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search posts, communities, or people…" /><select value={scope} onChange={e=>setScope(e.target.value)}><option value="posts">Posts</option><option value="communities">Communities</option><option value="users">People</option></select><button className="button primary">Search</button></form>{error && <ErrorBox>{error}</ErrorBox>}{loading ? <State>Searching…</State> : !query.trim() ? <Empty>Search the town by words you choose.</Empty> : !results.length ? <Empty>No results found.</Empty> : <div className="search-results">{results.map(item => scope === 'posts' ? <a className="search-result" href={`#/post/${item.id}`} key={item.id}><strong>{item.title}</strong><span>{item.community?.name || 'Community'} · {ago(item.created_at)}</span><p>{item.body || 'No body text.'}</p></a> : scope === 'communities' ? <a className="search-result" href={`#/community/${item.slug}`} key={item.id}><strong>{item.name}</strong><span>{item.category || 'Community'}</span><p>{item.description || 'No description.'}</p></a> : <a className="search-result" href={`#/profile/${item.id}`} key={item.id}><strong>{item.display_name || item.username}</strong><span>@{item.username}</span><p>{item.bio || 'Town member'}</p></a>)}</div>}</Frame>
}

export function SavedPostsPage({ currentUserId }) {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = async () => { if (!currentUserId) return; setLoading(true); const { data, error: e } = await supabase.from('saved_posts').select('post_id,created_at').eq('user_id',currentUserId).order('created_at',{ascending:false}); if (e) { setError(e.message); setLoading(false); return } const ids=(data||[]).map(x=>x.post_id); if(!ids.length){setItems([]);setLoading(false);return} const {data:posts,error:pe}=await supabase.from('posts').select('id,title,body,community_id,created_at,status').in('id',ids).neq('status','removed'); if(pe)setError(pe.message); const map=new Map((posts||[]).map(p=>[p.id,p])); setItems((data||[]).map(s=>({...s,post:map.get(s.post_id)})).filter(x=>x.post)); setLoading(false) }
  useEffect(()=>{load()},[currentUserId])
  const remove = async id => { await supabase.from('saved_posts').delete().eq('post_id',id).eq('user_id',currentUserId); load() }
  if (loading) return <Frame title="Saved posts"><State>Loading…</State></Frame>
  return <Frame title="Saved posts" actions={<a className="button primary" href="#/feed">Browse feed</a>}>{error && <ErrorBox>{error}</ErrorBox>}{!items.length ? <Empty>You haven't saved any posts yet.</Empty> : <div className="saved-post-list">{items.map(({post})=><article className="saved-post-card" key={post.id}><div><p className="eyebrow">SAVED · {ago(post.created_at)}</p><h2><a href={`#/post/${post.id}`}>{post.title}</a></h2><p>{post.body || 'No body text.'}</p></div><button className="button secondary" onClick={()=>remove(post.id)}>Unsave</button></article>)}</div>}</Frame>
}

export function UserProfilePage({ userId }) {
  const [profile,setProfile]=useState(null), [stats,setStats]=useState({posts:0,comments:0,reputation:0}), [loading,setLoading]=useState(true), [error,setError]=useState('')
  useEffect(()=>{(async()=>{setLoading(true); const [{data:p,error:pe},{data:posts},{data:comments}]=await Promise.all([supabase.from('profiles').select('*').eq('id',userId).maybeSingle(),supabase.from('posts').select('id',{count:'exact',head:true}).eq('author_id',userId).neq('status','removed'),supabase.from('comments').select('id',{count:'exact',head:true}).eq('author_id',userId).neq('status','removed')]); if(pe)setError(pe.message); setProfile(p); setStats({posts:posts?.length||0,comments:comments?.length||0,reputation:p?.reputation_score||0});setLoading(false)})()},[userId])
  if(loading)return <Frame title="Profile"><State>Loading…</State></Frame>
  if(error||!profile)return <Frame title="Profile"><ErrorBox>{error||'Profile not found.'}</ErrorBox></Frame>
  return <Frame title={profile.display_name||profile.username} eyebrow={`@${profile.username}`}><div className="public-profile"><div className="public-profile-main"><div className="public-avatar"><img src={avatarUrl(profile.avatar_id)} alt={`${profile.display_name||profile.username} avatar`} /></div><div><h2>{profile.display_name||profile.username}</h2><p className="profile-joined">Member since {new Date(profile.created_at).toLocaleDateString()}</p>{profile.bio&&<p>{profile.bio}</p>}{profile.pet_id&&profile.pet_id!=='none'&&<span className="profile-pet-preview" aria-label={`Selected pet: ${profile.pet_id}`}>{({lion:'🦁',cat:'🐈',dog:'🐕',fox:'🦊',rabbit:'🐇',bear:'🐻',wolf:'🐺',owl:'🦉',penguin:'🐧',frog:'🐸',turtle:'🐢',deer:'🦌',panda:'🐼',tiger:'🐯',raccoon:'🦝',hedgehog:'🦔',duck:'🦆',squirrel:'🐿️'})[profile.pet_id]||'🐾'}</span>}</div></div><div className="profile-stat-grid"><div><strong>{stats.posts}</strong><span>Posts</span></div><div><strong>{stats.comments}</strong><span>Comments</span></div><div><strong>{stats.reputation}</strong><span>Reputation</span></div><div><strong>{profile.interests?.length||0}</strong><span>Interests</span></div></div>{Array.isArray(profile.interests)&&profile.interests.length>0&&<div><p className="eyebrow">INTERESTS</p><div className="profile-interest-list">{profile.interests.map(x=><span className="profile-interest-chip" key={x}>{x}</span>)}</div></div>}</div></Frame>
}

export function CommunityManagePage({ communityId, currentUserId }) {
  const [community,setCommunity]=useState(null),[members,setMembers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[allowed,setAllowed]=useState(false)
  const load=async()=>{setLoading(true); const {data:c,error:ce}=await supabase.from('communities').select('id,name,slug,description,creator_id').eq('id',communityId).maybeSingle(); if(ce) {setError(ce.message);setLoading(false);return} setCommunity(c); const {data:m,error:me}=await supabase.from('community_memberships').select('community_id,user_id,role,joined_at').eq('community_id',communityId).order('joined_at',{ascending:true}); if(me){setError(me.message);setLoading(false);return} const ids=(m||[]).map(x=>x.user_id); const {data:p}=ids.length?await supabase.from('profiles').select('id,username,display_name').in('id',ids):{data:[]}; const pm=new Map((p||[]).map(x=>[x.id,x])); const rows=(m||[]).map(x=>({...x,profile:pm.get(x.user_id)})); setMembers(rows); setAllowed(c?.creator_id===currentUserId || rows.some(x=>x.user_id===currentUserId&&x.role==='owner'));setLoading(false)}
  useEffect(()=>{load()},[communityId,currentUserId])
  const changeRole=async(userId,role)=>{const {error:e}=await supabase.from('community_memberships').update({role}).eq('community_id',communityId).eq('user_id',userId);if(e)alert(e.message);else load()}
  if(loading)return <Frame title="Community management"><State>Loading…</State></Frame>
  if(error)return <Frame title="Community management"><ErrorBox>{error}</ErrorBox></Frame>
  if(!community||!allowed)return <Frame title="Community management"><ErrorBox>You do not have permission to manage this community.</ErrorBox></Frame>
  return <Frame title={community.name} eyebrow="COMMUNITY MANAGEMENT" actions={<a className="button secondary" href={`#/community/${community.slug}`}>Back to community</a>}><div className="manage-layout"><div className="town-side-card"><p className="eyebrow">COMMUNITY</p><h2>{community.name}</h2><p>{community.description||'No description.'}</p><a className="button primary" href={`#/create-post/${community.slug}`}>Create a post</a></div><div><div className="town-section-heading"><div><p className="eyebrow">MEMBERS</p><h2>{members.length} members</h2></div></div><div className="member-management">{members.map(m=><div className="member-row" key={m.user_id}><div><strong>{m.profile?.display_name||m.profile?.username||'Member'}</strong><span>@{m.profile?.username||'unknown'} · joined {new Date(m.joined_at).toLocaleDateString()}</span></div><select value={m.role} onChange={e=>changeRole(m.user_id,e.target.value)}><option value="member">Member</option><option value="moderator">Moderator</option><option value="owner">Owner</option></select></div>)}</div></div></div></Frame>
}
