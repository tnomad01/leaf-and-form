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

type GenerateState =
  | { phase: 'idle' }
  | { phase: 'streaming'; message: string }
  | { phase: 'error'; error: string }

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'idle'
  const map: Record<string, { label: string; bg: string; color: string }> = {
    idle:       { label: 'Not generated', bg: '#EDE9E1', color: '#9A9A8A' },
    generating: { label: 'Generating…',   bg: '#FEF9C3', color: '#854D0E' },
    ready:      { label: 'Ready to send', bg: '#DCFCE7', color: '#166534' },
    sent:       { label: 'Sent',          bg: '#D4E5D4', color: '#2D5A2D' },
  }
  const { label, bg, color } = map[s] ?? map.idle
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  )
}

function PlantListRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className="text-base mt-5 mb-2 font-medium" style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}>
          {line.slice(3)}
        </h3>
      )
    } else if (line.startsWith('| ') && line.endsWith(' |')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      const isSeparator = cells.every((c) => /^[-:]+$/.test(c))
      if (!isSeparator) {
        const isHeader = i === 0 || !lines[i - 1]?.startsWith('| ')
        elements.push(
          <div key={key++} className="flex gap-0 text-sm" style={{ borderBottom: '1px solid #D4C5A9' }}>
            {cells.map((c, ci) => (
              <div
                key={ci}
                className="flex-1 px-3 py-1.5"
                style={{ fontWeight: isHeader ? 600 : 400, color: '#2C2C2C', fontSize: '0.8rem' }}
              >
                {c}
              </div>
            ))}
          </div>
        )
      }
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <p key={key++} className="text-sm pl-3 mb-0.5" style={{ color: '#5A5A5A' }}>
          · {line.slice(2).replace(/\*\*(.+?)\*\*/g, '$1')}
        </p>
      )
    } else if (/^\d+\. /.test(line)) {
      elements.push(
        <p key={key++} className="text-sm pl-3 mb-0.5" style={{ color: '#5A5A5A' }}>
          {line}
        </p>
      )
    } else if (line.trim()) {
      elements.push(
        <p key={key++} className="text-sm mb-1 leading-relaxed" style={{ color: '#5A5A5A' }}>
          {line.replace(/\*\*(.+?)\*\*/g, '$1')}
        </p>
      )
    }
  }

  return <div>{elements}</div>
}

function DesignPanel({
  submission,
  onUpdate,
}: {
  submission: Submission
  onUpdate: (updates: Partial<Submission>) => void
}) {
  const [genState, setGenState] = useState<GenerateState>({ phase: 'idle' })
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const status = submission.design_status ?? 'idle'

  async function handleGenerate() {
    setGenState({ phase: 'streaming', message: 'Starting…' })
    onUpdate({ design_status: 'generating' })

    try {
      const res = await fetch(`/api/admin/generate/${submission.id}`, { method: 'POST' })
      if (!res.body) throw new Error('No response stream')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            if (msg.status === 'complete') {
              onUpdate({
                design_status: 'ready',
                design_image_url: msg.imageUrl,
                plant_list: msg.plantList,
                generated_at: new Date().toISOString(),
              })
              setGenState({ phase: 'idle' })
            } else if (msg.status === 'error') {
              setGenState({ phase: 'error', error: msg.error })
              onUpdate({ design_status: 'idle' })
            } else {
              setGenState({ phase: 'streaming', message: msg.status })
            }
          } catch {
            // non-JSON line, skip
          }
        }
      }
    } catch (err) {
      setGenState({ phase: 'error', error: err instanceof Error ? err.message : 'Generation failed.' })
      onUpdate({ design_status: 'idle' })
    }
  }

  async function handleSend() {
    setSendError(null)
    setSending(true)
    try {
      const res = await fetch(`/api/admin/send/${submission.id}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setSendError(json.error ?? 'Failed to send.')
        return
      }
      onUpdate({ design_status: 'sent', sent_at: new Date().toISOString() })
    } catch {
      setSendError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-6 pt-6" style={{ borderTop: '1px solid #EDE9E1' }}>
      <p className="text-xs font-medium mb-4 uppercase tracking-wider" style={{ color: '#9A9A8A', letterSpacing: '0.08em' }}>
        AI Design
      </p>

      {/* Idle — show generate button */}
      {status === 'idle' && genState.phase === 'idle' && (
        <button
          onClick={handleGenerate}
          className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
        >
          Generate Design
        </button>
      )}

      {/* Streaming progress */}
      {genState.phase === 'streaming' && (
        <div className="rounded-xl px-4 py-4 text-sm text-center" style={{ backgroundColor: '#EDE9E1', color: '#5A5A5A' }}>
          <span className="inline-block animate-pulse">⟳</span>{' '}
          {genState.message}
        </div>
      )}

      {/* Error */}
      {genState.phase === 'error' && (
        <div className="space-y-3">
          <p className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
            {genState.error}
          </p>
          <button
            onClick={handleGenerate}
            className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Ready — show outputs + send button */}
      {(status === 'ready' || status === 'sent') && submission.design_image_url && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#9A9A8A', letterSpacing: '0.08em' }}>
              Generated Design
            </p>
            <img
              src={submission.design_image_url}
              alt="Generated garden design"
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: '280px' }}
            />
          </div>

          {submission.plant_list && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#EDE9E1' }}>
              <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: '#9A9A8A', letterSpacing: '0.08em' }}>
                Plant List &amp; Guide
              </p>
              <PlantListRenderer markdown={submission.plant_list} />
            </div>
          )}

          {status === 'ready' && (
            <div>
              {sendError && (
                <p className="text-sm px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                  {sendError}
                </p>
              )}
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#2C2C2C', color: '#F7F4EE' }}
              >
                {sending ? 'Sending…' : `Send to ${submission.email}`}
              </button>
            </div>
          )}

          {status === 'sent' && submission.sent_at && (
            <div className="text-center py-3 rounded-xl text-sm" style={{ backgroundColor: '#D4E5D4', color: '#2D5A2D' }}>
              ✓ Sent on{' '}
              {new Date(submission.sent_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminTable({ submissions: initialSubmissions }: { submissions: Submission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [selected, setSelected] = useState<Submission | null>(null)

  function updateSubmission(id: string, updates: Partial<Submission>) {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    setSelected((prev) => (prev?.id === id ? { ...prev, ...updates } : prev))
  }

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
              {['Date', 'Name', 'Email', 'Location', 'Photo', 'Design'].map((h) => (
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
                <td className="px-4 py-3" style={{ color: '#5A5A5A' }}>
                  <a href={`mailto:${s.email}`} onClick={(e) => e.stopPropagation()} className="hover:underline" style={{ color: '#7C9A7E' }}>
                    {s.email}
                  </a>
                </td>
                <td className="px-4 py-3" style={{ color: '#5A5A5A' }}>{s.location}</td>
                <td className="px-4 py-3">
                  <img src={s.photo_url} alt="" className="w-12 h-10 object-cover rounded-lg" />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.design_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
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

            <DesignPanel
              submission={selected}
              onUpdate={(updates) => updateSubmission(selected.id, updates)}
            />
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
