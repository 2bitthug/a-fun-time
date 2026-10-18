import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const moods = { idle: 'Content', moving: 'Wandering', reacting: 'Curious', sleeping: 'Sleepy' }
const defaultName = 'Pixel'

export function PetCompanion({ userId, petId }) {
  const key = userId ? `town-pet-companion:${userId}` : 'town-pet-companion:guest'
  const [pet, setPet] = useState({ name: defaultName, state: 'idle', care: 3, progress: 0, accessory: 'none', personality: 'curious', animation: 'breathe' })
  const [open, setOpen] = useState(false)
  const [suggestion, setSuggestion] = useState('Explore a community that matches your interests.')
  const [saved, setSaved] = useState(false)
  const sprite = petId && petId !== 'none' ? `/pets/${petId}.svg` : ''

  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem(key) || '{}'); setPet(p => ({ ...p, ...stored, state: 'idle' })) } catch {}
  }, [key])

  useEffect(() => {
    if (!userId) return
    let active = true
    supabase.from('profiles').select('pet_name').eq('id', userId).maybeSingle().then(({ data }) => {
      if (!active || !data?.pet_name) return
      setPet(p => ({ ...p, name: data.pet_name }))
    }).catch(() => {})
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    const persist = () => { try { localStorage.setItem(key, JSON.stringify({ name: pet.name, care: pet.care, progress: pet.progress, accessory: pet.accessory, personality: pet.personality, animation: pet.animation })) } catch {} }
    persist()
  }, [key, pet.name, pet.care, pet.progress, pet.accessory, pet.personality, pet.animation])

  useEffect(() => {
    let idleTimer, moveTimer
    const setState = (state) => setPet(p => ({ ...p, state }))
    const resetIdle = () => { clearTimeout(idleTimer); if (document.visibilityState === 'visible') setState('idle'); idleTimer = setTimeout(() => setState('sleeping'), 180000) }
    const onActivity = () => resetIdle()
    const onReact = (event) => {
      const kind = event?.detail?.kind
      if (kind === 'post-published') { setState('reacting'); setPet(p => ({ ...p, progress: Math.min(100, p.progress + 10) })); setSuggestion('Nice work publishing! Your next quest: help someone with an answer.') }
      else if (kind === 'community-opened') { setState('reacting'); setSuggestion(event?.detail?.label ? `Curious about ${event.detail.label}? Take a look around.` : 'Explore a community and see what people are discussing.') }
      else if (kind === 'message-received') { setState('reacting'); setSuggestion('You have a new message. Open Chat when you are ready.'); }
      else return
      setTimeout(() => setState('idle'), 4200)
    }
    ;['pointerdown','keydown','scroll'].forEach(name => window.addEventListener(name, onActivity, { passive: true }))
    window.addEventListener('town-pet-event', onReact)
    resetIdle()
    moveTimer = setInterval(() => { setPet(p => p.state === 'idle' ? { ...p, state: 'moving' } : p); setTimeout(() => setPet(p => p.state === 'moving' ? { ...p, state: 'idle' } : p), 1400) }, 26000)
    return () => { clearTimeout(idleTimer); clearInterval(moveTimer); ['pointerdown','keydown','scroll'].forEach(name => window.removeEventListener(name, onActivity)); window.removeEventListener('town-pet-event', onReact) }
  }, [pet.animation])

  const saveName = async () => {
    const name = pet.name.trim().slice(0, 20) || defaultName
    setPet(p => ({ ...p, name }))
    try { localStorage.setItem(key, JSON.stringify({ ...pet, name })) } catch {}
    if (userId) {
      const { error } = await supabase.from('profiles').update({ pet_name: name }).eq('id', userId)
      if (error) { setSaved(false); setSuggestion(`Name saved on this device. To sync across devices, run the pet companion migration. (${error.message})`); return }
    }
    setSaved(true); setSuggestion(`${name} is happy with that name.`)
  }
  const careAction = (action) => {
    setPet(p => ({ ...p, state: action === 'rest' ? 'sleeping' : 'reacting', care: Math.min(5, p.care + (action === 'feed' ? 1 : 0)), progress: Math.min(100, p.progress + (action === 'play' ? 5 : 2)) }))
    setSuggestion(action === 'feed' ? 'Snack time. You can feed me again later; there is no penalty for taking a break.' : action === 'play' ? 'That was fun. Play counts toward a small cosmetic unlock.' : 'A little rest. I will be here when you return.')
  }
  if (!sprite) return null
  return <div className={`pet-companion pet-state-${pet.state}`}>
    <button type="button" className={`pet-sprite-button pet-motion-${pet.animation}`} onClick={() => { setOpen(v => !v); if (pet.state === 'sleeping') setPet(p => ({ ...p, state: 'reacting' })); }} aria-expanded={open} aria-label={`Open ${pet.name}'s companion panel`} title={`Open ${pet.name}'s panel`}>
      <img src={sprite} alt="" /><span className="pet-name-tag">{pet.name}</span>{pet.state === 'sleeping' && <span className="pet-sleep-z">z z</span>}
    </button>
    {open && <section className="pet-companion-panel" aria-label={`${pet.name} companion panel`}>
      <header><div><small>TOWN COMPANION</small><h3>{pet.name}</h3><p>{moods[pet.state] || 'Content'} · {pet.personality}</p></div><button type="button" aria-label="Close pet panel" onClick={() => setOpen(false)}>×</button></header>
      <label className="pet-name-field">Pet name<input maxLength={20} value={pet.name} onChange={e => { setPet(p => ({ ...p, name: e.target.value })); setSaved(false }} placeholder="Give your pet a name" /></label>
      <button className="button secondary pet-save-name" type="button" onClick={saveName}>Save name</button>{saved && <span className="pet-saved-note">Saved</span>}
      <label className="pet-control-label">Idle behaviour<select value={pet.animation} onChange={e => setPet(p => ({ ...p, animation: e.target.value }))}><option value="breathe">Breathe gently</option><option value="wander">Occasionally wander</option><option value="wave">Wave and bounce</option></select></label>
      <label className="pet-control-label">Personality<select value={pet.personality} onChange={e => setPet(p => ({ ...p, personality: e.target.value }))}><option value="curious">Curious</option><option value="playful">Playful</option><option value="calm">Calm</option></select></label>
      <label className="pet-control-label">Accessory<select value={pet.accessory} onChange={e => setPet(p => ({ ...p, accessory: e.target.value }))}><option value="none">No accessory</option><option value="star">Star sparkle (unlocked at 100 progress)</option></select></label>
      <div className="pet-progress"><div><span>Care</span><strong>{pet.care}/5</strong></div><progress max="100" value={pet.progress}/><small>Growth {pet.progress}% · rewards are optional</small></div>
      <div className="pet-actions"><button type="button" onClick={() => careAction('feed')}>Feed</button><button type="button" onClick={() => careAction('play')}>Play</button><button type="button" onClick={() => careAction('rest')}>Rest</button></div>
      <p className="pet-suggestion">{suggestion}</p><a className="pet-chat-link" href="#/chat" onClick={() => setOpen(false)}>Open Chat →</a>
    </section>}
  </div>
}
