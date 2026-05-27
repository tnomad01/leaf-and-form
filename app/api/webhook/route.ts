import { getStripe } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase'
import Stripe from 'stripe'

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const submissionId = session.metadata?.submission_id

    if (submissionId) {
      const supabase = createSupabaseServerClient()
      const { error } = await supabase
        .from('submissions')
        .update({ payment_status: 'paid' })
        .eq('id', submissionId)

      if (error) {
        console.error('Failed to update submission payment status:', error)
        return new Response('DB update failed', { status: 500 })
      }
    }
  }

  return new Response('OK', { status: 200 })
}
