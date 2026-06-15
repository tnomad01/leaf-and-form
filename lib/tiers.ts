export type TierId = 'blueprint' | 'photo' | 'full'

export interface Tier {
  id: TierId
  label: string
  shortLabel: string
  pricePence: number
  priceLabel: string
  stripeProductName: string
  stripeProductDescription: string
  tagline: string
  bullets: string[]
  deliverables: {
    blueprint: boolean
    photo: boolean
    plantList: boolean
  }
}

export const TIERS: Record<TierId, Tier> = {
  blueprint: {
    id: 'blueprint',
    label: 'Blueprint',
    shortLabel: 'Blueprint',
    pricePence: 1000,
    priceLabel: '£10',
    stripeProductName: 'Garden Blueprint',
    stripeProductDescription: 'Top-down planting layout sketch — Leaf & Form',
    tagline: 'A schematic layout to start your project.',
    bullets: ['Top-down planting layout sketch'],
    deliverables: { blueprint: true, photo: false, plantList: false },
  },
  photo: {
    id: 'photo',
    label: 'Blueprint + Photo',
    shortLabel: '+ Photo',
    pricePence: 2500,
    priceLabel: '£25',
    stripeProductName: 'Garden Blueprint + Photo',
    stripeProductDescription: 'Layout sketch + photorealistic visualisation — Leaf & Form',
    tagline: 'See exactly how your bed will look in bloom.',
    bullets: [
      'Top-down planting layout sketch',
      'Photorealistic visualisation of the finished bed',
    ],
    deliverables: { blueprint: true, photo: true, plantList: false },
  },
  full: {
    id: 'full',
    label: 'Full Plan',
    shortLabel: 'Full Plan',
    pricePence: 7500,
    priceLabel: '£75',
    stripeProductName: 'Garden Full Plan',
    stripeProductDescription: 'Sketch + photo + complete planting guide — Leaf & Form',
    tagline: 'Everything you need to plant with confidence.',
    bullets: [
      'Top-down planting layout sketch',
      'Photorealistic visualisation of the finished bed',
      'Plant list, how-to-plant steps, seasonal care & local conditions',
    ],
    deliverables: { blueprint: true, photo: true, plantList: true },
  },
}

export const TIER_ORDER: TierId[] = ['blueprint', 'photo', 'full']

export const DEFAULT_TIER: TierId = 'photo'

export function getTier(id: string | null | undefined): Tier | null {
  if (!id) return null
  return (TIERS as Record<string, Tier>)[id] ?? null
}

export interface TierStripeIds {
  productId: string
  priceId: string
}

export function getTierStripeIds(tier: Tier): TierStripeIds {
  const key = tier.id.toUpperCase()
  const productId = process.env[`STRIPE_PRODUCT_${key}_ID`]
  const priceId = process.env[`STRIPE_PRICE_${key}_ID`]
  if (!productId || !priceId) {
    throw new Error(
      `Stripe IDs for tier "${tier.id}" are not configured. Run \`npm run stripe:sync\` and paste the output into your environment.`
    )
  }
  return { productId, priceId }
}

export interface GiftCardStripeIds {
  productId: string
  priceId: string
}

export function getGiftCardStripeIds(tier: Tier): GiftCardStripeIds {
  const key = tier.id.toUpperCase()
  const productId = process.env[`STRIPE_PRODUCT_GIFT_${key}_ID`]
  const priceId = process.env[`STRIPE_PRICE_GIFT_${key}_ID`]
  if (!productId || !priceId) {
    throw new Error(
      `Stripe gift card IDs for tier "${tier.id}" are not configured. Run \`npm run stripe:sync\` and paste the output into your environment.`
    )
  }
  return { productId, priceId }
}
