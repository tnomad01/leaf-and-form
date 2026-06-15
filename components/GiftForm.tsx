'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { TIERS, TIER_ORDER, DEFAULT_TIER, type TierId } from '@/lib/tiers'

export default function GiftForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [tierId, setTierId] = useState<TierId>(DEFAULT_TIER)
  const tier = TIERS[tierId]
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const form = formRef.current!
    const data = new FormData(form)
    data.set('tier', tierId)

    setSubmitting(true)
    try {
      const res = await fetch('/api/gift/buy', { method: 'POST', body: data })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        return
      }
      window.location.href = json.url
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F4EE' }}>
      <nav className="flex items-center px-6 py-5 max-w-3xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: '#7C9A7E' }}
        >
          <span aria-hidden>←</span> Leaf &amp; Form
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-24 pt-10">
        <div className="mb-12">
          <p
            className="text-xs font-medium mb-3"
            style={{ color: '#7C9A7E', letterSpacing: '0.18em', textTransform: 'uppercase' }}
          >
            Gift Card
          </p>
          <h1
            className="text-4xl mb-3"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
          >
            Gift a garden design
          </h1>
          <p style={{ color: '#5A5A5A' }}>
            Pick a plan, share the recipient&apos;s details, and we&apos;ll email them a redemption code straight away.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
          {/* Denomination */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: '#2C2C2C' }}>
              Choose a plan to gift <span style={{ color: '#7C9A7E' }}>*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIER_ORDER.map((id) => {
                const t = TIERS[id]
                const selected = id === tierId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTierId(id)}
                    className="text-left rounded-xl p-4 transition-colors"
                    style={{
                      backgroundColor: selected ? '#F0F5F0' : '#FDFCF9',
                      border: `2px solid ${selected ? '#7C9A7E' : '#C9B99A'}`,
                    }}
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="font-medium text-sm" style={{ color: '#2C2C2C' }}>
                        {t.label}
                      </span>
                      <span
                        className="font-medium"
                        style={{ color: selected ? '#7C9A7E' : '#2C2C2C' }}
                      >
                        {t.priceLabel}
                      </span>
                    </div>
                    <ul className="text-xs space-y-1" style={{ color: '#5A5A5A' }}>
                      {t.bullets.map((b) => (
                        <li key={b}>· {b}</li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Your name" required>
              <input name="sender_name" type="text" required placeholder="Jane Smith" className="input-field" />
            </Field>
            <Field label="Your email" required>
              <input name="sender_email" type="email" required placeholder="jane@example.com" className="input-field" />
            </Field>
          </div>

          {/* Recipient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Recipient name" required>
              <input name="recipient_name" type="text" required placeholder="Alex Brown" className="input-field" />
            </Field>
            <Field label="Recipient email" required>
              <input name="recipient_email" type="email" required placeholder="alex@example.com" className="input-field" />
            </Field>
          </div>

          {/* Message */}
          <Field
            label="Personal message"
            hint="Included with the gift code email (optional)"
          >
            <textarea
              name="message"
              rows={3}
              maxLength={500}
              placeholder="Happy birthday! Hope this brightens your garden…"
              className="input-field resize-none"
            />
          </Field>

          {error && (
            <p className="text-sm rounded-lg px-4 py-3" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm" style={{ color: '#9A9A8A' }}>
              Sent instantly via email
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2C2C2C', color: '#F7F4EE' }}
            >
              {submitting ? 'Redirecting…' : `Buy gift card · ${tier.priceLabel}`}
              {!submitting && <span aria-hidden>→</span>}
            </button>
          </div>
        </form>
      </main>

      <style>{`
        .input-field {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #C9B99A;
          background: #FDFCF9;
          color: #2C2C2C;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.15s;
          font-family: var(--font-inter), system-ui, sans-serif;
        }
        .input-field:focus {
          border-color: #7C9A7E;
          box-shadow: 0 0 0 3px rgba(124, 154, 126, 0.15);
        }
        .input-field::placeholder {
          color: #B0AFA8;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C2C' }}>
        {label}
        {required && <span style={{ color: '#7C9A7E' }}> *</span>}
        {hint && (
          <span className="ml-2 font-normal" style={{ color: '#9A9A8A', fontSize: '0.8rem' }}>
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}
