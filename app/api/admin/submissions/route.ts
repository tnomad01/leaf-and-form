import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch submissions:', error)
    return Response.json({ error: 'Failed to fetch submissions.' }, { status: 500 })
  }

  return Response.json({ submissions: data })
}
