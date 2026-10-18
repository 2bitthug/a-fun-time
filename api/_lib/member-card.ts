import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const cardSecret = process.env.TOWN_CARD_HMAC_SECRET

if (!supabaseUrl || !serviceRoleKey || !cardSecret) {
  throw new Error('Member card server environment variables are missing.')
}

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export function signClaims(claims: Record<string, unknown>): string {
  return createHmac('sha256', cardSecret!).update(JSON.stringify(claims)).digest('hex')
}

export function verifyClaims(claims: Record<string, unknown>, signature: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = Buffer.from(signClaims(claims), 'hex')
  const supplied = Buffer.from(signature, 'hex')
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}

export async function getAuthenticatedUser(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  if (!token) return null
  const { data, error } = await adminSupabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}
