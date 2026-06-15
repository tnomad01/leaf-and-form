import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from './stripe'
import { TIERS, type TierId, type Tier, getTierStripeIds } from './tiers'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (no I,O,0,1)

export interface GiftCardRow {
  id: string
  code: string
  tier: TierId
  price_pence: number
  sender_name: string
  sender_email: string
  recipient_name: string
  recipient_email: string
  message: string | null
  stripe_session_id: string
  stripe_coupon_id: string | null
  stripe_promotion_code_id: string | null
  status: 'pending' | 'active' | 'redeemed' | 'refunded'
  purchased_at: string
  delivered_at: string | null
  redeemed_at: string | null
  redeemed_submission_id: string | null
}

export async function generateUniqueGiftCardCode(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `LF-${randomBlock(4)}-${randomBlock(4)}`
    const { data } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('code', code)
      .maybeSingle()
    if (!data) return code
  }
  throw new Error('Could not generate a unique gift card code after 6 attempts.')
}

function randomBlock(length: number): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return out
}

export async function issueStripeGiftCardCoupon(
  supabase: SupabaseClient,
  giftCard: GiftCardRow
): Promise<{ couponId: string; promotionCodeId: string }> {
  const tier: Tier = TIERS[giftCard.tier]
  const tierIds = getTierStripeIds(tier)
  const stripe = getStripe()

  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: 'once',
    max_redemptions: 1,
    name: `Leaf & Form gift card (${tier.priceLabel})`,
    applies_to: { products: [tierIds.productId] },
    metadata: { gift_card_id: giftCard.id, tier: tier.id },
  })

  const promo = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: coupon.id },
    code: giftCard.code,
    max_redemptions: 1,
    metadata: { gift_card_id: giftCard.id, tier: tier.id },
  })

  const { error } = await supabase
    .from('gift_cards')
    .update({
      stripe_coupon_id: coupon.id,
      stripe_promotion_code_id: promo.id,
      status: 'active',
      delivered_at: new Date().toISOString(),
    })
    .eq('id', giftCard.id)

  if (error) {
    throw new Error(`Failed to update gift_cards after coupon creation: ${error.message}`)
  }

  return { couponId: coupon.id, promotionCodeId: promo.id }
}

export async function markGiftCardRedeemed(
  supabase: SupabaseClient,
  promotionCodeId: string,
  submissionId: string
): Promise<GiftCardRow | null> {
  const { data, error } = await supabase
    .from('gift_cards')
    .update({
      status: 'redeemed',
      redeemed_at: new Date().toISOString(),
      redeemed_submission_id: submissionId,
    })
    .eq('stripe_promotion_code_id', promotionCodeId)
    .eq('status', 'active')
    .select()
    .maybeSingle()

  if (error) {
    console.error('markGiftCardRedeemed error:', error)
    return null
  }
  return data as GiftCardRow | null
}
