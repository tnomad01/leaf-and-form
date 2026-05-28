'use client'

import { useState } from 'react'

export interface Submission {
  id: string
  created_at: string
  name: string
  email: string
  location: string
  color_prefs: string | null
  avoid_plants: string | null
  comments: string | null
  photo_url: string
  payment_status: string
  design_status: string | null
  design_image_url: string | null
  plant_list: string | null
  generated_at: string | null
  sent_at: string | null
}

function buildChatGPTPrompt(s: Submission): string {
  return `You are an expert garden designer and botanical consultant working in the UK.

I have a customer's flower bed with the following details:

📍 Location: ${s.location}
🎨 Colour preferences: ${s.color_prefs || 'No specific preference'}
🚫 Plants/flowers to avoid: ${s.avoid_plants || 'None specified'}
💬 Additional notes: ${s.comments || 'None'}
📸 Photo of the current bed: ${s.photo_url}

Please provide two outputs:

---

IMAGEN_PROMPT:
Write a single paragraph (no line breaks) for a photorealistic AI image generator. Describe the bed transformed with your recommended planting scheme. Include: specific plant species names, colours in bloom, garden style, natural daylight, eye-level perspective. Be vivid and specific.

---

PLANT_LIST:
Write a markdown planting guide with these sections:

## Recommended Plants
| Plant | Quantity | Why chosen |
|---|---|---|

## How to Plant
(numbered steps)

## Seasonal Care
- **Spring:**
- **Summer:**
- **Autumn:**
- **Winter:**

## Local Conditions — ${s.location}
(2–3 sentences on typical climate, soil type, frost dates, and regional considerations)

---

Be practical, specific, and tailored to the customer's preferences and location.`
}

function buildImagenPromptInstructions(): string {
  return `After running the ChatGPT prompt above:

1. Copy the text after "IMAGEN_PROMPT:" from the ChatGPT response
2. Go to one of these image generators:
   • Google Gemini → gemini.google.com → click the image icon
   • Google ImageFX → labs.google/fx/tools/image-fx
   • Adobe Firefly → firefly.adobe.com
3. Paste the prompt and generate
4. Download the image

Then email the customer (${'{customer_email}'}) with:
  • The generated garden image
  • The PLANT_LIST from the ChatGPT response`
}

function CopyBlock({ label, text, mono = true }: { label: string; text: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#D4C5A9' }}>
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: '#EDE9E1' }}
      >
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#7C9A7E', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <button
          onClick={copy}
          className="text-xs px-3 py-1 rounded-full transition-colors font-medium"
          style={{
            backgroundColor: copied ? '#7C9A7E' : '#F7F4EE',
            color: copied ? '#F7F4EE' : '#2C2C2C',
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre
        className="text-xs p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed"
        style={{
          fontFamily: mono ? 'ui-monospace, monospace' : 'var(--font-inter), system-ui, sans-serif',
          color: '#2C2C2C',
          backgroundColor: '#FDFCF9',
          margin: 0,
        }}
      >
        {text}
      </pre>
    </div>
  )
}

function PromptsPanel({ submission }: { submission: Submission }) {
  const [open, setOpen] = useState(false)

  const chatGPTPrompt = buildChatGPTPrompt(submission)
  const imagenInstructions = buildImagenPromptInstructions().replace(
    '{customer_email}',
    submission.email
  )

  return (
    <div className="mt-6 pt-6" style={{ borderTop: '1px solid #EDE9E1' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9A9A8A', letterSpacing: '0.08em' }}>
          AI Design Prompts
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs px-4 py-2 rounded-full font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
        >
          {open ? 'Hide prompts' : 'Generate Prompts'}
        </button>
      </div>

      {open && (
        <div className="space-y-5">
          {/* Step 1 */}
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#2C2C2C' }}>
              Step 1 — Paste into ChatGPT
            </p>
            <p className="text-xs mb-3" style={{ color: '#9A9A8A' }}>
              This generates both the plant shopping list and the image prompt for Gemini.
            </p>
            <CopyBlock label="ChatGPT prompt" text={chatGPTPrompt} />
          </div>

          {/* Step 2 */}
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#2C2C2C' }}>
              Step 2 — Generate the garden image
            </p>
            <p className="text-xs mb-3" style={{ color: '#9A9A8A' }}>
              Copy the IMAGEN_PROMPT section from ChatGPT's response and follow the steps below.
            </p>
            <CopyBlock label="Instructions" text={imagenInstructions} mono={false} />
          </div>

          {/* Reminder */}
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ backgroundColor: '#EDE9E1', color: '#5A5A5A' }}
          >
            <strong style={{ color: '#2C2C2C' }}>When you're ready to send:</strong> email{' '}
            <a href={`mailto:${submission.email}`} style={{ color: '#7C9A7E' }}>
              {submission.email}
            </a>{' '}
            directly with the generated image attached and the plant list pasted in.
            API automation can be switched on later without changing anything else.
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'idle'
  const map: Record<string, { label: string; bg: string; color: string }> = {
    idle: { label: 'Awaiting design', bg: '#EDE9E1', color: '#9A9A8A' },
    sent: { label: 'Sent',           bg: '#D4E5D4', color: '#2D5A2D' },
  }
  const { label, bg, color } = map[s] ?? map.idle
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: bg, color }}>
      {label}
    </span>
  )
}

export default function AdminTable({ submissions }: { submissions: Submission[] }) {
  const [selected, setSelected] = useState<Submission | null>(null)

  if (submissions.length === 0) {
    return (
      <div className="text-center py-24" style={{ color: '#9A9A8A' }}>
        <p className="text-lg mb-2">No paid submissions yet.</p>
        <p className="text-sm">Once a customer completes payment, their request will appear here.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: '#D4C5A9' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#EDE9E1', borderBottom: '1px solid #D4C5A9' }}>
              {['Date', 'Name', 'Email', 'Location', 'Photo'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider"
                  style={{ color: '#7C9A7E', letterSpacing: '0.08em' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, i) => (
              <tr
                key={s.id}
                onClick={() => setSelected(s)}
                className="cursor-pointer transition-colors hover:bg-[#F0EDE6]"
                style={{ borderBottom: i < submissions.length - 1 ? '1px solid #EDE9E1' : 'none' }}
              >
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#9A9A8A' }}>
                  {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: '#2C2C2C' }}>{s.name}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${s.email}`} onClick={(e) => e.stopPropagation()} className="hover:underline" style={{ color: '#7C9A7E' }}>
                    {s.email}
                  </a>
                </td>
                <td className="px-4 py-3" style={{ color: '#5A5A5A' }}>{s.location}</td>
                <td className="px-4 py-3">
                  <img src={s.photo_url} alt="" className="w-12 h-10 object-cover rounded-lg" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(44,44,44,0.5)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 relative"
            style={{ backgroundColor: '#F7F4EE' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-opacity hover:opacity-70"
              style={{ backgroundColor: '#EDE9E1', color: '#2C2C2C' }}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="mb-1 text-xs" style={{ color: '#9A9A8A' }}>
              {new Date(selected.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}>
              {selected.name}
            </h2>

            <img src={selected.photo_url} alt="Garden photo" className="w-full rounded-2xl mb-6 object-cover" style={{ maxHeight: '280px' }} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Detail label="Email">
                <a href={`mailto:${selected.email}`} style={{ color: '#7C9A7E' }}>{selected.email}</a>
              </Detail>
              <Detail label="Location">{selected.location}</Detail>
            </div>
            {selected.color_prefs && <Detail label="Colour preferences" block>{selected.color_prefs}</Detail>}
            {selected.avoid_plants && <Detail label="Plants to avoid" block>{selected.avoid_plants}</Detail>}
            {selected.comments && <Detail label="Additional comments" block>{selected.comments}</Detail>}

            <PromptsPanel submission={selected} />
          </div>
        </div>
      )}
    </>
  )
}

function Detail({ label, block, children }: { label: string; block?: boolean; children: React.ReactNode }) {
  return (
    <div className={block ? 'mb-4' : ''}>
      <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: '#9A9A8A', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: '#2C2C2C' }}>{children}</p>
    </div>
  )
}
