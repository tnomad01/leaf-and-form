import type Stripe from 'stripe'
import { getStripe } from './stripe'
import { getTierStripeIds, type Tier } from './tiers'

export type PromoValidation =
  | {
      valid: true
      promotionCodeId: string
      code: string
      discountPence: number
      newTotalPence: number
      label: string
    }
  | {
      valid: false
      error: string
    }

export async function validatePromoCode(rawCode: string, tier: Tier): Promise<PromoValidation> {
  const code = rawCode.trim()
  if (!code) return { valid: false, error: 'Enter a code.' }

  const stripe = getStripe()
  const list = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ['data.promotion.coupon'],
  })

  const promo = list.data[0]
  if (!promo) return { valid: false, error: 'Code not recognised.' }
  return validatePromo(promo, tier)
}

export async function validatePromoCodeById(id: string, tier: Tier): Promise<PromoValidation> {
  if (!id) return { valid: false, error: 'Missing promo code id.' }
  const stripe = getStripe()
  let promo: Stripe.PromotionCode
  try {
    promo = await stripe.promotionCodes.retrieve(id, { expand: ['promotion.coupon'] })
  } catch {
    return { valid: false, error: 'Code not recognised.' }
  }
  if (!promo.active) return { valid: false, error: 'This code is no longer active.' }
  return validatePromo(promo, tier)
}

function validatePromo(promo: Stripe.PromotionCode, tier: Tier): PromoValidation {
  if (promo.max_redemptions && promo.times_redeemed >= promo.max_redemptions) {
    return { valid: false, error: 'This code has already been used.' }
  }

  if (promo.expires_at && promo.expires_at * 1000 < Date.now()) {
    return { valid: false, error: 'This code has expired.' }
  }

  const couponRef = promo.promotion?.coupon
  const coupon = typeof couponRef === 'object' && couponRef !== null ? couponRef : null
  if (!coupon || !coupon.valid) {
    return { valid: false, error: 'This code is no longer valid.' }
  }

  const restrictedProducts = coupon.applies_to?.products
  if (restrictedProducts && restrictedProducts.length > 0) {
    const tierProductId = getTierStripeIds(tier).productId
    if (!restrictedProducts.includes(tierProductId)) {
      return { valid: false, error: 'Not valid for the selected plan.' }
    }
  }

  const minAmount = promo.restrictions?.minimum_amount
  const minCurrency = promo.restrictions?.minimum_amount_currency
  if (minAmount != null && minCurrency === 'gbp' && tier.pricePence < minAmount) {
    return { valid: false, error: 'Order total too low for this code.' }
  }

  const discountPence = computeDiscount(coupon, tier.pricePence)
  if (discountPence <= 0) {
    return { valid: false, error: 'This code does not apply to this plan.' }
  }

  const newTotalPence = Math.max(0, tier.pricePence - discountPence)
  const label = buildLabel(coupon, discountPence)

  return {
    valid: true,
    promotionCodeId: promo.id,
    code: promo.code,
    discountPence,
    newTotalPence,
    label,
  }
}

function computeDiscount(coupon: Stripe.Coupon, tierPence: number): number {
  if (coupon.percent_off != null) {
    return Math.round((tierPence * coupon.percent_off) / 100)
  }
  if (coupon.amount_off != null) {
    if (coupon.currency && coupon.currency !== 'gbp') return 0
    return Math.min(coupon.amount_off, tierPence)
  }
  return 0
}

function buildLabel(coupon: Stripe.Coupon, discountPence: number): string {
  if (coupon.percent_off != null) {
    return `${coupon.percent_off}% off (−£${(discountPence / 100).toFixed(2)})`
  }
  return `£${(discountPence / 100).toFixed(2)} off`
}
