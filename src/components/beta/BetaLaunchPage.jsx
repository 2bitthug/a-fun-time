import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Frame({ title, eyebrow = 'TOWN', children }) {
  return <section className="town-page"><div className="town-page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div></div>{children}</section>
}

const checks = [
  ['Account', 'Sign in, sign out, and confirm your profile loads correctly.'],
  ['Discovery', 'Browse communities, search, and try each feed sorting option.'],
  ['Contribution', 'Create a post, vote, save it, and participate in discussion.'],
  ['Community', 'Join a community and check its topics, members, and rules.'],
  ['Safety', 'Check reporting, moderation, and community management behaviour.'],
  ['Feedback', 'Report anything confusing or broken through Beta feedback.']
]

export function BetaLaunchPage({ currentUserId }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checksDone, setChecksDone] = useState(() => JSON.parse(localStorage.getItem('town-beta-checks') || '{}'))

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!currentUserId) return setLoading(false)
      const { data } = await supabase.from('beta_testers').select('status,invited_at,joined_at,completed_at').eq('user_id', currentUserId).maybeSingle()
      if (alive) { setStatus(data); setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [currentUserId])

  const toggle = (key) => {
    const next = { ...checksDone, [key]: !checksDone[key] }
    setChecksDone(next)
    localStorage.setItem('town-beta-checks', JSON.stringify(next))
  }

  const completed = checks.filter(([key]) => checksDone[key]).length

  return <Frame title="Beta launch" eyebrow="CONTROLLED TESTING">
    <div className="beta-launch-status">
      <div><span className="eyebrow">YOUR BETA STATUS</span><strong>{loading ? 'Checking…' : (status?.status || 'Not enrolled')}</strong></div>
      <span className="beta-progress">{completed}/{checks.length} checks completed</span>
    </div>

    <div className="beta-intro">
      <strong>Test the town deliberately.</strong>
      <p>The private beta is for finding broken flows, confusing interactions, missing information, and moderation problems before public launch. Completing the checklist does not mean a feature is considered production-ready.</p>
    </div>

    <section className="beta-checklist">
      <h2>Beta test checklist</h2>
      <div className="beta-check-list">
        {checks.map(([key, description]) => <label className={`beta-check ${checksDone[key] ? 'done' : ''}`} key={key}>
          <input type="checkbox" checked={Boolean(checksDone[key])} onChange={() => toggle(key)} />
          <span><strong>{key}</strong><small>{description}</small></span>
        </label>)}
      </div>
    </section>

    <div className="actions beta-launch-actions">
      <a className="button primary" href="#/beta-feedback">Report beta feedback</a>
      <a className="button secondary" href="#/communities">Browse communities</a>
    </div>
  </Frame>
}
