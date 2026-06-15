import { getTier } from '@/lib/tiers'
import { validatePromoCode } from '@/lib/stripe-promo'

export async function POST(request: Request) {
  let payload: { code?: string; tier?: string }
  try {
    payload = await request.json()
  } catch {
    return Response.json({ valid: false, error: 'Invalid request.' }, { status: 400 })
  }

  const tier = getTier(payload.tier)
  if (!tier) {
    return Response.json({ valid: false, error: 'Choose a plan first.' }, { status: 400 })
  }

  const code = (payload.code ?? '').trim()
  if (!code) {
    return Response.json({ valid: false, error: 'Enter a code.' }, { status: 400 })
  }

  try {
    const result = await validatePromoCode(code, tier)
    return Response.json(result)
  } catch (err) {
    console.error('validate-promo error:', err)
    return Response.json(
      { valid: false, error: 'Unable to check that code right now.' },
      { status: 500 }
    )
  }
}
