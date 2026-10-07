import React from 'react'

const FRAME_CLASSES = {
  none: '',
  neon: 'cosmetic-frame-neon',
  scanline: 'cosmetic-frame-scanline',
  grid: 'cosmetic-frame-grid',
  crt: 'cosmetic-frame-crt',
  explorer: 'cosmetic-frame-explorer'
}

export default function CosmeticAvatarFrame({
  avatar,
  frame = 'none',
  badge = null,
  accent = '#39ff14',
  size = 72,
  alt = 'Profile avatar'
}) {
  const frameClass = FRAME_CLASSES[frame] || ''

  return (
    <div
      className={`cosmetic-avatar ${frameClass}`}
      style={{
        '--avatar-accent': accent,
        '--avatar-size': `${size}px`
      }}
    >
      <div className="cosmetic-avatar-image">
        <img
          src={avatar}
          alt={alt}
        />
      </div>

      {badge && (
        <span
          className="cosmetic-avatar-badge"
          title={badge.label}
          aria-label={badge.label}
        >
          {badge.icon}
        </span>
      )}
    </div>
  )
}