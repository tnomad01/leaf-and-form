import { createSupabaseServerClient } from '@/lib/supabase'
import { runGenerationPipeline } from '@/lib/pipeline'
import { getTier } from '@/lib/tiers'

export const maxDuration = 60

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const encoder = new TextEncoder()

  function line(obj: object) {
    return encoder.encode(JSON.stringify(obj) + '\n')
  }

  const stream = new ReadableStream({
    async start(controller) {
      const supabase = createSupabaseServerClient()

      try {
        // Load submission
        const { data: submission, error } = await supabase
          .from('submissions')
          .select('id, name, location, color_prefs, avoid_plants, comments, photo_url, payment_status, tier')
          .eq('id', id)
          .single()

        if (error || !submission) {
          controller.enqueue(line({ status: 'error', error: 'Submission not found.' }))
          controller.close()
          return
        }

        if (submission.payment_status !== 'paid') {
          controller.enqueue(line({ status: 'error', error: 'Submission is not paid.' }))
          controller.close()
          return
        }

        const tier = getTier(submission.tier)
        if (!tier) {
          controller.enqueue(line({ status: 'error', error: `Unknown tier: ${submission.tier}` }))
          controller.close()
          return
        }

        // Mark as generating
        await supabase
          .from('submissions')
          .update({ design_status: 'generating' })
          .eq('id', id)

        // Run pipeline with streaming status updates
        const result = await runGenerationPipeline({ ...submission, tier: tier.id }, (msg) => {
          controller.enqueue(line({ status: msg }))
        })

        // Save results
        await supabase
          .from('submissions')
          .update({
            design_status: 'ready',
            blueprint_prompt: result.blueprintPrompt,
            blueprint_image_url: result.blueprintImageUrl,
            design_prompt: result.imagenPrompt,
            design_image_url: result.imageUrl,
            plant_list: result.plantList,
            generated_at: new Date().toISOString(),
          })
          .eq('id', id)

        controller.enqueue(
          line({
            status: 'complete',
            blueprintImageUrl: result.blueprintImageUrl,
            imageUrl: result.imageUrl,
            plantList: result.plantList,
          })
        )
      } catch (err) {
        console.error('Generation pipeline error:', err)
        await supabase
          .from('submissions')
          .update({ design_status: 'idle' })
          .eq('id', id)
        controller.enqueue(
          line({ status: 'error', error: err instanceof Error ? err.message : 'Generation failed.' })
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
