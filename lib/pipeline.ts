import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseServerClient } from './supabase'
import type { TierId } from './tiers'
import { TIERS } from './tiers'

export interface PipelineSubmission {
  id: string
  name: string
  location: string
  color_prefs: string | null
  avoid_plants: string | null
  comments: string | null
  photo_url: string
  tier: TierId
}

export interface PipelineResult {
  blueprintPrompt: string
  blueprintImageUrl: string
  imagenPrompt: string
  imageUrl: string | null
  plantList: string | null
}

const SYSTEM_PROMPT = `You are an expert garden designer and botanical consultant working in the UK.
Given a photo of a garden bed and the owner's preferences, you will produce three outputs.

Output 1 — start a new line with exactly "BLUEPRINT_PROMPT:" then write a single paragraph (no line breaks) describing a top-down schematic planting blueprint of the bed. Show plant positions as labelled circles or simple shapes, with a soft pastel colour key by species, a clean off-white background, hand-drawn garden-designer style, gentle pencil/ink lines, plant labels in a tidy serif. Be precise about which species sit where so an AI image generator can render a coherent planting layout diagram.

Output 2 — start a new line with exactly "IMAGEN_PROMPT:" then write a single paragraph (no line breaks) describing a photorealistic garden visualisation of the bed transformed with your recommended planting scheme. Include: specific plant species in bloom, colour palette, garden style, natural daylight, eye-level perspective. Be vivid and specific — this goes directly to an AI image generator.

Output 3 — start a new line with exactly "PLANT_LIST:" then write markdown with these sections:

## Recommended Plants
| Plant | Quantity | Why chosen |
|---|---|---|
(6–10 rows)

## How to Plant
1. (numbered steps)

## Seasonal Care
- **Spring:** ...
- **Summer:** ...
- **Autumn:** ...
- **Winter:** ...

## Local Conditions — {LOCATION}
2–3 sentences covering typical climate, soil type, frost dates, and any regional considerations.

Be practical, specific, and tailored to the customer's preferences and location.`

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
}

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

async function craftPromptAndPlantList(submission: PipelineSubmission): Promise<{
  blueprintPrompt: string
  imagenPrompt: string
  plantList: string
}> {
  const openai = getOpenAI()

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    {
      type: 'image_url',
      image_url: { url: submission.photo_url, detail: 'high' },
    },
    {
      type: 'text',
      text: [
        `Garden location: ${submission.location}`,
        submission.color_prefs ? `Colour preferences: ${submission.color_prefs}` : null,
        submission.avoid_plants ? `Plants/flowers to avoid: ${submission.avoid_plants}` : null,
        submission.comments ? `Additional notes: ${submission.comments}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT.replace('{LOCATION}', submission.location) },
      { role: 'user', content: userContent },
    ],
    max_tokens: 1500,
  })

  const text = response.choices[0]?.message?.content ?? ''

  const blueprintMatch = text.match(/BLUEPRINT_PROMPT:\s*([\s\S]*?)(?=\nIMAGEN_PROMPT:|$)/)
  const imagenMatch = text.match(/IMAGEN_PROMPT:\s*([\s\S]*?)(?=\nPLANT_LIST:|$)/)
  const plantMatch = text.match(/PLANT_LIST:\s*([\s\S]*)$/)

  const blueprintPrompt = blueprintMatch?.[1]?.trim() ?? ''
  const imagenPrompt = imagenMatch?.[1]?.trim() ?? ''
  const plantList = plantMatch?.[1]?.trim() ?? ''

  if (!blueprintPrompt || !imagenPrompt || !plantList) {
    throw new Error('GPT-4o response did not contain expected BLUEPRINT_PROMPT, IMAGEN_PROMPT or PLANT_LIST sections.')
  }

  return { blueprintPrompt, imagenPrompt, plantList }
}

async function generateGardenImage(prompt: string): Promise<{ base64: string; mimeType: string }> {
  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' } as Parameters<typeof genAI.getGenerativeModel>[0])

  // Use the Imagen API via the generative model interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (model as any).generateImages({
    prompt,
    numberOfImages: 1,
    aspectRatio: '4:3',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const image = result?.generatedImages?.[0] ?? result?.images?.[0]
  if (!image) throw new Error('Gemini Imagen returned no images.')

  const base64 = image.image?.imageBytes ?? image.imageBytes
  const mimeType = image.image?.mimeType ?? 'image/png'

  if (!base64) throw new Error('Gemini Imagen response missing image bytes.')

  return { base64, mimeType }
}

async function uploadImageToSupabase(
  base64: string,
  mimeType: string,
  submissionId: string,
  kind: 'blueprint' | 'design'
): Promise<string> {
  const supabase = createSupabaseServerClient()
  const ext = mimeType.split('/')[1] ?? 'png'
  const folder = kind === 'blueprint' ? 'blueprints' : 'designs'
  const fileName = `${folder}/${submissionId}.${ext}`

  const buffer = Buffer.from(base64, 'base64')

  const { error } = await supabase.storage
    .from('garden-photos')
    .upload(fileName, buffer, { contentType: mimeType, upsert: true })

  if (error) throw new Error(`Image upload failed: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('garden-photos')
    .getPublicUrl(fileName)

  return publicUrl
}

export async function runGenerationPipeline(
  submission: PipelineSubmission,
  onStatus: (msg: string) => void
): Promise<PipelineResult> {
  const tier = TIERS[submission.tier]

  onStatus('Analysing your garden and crafting the design brief…')
  const { blueprintPrompt, imagenPrompt, plantList } = await craftPromptAndPlantList(submission)

  onStatus('Sketching your planting blueprint…')
  const blueprintImage = await generateGardenImage(blueprintPrompt)
  const blueprintImageUrl = await uploadImageToSupabase(
    blueprintImage.base64,
    blueprintImage.mimeType,
    submission.id,
    'blueprint'
  )

  let imageUrl: string | null = null
  if (tier.deliverables.photo) {
    onStatus('Generating your photorealistic garden artwork…')
    const designImage = await generateGardenImage(imagenPrompt)
    onStatus('Saving your design…')
    imageUrl = await uploadImageToSupabase(
      designImage.base64,
      designImage.mimeType,
      submission.id,
      'design'
    )
  }

  return {
    blueprintPrompt,
    blueprintImageUrl,
    imagenPrompt,
    imageUrl,
    plantList: tier.deliverables.plantList ? plantList : null,
  }
}
