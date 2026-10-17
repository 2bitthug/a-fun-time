import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Frame({ title, eyebrow = 'TOWN', children }) {
  return <section className="town-page"><div className="town-page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div></div>{children}</section>
}

export function BetaFeedbackPage({ currentUserId }) {
  const [type, setType] = useState('bug')
  const [severity, setSeverity] = useState('normal')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState([])

  const loadRecent = async () => {
    if (!currentUserId) return
    const { data } = await supabase.from('beta_feedback').select('id,type,severity,title,status,created_at').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(8)
    setRecent(data || [])
  }

  useEffect(() => { loadRecent() }, [currentUserId])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const cleanTitle = title.trim()
    const cleanDetails = details.trim()
    if (!cleanTitle || !cleanDetails) return setError('Add a short title and enough detail to reproduce or understand the issue.')
    setBusy(true)
    const { error: e } = await supabase.from('beta_feedback').insert({
      user_id: currentUserId,
      type,
      severity,
      title: cleanTitle,
      details: cleanDetails,
      page_path: window.location.hash || '#/beta-feedback'
    })
    setBusy(false)
    if (e) return setError(e.message || 'Could not submit feedback.')
    setTitle('')
    setDetails('')
    setMessage('Feedback submitted. Thank you for testing the town.')
    loadRecent()
  }

  return <Frame title="Beta feedback" eyebrow="CONTROLLED TESTING">
    <div className="beta-intro">
      <strong>This is a beta.</strong>
      <p>Use this page to report bugs, confusing behaviour, or useful improvements. Specific steps and examples are more useful than general comments.</p>
    </div>
    <form className="beta-feedback-form" onSubmit={submit}>
      <div className="beta-form-grid">
        <label>Type<select value={type} onChange={e => setType(e.target.value)}><option value="bug">Bug</option><option value="usability">Usability problem</option><option value="suggestion">Suggestion</option><option value="content">Content issue</option></select></label>
        <label>Severity<select value={severity} onChange={e => setSeverity(e.target.value)}><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="blocking">Blocking</option></select></label>
      </div>
      <label>Short title<input maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="What happened?" /></label>
      <label>Details<textarea maxLength={4000} value={details} onChange={e => setDetails(e.target.value)} placeholder="What were you trying to do? What happened? What did you expect?" /></label>
      <p className="beta-context">Current page: <code>{window.location.hash || '#/beta-feedback'}</code></p>
      {error && <p className="town-error" role="alert">{error}</p>}
      {message && <p className="beta-success" role="status">{message}</p>}
      <button className="button primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit feedback'}</button>
    </form>

    {recent.length > 0 && <section className="beta-history">
      <h2>Your recent reports</h2>
      <div className="beta-report-list">{recent.map(item => <article className="beta-report" key={item.id}><div><span>{item.type} · {item.severity}</span><strong>{item.title}</strong></div><em>{item.status}</em></article>)}</div>
    </section>}
  </Frame>
}

export function LegalPage({ kind }) {
  const content = {
    terms: {
      title: 'Terms',
      eyebrow: 'PLATFORM RULES',
      sections: [
        ['Use of the town', 'Use communities, posts, comments, voting, and messaging lawfully and in a way that does not deliberately disrupt other users.'],
        ['Content', 'You are responsible for content you submit. Do not post material you do not have the right to publish, or content intended to harass, deceive, or facilitate abuse.'],
        ['Moderation', 'Community owners and moderators may remove content or restrict participation under published community rules. Platform administrators may act on serious or repeated violations.'],
        ['Beta status', 'During beta testing, features may change, be disabled, or be reset as the platform is evaluated.']
      ]
    },
    privacy: {
      title: 'Privacy',
      eyebrow: 'DATA PRACTICES',
      sections: [
        ['Account data', 'The platform stores account and profile information required to operate accounts, communities, posts, discussions, moderation, and recognition features.'],
        ['User content', 'Posts, comments, votes, saves, community memberships, and moderation records are stored as part of operating the platform.'],
        ['Visibility', 'Public community content and public profiles may be visible to other users. Private account information is not intentionally exposed through public profile views.'],
        ['Beta feedback', 'Feedback submitted through the beta form is associated with the submitting account so reports can be followed up and deduplicated.']
      ]
    },
    accessibility: {
      title: 'Accessibility',
      eyebrow: 'ACCESSIBILITY',
      sections: [
        ['Keyboard use', 'Controls are implemented using standard buttons, links, inputs, and form elements wherever possible.'],
        ['Readable structure', 'Pages use headings, labels, status messages, and semantic controls to support assistive technologies.'],
        ['Visual design', 'The interface uses a high-contrast dark presentation. Some decorative effects may be reduced in future releases as accessibility testing continues.'],
        ['Report a problem', 'If a control, page, or interaction creates an accessibility barrier, report it through Beta feedback and select Usability problem.']
      ]
    }
  }[kind]
  return <Frame title={content.title} eyebrow={content.eyebrow}><div className="legal-page">{content.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}</div><p className="beta-context">These pages describe the current beta product and are not a substitute for a final production legal review.</p></Frame>
}
