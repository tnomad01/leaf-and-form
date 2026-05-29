import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('portfolio')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ portfolio: data })
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const title = (formData.get('title') as string)?.trim()
  const location = (formData.get('location') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const sortOrder = parseInt((formData.get('sort_order') as string) || '0', 10)
  const published = formData.get('published') !== 'false'

  if (!title || !location) {
    return Response.json({ error: 'Title and location are required.' }, { status: 400 })
  }

  let blueprintUrl: string | null = null
  let finalUrl: string | null = null

  const blueprint = formData.get('blueprint') as File | null
  const final = formData.get('final') as File | null

  if (blueprint?.size) {
    blueprintUrl = await uploadPortfolioImage(supabase, blueprint, 'blueprint')
    if (!blueprintUrl) return Response.json({ error: 'Blueprint upload failed.' }, { status: 500 })
  }

  if (final?.size) {
    finalUrl = await uploadPortfolioImage(supabase, final, 'final')
    if (!finalUrl) return Response.json({ error: 'Final photo upload failed.' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('portfolio')
    .insert({ title, location, description, blueprint_url: blueprintUrl, final_url: finalUrl, sort_order: sortOrder, published })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ item: data })
}

async function uploadPortfolioImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  file: File,
  prefix: string
): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('portfolio-images')
    .upload(fileName, buffer, { contentType: file.type })

  if (error) { console.error('Portfolio upload error:', error); return null }

  const { data: { publicUrl } } = supabase.storage
    .from('portfolio-images')
    .getPublicUrl(fileName)

  return publicUrl
}
