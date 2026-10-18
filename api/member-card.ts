import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase, getAuthenticatedUser, signClaims } from './_lib/member-card'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const user = await getAuthenticatedUser(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Authentication required' })

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, username, display_name, bio, interests, avatar_id, accent_color, created_at, reputation_score')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Member card profile lookup failed:', profileError.message)
      return res.status(500).json({ error: 'Could not load profile' })
    }
    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    const createdAt = new Date(profile.created_at)
    if (Number.isNaN(createdAt.getTime())) return res.status(500).json({ error: 'Invalid profile creation date' })
    const now = new Date()
    const daysJoined = Math.max(0, Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate())) / 86400000))
    const tier = daysJoined <= 7 ? 'standard' : daysJoined <= 30 ? 'red' : 'gold'

    const claims = {
      version: 1,
      userId: user.id,
      username: profile.username,
      displayName: profile.display_name || profile.username,
      bio: profile.bio || '',
      interests: profile.interests || '',
      avatarId: profile.avatar_id || 'avatar-01',
      accentColor: profile.accent_color || '#39ff14',
      reputation: profile.reputation_score,
      createdAt: profile.created_at,
      daysJoined,
      tier,
    }
    const signature = signClaims(claims)
    const { data: issuance, error: insertError } = await adminSupabase
      .from('member_card_issuances')
      .insert({ user_id: user.id, claims, signature })
      .select('id, issued_at')
      .single()

    if (insertError || !issuance) {
      console.error('Member card issuance failed:', insertError?.message || 'No issuance returned')
      return res.status(500).json({ error: 'Could not issue member card' })
    }
    return res.status(201).json({ issuanceId: issuance.id, issuedAt: issuance.issued_at, tier })
  } catch (error) {
    console.error('Member card endpoint failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'Internal server error' })
  }
}
