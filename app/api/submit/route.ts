import { createSupabaseServerClient } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'
import { getTier, getTierStripeIds } from '@/lib/tiers'
import { validatePromoCodeById } from '@/lib/stripe-promo'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    return await handleSubmit(request)
  } catch (err) {
    console.error('Unhandled error in /api/submit:', err)
    return Response.json(
      { error: `Internal server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

async function handleSubmit(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const location = (formData.get('location') as string)?.trim()
  const colorPrefs = (formData.get('color_prefs') as string)?.trim() || null
  const avoidPlants = (formData.get('avoid_plants') as string)?.trim() || null
  const comments = (formData.get('comments') as string)?.trim() || null
  const photo = formData.get('photo') as File | null
  const tierId = (formData.get('tier') as string)?.trim()
  const promotionCodeId = (formData.get('promotion_code_id') as string)?.trim() || null

  if (!name || !email || !location || !photo) {
    return Response.json({ error: 'Name, email, location and photo are required.' }, { status: 400 })
  }

  const tier = getTier(tierId)
  if (!tier) {
    return Response.json({ error: 'Please choose a valid plan.' }, { status: 400 })
  }

  if (!photo.type.startsWith('image/')) {
    return Response.json({ error: 'Photo must be an image file.' }, { status: 400 })
  }

  const maxBytes = 20 * 1024 * 1024
  if (photo.size > maxBytes) {
    return Response.json({ error: 'Photo must be under 20 MB.' }, { status: 400 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Server not configured: missing Supabase credentials.' }, { status: 500 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Server not configured: missing Stripe credentials.' }, { status: 500 })
  }

  let promo: Awaited<ReturnType<typeof validatePromoCodeById>> | null = null
  if (promotionCodeId) {
    promo = await validatePromoCodeById(promotionCodeId, tier)
    if (!promo.valid) {
      return Response.json({ error: promo.error }, { status: 400 })
    }
  }

  const supabase = createSupabaseServerClient()

  // Upload photo to Supabase Storage
  const ext = photo.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const arrayBuffer = await photo.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('garden-photos')
    .upload(fileName, arrayBuffer, { contentType: photo.type })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return Response.json({ error: `Photo upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('garden-photos')
    .getPublicUrl(fileName)

  // Insert pending submission
  const { data: submission, error: dbError } = await supabase
    .from('submissions')
    .insert({
      name,
      email,
      location,
      color_prefs: colorPrefs,
      avoid_plants: avoidPlants,
      comments,
      photo_url: publicUrl,
      payment_status: 'pending',
      tier: tier.id,
      price_pence: tier.pricePence,
      promotion_code_id: promo?.valid ? promo.promotionCodeId : null,
      discount_pence: promo?.valid ? promo.discountPence : 0,
    })
    .select('id')
    .single()

  if (dbError || !submission) {
    console.error('DB insert error:', dbError)
    return Response.json({ error: `Database error: ${dbError?.message ?? 'unknown'}` }, { status: 500 })
  }

  // Create Stripe Checkout session
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const stripeIds = getTierStripeIds(tier)

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [{ price: stripeIds.priceId, quantity: 1 }],
    mode: 'payment',
    customer_email: email,
    metadata: { submission_id: submission.id, tier: tier.id },
    success_url: `${baseUrl}/success`,
    cancel_url: `${baseUrl}/submit`,
  }

  if (promo?.valid) {
    sessionParams.discounts = [{ promotion_code: promo.promotionCodeId }]
  } else {
    sessionParams.allow_promotion_codes = true
  }

  const session = await getStripe().checkout.sessions.create(sessionParams)

  await supabase
    .from('submissions')
    .update({ stripe_session_id: session.id })
    .eq('id', submission.id)

  return Response.json({ url: session.url })
}
