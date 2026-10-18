import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const safeText = (value, fallback = '') =>
  String(value || fallback).replace(/\s+/g, ' ').trim()

export function ShareProfileCard({ userId, profile = {}, daysJoined }) {
  const [reputation, setReputation] = useState(0)
  const [style, setStyle] = useState('gold')
  const [status, setStatus] = useState('')
  const [community, setCommunity] = useState(
    profile.most_active_community || profile.primary_community || ''
  )
  const [bio, setBio] = useState(profile.bio || '')
  const [showPet, setShowPet] = useState(true)
  const [showAvatar, setShowAvatar] = useState(true)

  useEffect(() => {
    let active = true

    if (userId && supabase) {
      supabase
        .from('profiles')
        .select('reputation_score')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (active) setReputation(data?.reputation_score || 0)
        })
        .catch(() => {})
    }

    return () => {
      active = false
    }
  }, [userId])

  const petName = (() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(`town-pet-companion:${userId}`) || '{}'
      )
      return safeText(saved.name || profile.pet_name, 'Pixel')
    } catch {
      return safeText(profile.pet_name, 'Pixel')
    }
  })()

  const username = safeText(profile.username, 'username')
  const displayName = safeText(
    profile.display_name || profile.username,
    'Town member'
  )
  const avatar =
    profile.avatar_url ||
    profile.avatarUrl ||
    profile.avatar ||
    profile.profile_picture_url ||
    ''

  const isGold = style === 'gold'

  const colors = isGold
    ? {
        bg: '#ffdf55',
        ink: '#17100a',
        accent: '#b98922',
        line: '#5c4219',
        soft: '#fff0a2',
      }
    : style === 'neon'
      ? {
          bg: '#050505',
          ink: '#f7f3fa',
          accent: '#39ff14',
          line: '#ff4fba',
          soft: '#17121c',
        }
      : {
          bg: '#f5f1e8',
          ink: '#171717',
          accent: '#5a4a75',
          line: '#b9b1c6',
          soft: '#ffffff',
        }

  const roundedRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  const download = async () => {
    setStatus('Preparing your card…')

    const canvas = document.createElement('canvas')
    canvas.width = 1000
    canvas.height = 1400

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      setStatus('Could not create the card in this browser.')
      return
    }

    const c = colors

    ctx.fillStyle = c.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Gold-paper frame texture.
    if (isGold) {
      ctx.fillStyle = '#c69a36'

      for (let i = 0; i < 15000; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height

        ctx.globalAlpha = Math.random() * 0.18
        ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3)
      }

      ctx.globalAlpha = 1
      ctx.fillStyle = c.bg
      ctx.fillRect(24, 24, 952, 1352)
    }

    ctx.strokeStyle = c.accent
    ctx.lineWidth = 3
    ctx.strokeRect(28, 28, 944, 1344)

    ctx.strokeStyle = c.line
    ctx.lineWidth = 2
    ctx.strokeRect(44, 44, 912, 1312)

    // Profile photo.
    ctx.fillStyle = c.soft
    ctx.strokeStyle = c.line
    ctx.lineWidth = 3

    ctx.beginPath()
    ctx.arc(205, 205, 125, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    if (showAvatar && avatar) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = avatar
        })

        ctx.save()
        ctx.beginPath()
        ctx.arc(205, 205, 118, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(img, 87, 87, 236, 236)
        ctx.restore()
      } catch {
        drawInitials(ctx, displayName, c)
      }
    } else {
      drawInitials(ctx, displayName, c)
    }

    // Bio panel.
    ctx.fillStyle = c.soft
    ctx.strokeStyle = c.line
    ctx.lineWidth = 3

    roundedRect(ctx, 420, 100, 490, 145, 5)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = c.ink
    ctx.font = 'bold 25px monospace'
    ctx.fillText('BIO', 445, 135)

    ctx.font = '23px sans-serif'

    wrapText(
      ctx,
      safeText(bio, 'A little about me…'),
      445,
      176,
      440,
      30,
      3
    )

    // Member name and username.
    ctx.fillStyle = c.ink
    ctx.font = 'bold 38px monospace'
    ctx.fillText(displayName.slice(0, 28), 82, 400)

    ctx.font = '25px monospace'
    ctx.fillText(`@${username}`.slice(0, 35), 82, 445)

    // Member statistics.
    const labelY = 530
    const valueY = 650
    const colX = [80, 365, 650]
    const colW = 270

    const labels = ['DAYS JOINED', 'REPUTATION', 'CURRENT PET']
    const values = [
      String(daysJoined ?? '—'),
      String(reputation),
      petName,
    ]

    // Use a regular loop so await is valid inside the async download function.
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]

      ctx.fillStyle = c.soft
      ctx.strokeStyle = c.line
      ctx.lineWidth = 3

      roundedRect(ctx, colX[i], labelY, colW, 62, 4)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = c.ink
      ctx.font = 'bold 20px monospace'

      centerText(
        ctx,
        label,
        colX[i] + colW / 2,
        labelY + 38
      )

      roundedRect(ctx, colX[i], valueY, colW, 100, 4)
      ctx.fill()
      ctx.stroke()

      ctx.font = 'bold 32px monospace'

      centerText(
        ctx,
        values[i].slice(0, 18),
        colX[i] + colW / 2,
        valueY + 58
      )

      // Draw the selected pet sprite in the current-pet column.
      if (
        i === 2 &&
        showPet &&
        profile.pet_id &&
        profile.pet_id !== 'none'
      ) {
        try {
          const sprite = new Image()

          await new Promise((resolve) => {
            sprite.onload = resolve
            sprite.onerror = resolve
            sprite.src = `/pets/${profile.pet_id}.svg`
          })

          if (sprite.complete && sprite.naturalWidth) {
            ctx.imageSmoothingEnabled = false

            ctx.drawImage(
              sprite,
              colX[i] + 92,
              valueY + 65,
              86,
              86
            )
          }
        } catch {}
      }
    }

    // Most-active community section.
    ctx.strokeStyle = c.line
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(80, 825)
    ctx.lineTo(920, 825)
    ctx.stroke()

    ctx.fillStyle = c.ink
    ctx.font = 'bold 22px monospace'
    ctx.fillText('MOST ACTIVE IN:', 82, 885)

    ctx.fillStyle = c.soft
    ctx.strokeStyle = c.line

    roundedRect(ctx, 360, 846, 560, 64, 4)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = c.ink
    ctx.font = '24px sans-serif'

    centerText(
      ctx,
      safeText(community, 'Choose your community'),
      640,
      886
    )

    // Footer.
    ctx.fillStyle = c.ink
    ctx.font = 'bold 24px monospace'
    ctx.fillText('TOWN MEMBER CARD', 82, 1240)

    ctx.font = '18px monospace'
    ctx.fillText('Share your interests. Find your people.', 82, 1280)

    function drawInitials(context, name, palette) {
  context.fillStyle = palette.accent
  context.font = 'bold 84px monospace'
  centerText(
    context,
    safeText(name, 'T').slice(0, 1).toUpperCase(),
    205,
    235
  )
}
    function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
      const words = text.split(' ')
      let line = ''
      let count = 0

      for (const word of words) {
        const test = line ? `${line} ${word}` : word

        if (context.measureText(test).width > maxWidth && line) {
          context.fillText(line, x, y)
          y += lineHeight
          count++
          line = word

          if (count >= maxLines - 1) break
        } else {
          line = test
        }
      }

      if (line) context.fillText(line.slice(0, 55), x, y)
    }

    function centerText(context, text, x, y) {
      context.textAlign = 'center'
      context.fillText(text, x, y)
      context.textAlign = 'left'
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus('Card export failed.')
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `town-profile-card-${username}.png`
      a.click()

      setTimeout(() => URL.revokeObjectURL(url), 1500)
      setStatus('Profile card downloaded as PNG. You can share it anywhere.')
    }, 'image/png')
  }

  return (
    <fieldset className="profile-editor-section share-card-builder">
      <legend>Download your profile card</legend>

      <p className="widget-help">
        Create a downloadable card with your profile photo, bio, username,
        days joined, reputation, pet and most-active community. Change the
        fields before exporting; the card is generated in your browser.
      </p>

      <div className={`town-share-card town-share-card-${style}`}>
        <div className="town-share-card-inner">
          <div className="town-share-card-top">
            <div className="town-share-avatar">
              {showAvatar && avatar ? (
                <img src={avatar} alt="" />
              ) : (
                <span>{displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>

            <div className="town-share-bio">
              <strong>Bio</strong>
              <p>{bio || 'A little about me…'}</p>
            </div>
          </div>

          <strong className="town-share-display-name">{displayName}</strong>
          <span className="town-share-username">@{username}</span>

          <div className="town-share-labels">
            <span>Days joined</span>
            <span>Reputation</span>
            <span>Current pet name</span>
          </div>

          <div className="town-share-values">
            <strong>{daysJoined ?? '—'}</strong>
            <strong>{reputation}</strong>
            <strong>{petName}</strong>
          </div>

          <div className="town-share-active">
            <span>Most active in:</span>
            <strong>{community || 'Your community'}</strong>
          </div>

          {showPet && (
            <div className="town-share-pet">
              {profile.pet_id && profile.pet_id !== 'none' ? (
                <img src={`/pets/${profile.pet_id}.svg`} alt="" />
              ) : (
                <span>No pet selected</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="share-card-actions">
        <label>
          Card design
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="gold">Gold &amp; yellow (example)</option>
            <option value="neon">Town neon</option>
            <option value="paper">Light print</option>
          </select>
        </label>

        <label>
          Most active in
          <input
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            placeholder="Community name"
          />
        </label>

        <label>
          Bio on card
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            maxLength={180}
          />
        </label>

        <label className="share-card-check">
          <input
            type="checkbox"
            checked={showAvatar}
            onChange={(e) => setShowAvatar(e.target.checked)}
          />
          Include profile photo
        </label>

        <label className="share-card-check">
          <input
            type="checkbox"
            checked={showPet}
            onChange={(e) => setShowPet(e.target.checked)}
          />
          Include pet
        </label>

        <button type="button" className="button primary" onClick={download}>
          Download PNG card
        </button>
      </div>

      {status && (
        <p role="status" className="widget-help">
          {status}
        </p>
      )}
    </fieldset>
  )
}