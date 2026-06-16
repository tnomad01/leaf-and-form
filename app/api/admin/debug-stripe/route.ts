import { getStripe } from '@/lib/stripe'

export async function GET() {
  const secret = process.env.STRIPE_SECRET_KEY ?? ''
  const giftPrice = process.env.STRIPE_PRICE_GIFT_BLUEPRINT_ID ?? ''

  const out: Record<string, unknown> = {
    secretKeyPrefix: secret.slice(0, 12),
    giftPriceId: giftPrice,
  }

  try {
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve()
    out.account = { id: account.id, email: account.email, country: account.country }
  } catch (err) {
    out.accountError = err instanceof Error ? err.message : String(err)
  }

  if (giftPrice) {
    try {
      const stripe = getStripe()
      const price = await stripe.prices.retrieve(giftPrice)
      out.priceLookup = {
        id: price.id,
        product: price.product,
        unit_amount: price.unit_amount,
        livemode: price.livemode,
      }
    } catch (err) {
      out.priceLookupError = err instanceof Error ? err.message : String(err)
    }
  }

  return Response.json(out)
}
