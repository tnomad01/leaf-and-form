import { createSupabaseServerClient } from '@/lib/supabase'
import { Resend } from 'resend'
import { getTier } from '@/lib/tiers'
import { buildGiftCardEmail } from '@/lib/email/gift-card'
import type { GiftCardRow } from '@/lib/gift-cards'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Gift card not found.' }, { status: 404 })
  }
  const giftCard = data as GiftCardRow

  if (giftCard.status === 'pending') {
    return Response.json({ error: 'Gift card has not been paid for yet.' }, { status: 400 })
  }

  const tier = getTier(giftCard.tier)
  if (!tier) {
    return Response.json({ error: `Unknown tier on gift card: ${giftCard.tier}` }, { status: 500 })
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return Response.json({ error: 'Email service not configured.' }, { status: 500 })
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
    console.error('Resend error on gift card resend:', emailError)
    return Response.json({ error: 'Failed to send email.' }, { status: 500 })
  }

  await supabase
    .from('gift_cards')
    .update({ delivered_at: new Date().toISOString() })
    .eq('id', giftCard.id)

  return Response.json({ ok: true })
}
