import { createSupabaseServerClient } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { getTier, getGiftCardStripeIds } from '@/lib/tiers'
import { generateUniqueGiftCardCode } from '@/lib/gift-cards'

export async function POST(request: Request) {
  try {
    return await handle(request)
  } catch (err) {
    console.error('Unhandled error in /api/gift/buy:', err)
    return Response.json(
      { error: `Internal server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

async function handle(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const tierId = (formData.get('tier') as string)?.trim()
  const senderName = (formData.get('sender_name') as string)?.trim()
  const senderEmail = (formData.get('sender_email') as string)?.trim()
  const recipientName = (formData.get('recipient_name') as string)?.trim()
  const recipientEmail = (formData.get('recipient_email') as string)?.trim()
  const message = (formData.get('message') as string)?.trim() || null

  if (!senderName || !senderEmail || !recipientName || !recipientEmail) {
    return Response.json({ error: 'Please fill in your name, email, and the recipient details.' }, { status: 400 })
  }

  const tier = getTier(tierId)
  if (!tier) {
    return Response.json({ error: 'Please choose a valid plan.' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Server not configured: missing Stripe credentials.' }, { status: 500 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server not configured: missing Supabase credentials.' }, { status: 500 })
  }

  const supabase = createSupabaseServerClient()
  const stripeIds = getGiftCardStripeIds(tier)

  const code = await generateUniqueGiftCardCode(supabase)

  const { data: giftCard, error: insertError } = await supabase
    .from('gift_cards')
    .insert({
      code,
      tier: tier.id,
      price_pence: tier.pricePence,
      sender_name: senderName,
      sender_email: senderEmail,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      message,
      stripe_session_id: '',
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !giftCard) {
    console.error('gift_cards insert error:', insertError)
    return Response.json({ error: `Database error: ${insertError?.message ?? 'unknown'}` }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: stripeIds.priceId, quantity: 1 }],
    mode: 'payment',
    customer_email: senderEmail,
    metadata: {
      type: 'gift_card',
      gift_card_id: giftCard.id,
      tier: tier.id,
    },
    success_url: `${baseUrl}/gift/success`,
    cancel_url: `${baseUrl}/gift`,
  })

  await supabase
    .from('gift_cards')
    .update({ stripe_session_id: session.id })
    .eq('id', giftCard.id)

  return Response.json({ url: session.url })
}
