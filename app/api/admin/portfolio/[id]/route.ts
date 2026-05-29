import { createSupabaseServerClient } from '@/lib/supabase'

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  const title = (formData.get('title') as string)?.trim()
  const location = (formData.get('location') as string)?.trim()
  const description = formData.get('description')
  const sortOrder = formData.get('sort_order')
  const published = formData.get('published')

  if (title) updates.title = title
  if (location) updates.location = location
  if (description !== null) updates.description = (description as string).trim() || null
  if (sortOrder !== null) updates.sort_order = parseInt(sortOrder as string, 10)
  if (published !== null) updates.published = published !== 'false'

  const blueprint = formData.get('blueprint') as File | null
  const final = formData.get('final') as File | null

  if (blueprint?.size) {
    const url = await uploadPortfolioImage(supabase, blueprint, 'blueprint')
    if (url) updates.blueprint_url = url
  }

  if (final?.size) {
    const url = await uploadPortfolioImage(supabase, final, 'final')
    if (url) updates.final_url = url
  }

  const { data, error } = await supabase
    .from('portfolio')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ item: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { error } = await supabase.from('portfolio').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
