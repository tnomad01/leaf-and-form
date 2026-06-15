import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import Stripe from 'stripe'
import { TIERS, TIER_ORDER, type Tier } from '../lib/tiers'

main().catch((err) => {
  console.error('\n✗ stripe:sync failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})

async function main() {
  loadEnvLocal()

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    console.error('✗ STRIPE_SECRET_KEY not set. Add it to .env.local (test mode) or export it before running.')
    process.exit(1)
  }

  const stripe = new Stripe(secret, { apiVersion: '2026-04-22.dahlia' })
  const mode = /_live_/.test(secret) ? 'LIVE' : 'test'

  console.log(`Syncing Leaf & Form products to Stripe (${mode} mode)…\n`)

  const designOutputs: Array<{ tier: Tier; productId: string; priceId: string }> = []
  const giftOutputs: Array<{ tier: Tier; productId: string; priceId: string }> = []

  console.log('Design tiers:')
  for (const id of TIER_ORDER) {
    const tier = TIERS[id]
    process.stdout.write(`  ${tier.label.padEnd(26)} `)
    const productId = await upsertProduct(stripe, tier)
    const priceId = await upsertPrice(stripe, tier, productId)
    designOutputs.push({ tier, productId, priceId })
    console.log(`✓ product=${productId} price=${priceId}`)
  }

  console.log('\nGift card denominations:')
  for (const id of TIER_ORDER) {
    const tier = TIERS[id]
    const label = `${tier.priceLabel} Gift Card`.padEnd(26)
    process.stdout.write(`  ${label} `)
    const productId = await upsertGiftProduct(stripe, tier)
    const priceId = await upsertGiftPrice(stripe, tier, productId)
    giftOutputs.push({ tier, productId, priceId })
    console.log(`✓ product=${productId} price=${priceId}`)
  }

  console.log('\nDone. Paste the following into .env.local (or Vercel env for production):\n')
  console.log('---')
  for (const { tier, productId, priceId } of designOutputs) {
    const key = tier.id.toUpperCase()
    console.log(`STRIPE_PRODUCT_${key}_ID=${productId}`)
    console.log(`STRIPE_PRICE_${key}_ID=${priceId}`)
  }
  for (const { tier, productId, priceId } of giftOutputs) {
    const key = tier.id.toUpperCase()
    console.log(`STRIPE_PRODUCT_GIFT_${key}_ID=${productId}`)
    console.log(`STRIPE_PRICE_GIFT_${key}_ID=${priceId}`)
  }
  console.log('---\n')
}

async function upsertProduct(stripe: Stripe, tier: Tier): Promise<string> {
  const search = await stripe.products.search({
    query: `metadata['tier']:'${tier.id}' AND active:'true'`,
    limit: 1,
  })

  const existing = search.data[0]
  if (existing) {
    const needsUpdate =
      existing.name !== tier.stripeProductName ||
      existing.description !== tier.stripeProductDescription
    if (needsUpdate) {
      await stripe.products.update(existing.id, {
        name: tier.stripeProductName,
        description: tier.stripeProductDescription,
      })
    }
    return existing.id
  }

  const created = await stripe.products.create({
    name: tier.stripeProductName,
    description: tier.stripeProductDescription,
    metadata: { tier: tier.id },
  })
  return created.id
}

async function upsertPrice(stripe: Stripe, tier: Tier, productId: string): Promise<string> {
  const list = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  const match = list.data.find(
    (p) => p.currency === 'gbp' && p.unit_amount === tier.pricePence && p.type === 'one_time'
  )
  if (match) return match.id

  for (const stale of list.data) {
    if (stale.currency === 'gbp' && stale.type === 'one_time') {
      await stripe.prices.update(stale.id, { active: false })
    }
  }

  const created = await stripe.prices.create({
    product: productId,
    currency: 'gbp',
    unit_amount: tier.pricePence,
    metadata: { tier: tier.id },
  })
  return created.id
}

async function upsertGiftProduct(stripe: Stripe, tier: Tier): Promise<string> {
  const name = `Leaf & Form Gift Card (${tier.priceLabel})`
  const description = `Gift card redeemable for the ${tier.label} plan.`

  const search = await stripe.products.search({
    query: `metadata['gift_card_tier']:'${tier.id}' AND active:'true'`,
    limit: 1,
  })

  const existing = search.data[0]
  if (existing) {
    if (existing.name !== name || existing.description !== description) {
      await stripe.products.update(existing.id, { name, description })
    }
    return existing.id
  }

  const created = await stripe.products.create({
    name,
    description,
    metadata: { gift_card_tier: tier.id },
  })
  return created.id
}

async function upsertGiftPrice(stripe: Stripe, tier: Tier, productId: string): Promise<string> {
  const list = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  const match = list.data.find(
    (p) => p.currency === 'gbp' && p.unit_amount === tier.pricePence && p.type === 'one_time'
  )
  if (match) return match.id

  for (const stale of list.data) {
    if (stale.currency === 'gbp' && stale.type === 'one_time') {
      await stripe.prices.update(stale.id, { active: false })
    }
  }

  const created = await stripe.prices.create({
    product: productId,
    currency: 'gbp',
    unit_amount: tier.pricePence,
    metadata: { gift_card_tier: tier.id },
  })
  return created.id
}

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  const contents = readFileSync(path, 'utf-8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
