const AVATAR_NUMBERS = [...Array.from({ length: 11 }, (_, index) => index + 1), ...Array.from({ length: 9 }, (_, index) => index + 13)]

export const PROFILE_AVATARS = AVATAR_NUMBERS.map(number => {
  const id = `avatar-${String(number).padStart(2, '0')}`
  return [id, `Avatar ${String(number).padStart(2, '0')}`]
})

export const DEFAULT_AVATAR_ID = 'avatar-01'

export function avatarUrl(avatarId) {
  const valid = PROFILE_AVATARS.some(([id]) => id === avatarId)
  return `/avatars/${valid ? avatarId : DEFAULT_AVATAR_ID}.jpg`
}
