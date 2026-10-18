import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminSupabase, verifyClaims } from './_lib/member-card'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid card ID' })
  }
  try {
    const { data: issuance, error } = await adminSupabase
      .from('member_card_issuances')
      .select('id, claims, signature, issued_at, revoked_at')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      console.error('Card verification lookup failed:', error.message)
      return res.status(500).json({ error: 'Verification unavailable' })
    }
    if (!issuance) return res.status(404).json({ status: 'invalid', message: 'Card issuance not found.' })
    if (issuance.revoked_at) return res.status(200).json({ status: 'revoked', message: 'This card issuance has been revoked.' })
    if (!issuance.claims || typeof issuance.claims !== 'object' || Array.isArray(issuance.claims) || !verifyClaims(issuance.claims, issuance.signature)) {
      return res.status(200).json({ status: 'invalid', message: 'The stored card signature is invalid.' })
    }
    return res.status(200).json({ status: 'authentic', message: 'The signed card issuance is authentic.', card: { id: issuance.id, issuedAt: issuance.issued_at, claims: issuance.claims } })
  } catch (error) {
    console.error('Card verification failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'Verification unavailable' })
  }
}
