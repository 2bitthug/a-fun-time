import React, { useMemo, useState } from 'react'

const checks = [
  ['Build', 'Run a clean production build with the production environment variables.'],
  ['Database', 'Run the latest Supabase migrations and confirm existing communities, posts, comments, and moderation data remain intact.'],
  ['Authentication', 'Verify registration, email confirmation, login, logout, and session persistence.'],
  ['Safety', 'Verify reports, moderator actions, community ownership, and access controls.'],
  ['Content', 'Confirm public pages contain Town branding and no prototype-only copy.'],
  ['Recovery', 'Confirm the production project has a rollback path and a known-good deployment.']
]

export function PublicLaunchPage() {
  const [done, setDone] = useState(() => JSON.parse(localStorage.getItem('town-launch-checks') || '{}'))
  const completed = useMemo(() => checks.filter(([key]) => done[key]).length, [done])
  const toggle = key => { const next = { ...done, [key]: !done[key] }; setDone(next); localStorage.setItem('town-launch-checks', JSON.stringify(next)) }
  return <section className="town-page">
    <div className="town-page-heading"><div><p className="eyebrow">PUBLIC LAUNCH</p><h1>Ready to open the town.</h1></div><span className="launch-badge">PRODUCTION CHECKLIST</span></div>
    <div className="launch-hero"><div><p className="town-kicker">FIND, DON'T FOLLOW</p><h2>Town is designed for deliberate discovery.</h2><p>Communities, discussions, transparent sorting, and contribution recognition. The platform does not decide what deserves your attention through a hidden recommendation score.</p><div className="town-hero-actions"><a className="button primary" href="#/communities">Browse the town</a><a className="button secondary" href="#/help">Read how it works</a></div></div><div className="launch-summary"><strong>{completed}/{checks.length}</strong><span>launch checks complete</span><small>{completed === checks.length ? 'Ready for the final deployment decision.' : 'Complete the operational checks before opening publicly.'}</small></div></div>
    <section className="launch-checklist"><h2>Production checklist</h2><div className="launch-check-list">{checks.map(([key, description]) => <label className={`launch-check ${done[key] ? 'done' : ''}`} key={key}><input type="checkbox" checked={Boolean(done[key])} onChange={() => toggle(key)} /><span><strong>{key}</strong><small>{description}</small></span></label>)}</div></section>
    <div className="launch-notice"><strong>Launch rule</strong><p>Do not treat this checklist as a substitute for backups, deployment rollback, or a security review. Public launch should happen only after those operational controls are confirmed.</p></div>
  </section>
}
