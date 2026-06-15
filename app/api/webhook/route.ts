import { getStripe } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase'
import { Resend } from 'resend'
import Stripe from 'stripe'
import { getTier } from '@/lib/tiers'
import {
  issueStripeGiftCardCoupon,
  markGiftCardRedeemed,
  type GiftCardRow,
} from '@/lib/gift-cards'
import { buildGiftCardEmail } from '@/lib/email/gift-card'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('OK', { status: 200 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const type = session.metadata?.type

  try {
    if (type === 'gift_card') {
      await handleGiftCardPurchase(session)
    } else {
      await handleGardenSubmission(session)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response('Webhook handler error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

async function handleGardenSubmission(session: Stripe.Checkout.Session) {
  const submissionId = session.metadata?.submission_id
  if (!submissionId) return

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('submissions')
    .update({ payment_status: 'paid' })
    .eq('id', submissionId)

  if (error) {
    throw new Error(`DB update failed for submission ${submissionId}: ${error.message}`)
  }

  // If a gift card promo code was redeemed in this session, mark it.
  const promoRef = session.discounts?.[0]?.promotion_code
  const promotionCodeId = typeof promoRef === 'string' ? promoRef : promoRef?.id
  if (promotionCodeId) {
    await markGiftCardRedeemed(supabase, promotionCodeId, submissionId)
  }
}

async function handleGiftCardPurchase(session: Stripe.Checkout.Session) {
  const giftCardId = session.metadata?.gift_card_id
  const tierId = session.metadata?.tier
  if (!giftCardId || !tierId) {
    throw new Error('Gift card session missing required metadata.')
  }

  const tier = getTier(tierId)
  if (!tier) {
    throw new Error(`Unknown tier on gift card session: ${tierId}`)
  }

  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('id', giftCardId)
    .single()

  if (error || !data) {
    throw new Error(`Gift card ${giftCardId} not found: ${error?.message ?? 'no row'}`)
  }
  const giftCard = data as GiftCardRow

  if (giftCard.status !== 'pending') {
    // Idempotency — already fulfilled.
    return
  }

  await issueStripeGiftCardCoupon(supabase, giftCard)

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('Gift card minted but Resend not configured — recipient not emailed.')
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { subject, html } = buildGiftCardEmail({
    recipientName: giftCard.recipient_name,
    senderName: giftCard.sender_name,
    code: giftCard.code,
    message: giftCard.message,
    tier,
    redeemUrl: `${baseUrl}/submit`,
  })

  const { error: emailError } = await resend.emails.send({
    from: `Leaf & Form <${process.env.RESEND_FROM_EMAIL}>`,
    to: giftCard.recipient_email,
    subject,
    html,
  })

  if (emailError) {
    console.error('Resend error sending gift card:', emailError)
  }
}
