import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .order('purchased_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch gift cards:', error)
    return Response.json({ error: 'Failed to fetch gift cards.' }, { status: 500 })
  }

  return Response.json({ giftCards: data })
}
