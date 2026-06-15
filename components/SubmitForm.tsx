'use client'

import { useRef, useState, useEffect, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { TIERS, TIER_ORDER, DEFAULT_TIER, type TierId } from '@/lib/tiers'

const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB

interface AppliedPromo {
  promotionCodeId: string
  code: string
  discountPence: number
  newTotalPence: number
  label: string
}

type PromoStatus = 'idle' | 'checking' | 'valid' | 'invalid'

export default function SubmitForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tierId, setTierId] = useState<TierId>(DEFAULT_TIER)
  const tier = TIERS[tierId]

  const [promoInput, setPromoInput] = useState('')
  const [promoStatus, setPromoStatus] = useState<PromoStatus>('idle')
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)

  useEffect(() => {
    const code = promoInput.trim()
    if (!code) {
      setPromoStatus('idle')
      setAppliedPromo(null)
      setPromoError(null)
      return
    }

    setPromoStatus('checking')
    setPromoError(null)
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/validate-promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, tier: tierId }),
          signal: ctrl.signal,
        })
        const json = await res.json()
        if (json.valid) {
          setAppliedPromo({
            promotionCodeId: json.promotionCodeId,
            code: json.code,
            discountPence: json.discountPence,
            newTotalPence: json.newTotalPence,
            label: json.label,
          })
          setPromoStatus('valid')
          setPromoError(null)
        } else {
          setAppliedPromo(null)
          setPromoStatus('invalid')
          setPromoError(json.error ?? 'Code not valid.')
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setAppliedPromo(null)
        setPromoStatus('invalid')
        setPromoError('Unable to check that code right now.')
      }
    }, 400)

    return () => {
      ctrl.abort()
      clearTimeout(timer)
    }
  }, [promoInput, tierId])

  const totalPence = appliedPromo?.newTotalPence ?? tier.pricePence
  const totalLabel = `£${(totalPence / 100).toFixed(totalPence % 100 === 0 ? 0 : 2)}`

  function handleFile(f: File) {
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP, HEIC).')
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setError('Photo must be under 20 MB.')
      return
    }
    setError(null)
    setFile(f)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError('Please upload a photo of your garden.')
      return
    }

    const form = formRef.current!
    const data = new FormData(form)
    data.set('photo', file, file.name)
    data.set('tier', tierId)
    if (appliedPromo) {
      data.set('promotion_code_id', appliedPromo.promotionCodeId)
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/submit', { method: 'POST', body: data })
      let json: { url?: string; error?: string } = {}
      try {
        json = await res.json()
      } catch {
        setError(`Server error (${res.status}). Check Vercel function logs for details.`)
        return
      }
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        return
      }
      window.location.href = json.url!
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F4EE' }}>
      {/* Nav */}
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
          <h1
            className="text-4xl mb-3"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
          >
            Share your garden with us
          </h1>
          <p style={{ color: '#5A5A5A' }}>
            Choose a plan, share your garden details, and we&apos;ll send your
            bespoke design within 5 working days.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
          {/* Tier selector */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: '#2C2C2C' }}>
              Choose your plan <span style={{ color: '#7C9A7E' }}>*</span>
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

          {/* Discount code */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#2C2C2C' }}>
              Discount code
              <span className="ml-2 font-normal" style={{ color: '#9A9A8A', fontSize: '0.8rem' }}>
                Optional
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="input-field"
                style={{
                  borderColor:
                    promoStatus === 'valid' ? '#7C9A7E' : promoStatus === 'invalid' ? '#D97777' : '#C9B99A',
                  paddingRight: '6rem',
                }}
              />
              {promoStatus !== 'idle' && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      promoStatus === 'valid' ? '#D4E5D4' : promoStatus === 'invalid' ? '#FEE2E2' : '#EDE9E1',
                    color:
                      promoStatus === 'valid' ? '#2D5A2D' : promoStatus === 'invalid' ? '#991B1B' : '#9A9A8A',
                  }}
                >
                  {promoStatus === 'checking' && 'Checking…'}
                  {promoStatus === 'valid' && '✓ Applied'}
                  {promoStatus === 'invalid' && 'Invalid'}
                </span>
              )}
            </div>
            {promoStatus === 'valid' && appliedPromo && (
              <p className="text-xs mt-2" style={{ color: '#2D5A2D' }}>
                {appliedPromo.label} — new total <strong>{totalLabel}</strong>
              </p>
            )}
            {promoStatus === 'invalid' && promoError && (
              <p className="text-xs mt-2" style={{ color: '#991B1B' }}>
                {promoError}
              </p>
            )}
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Your name" required>
              <input
                name="name"
                type="text"
                required
                placeholder="Jane Smith"
                className="input-field"
              />
            </Field>
            <Field label="Email address" required>
              <input
                name="email"
                type="email"
                required
                placeholder="jane@example.com"
                className="input-field"
              />
            </Field>
          </div>

          {/* Location */}
          <Field label="Garden location" hint="Town, county or postcode" required>
            <input
              name="location"
              type="text"
              required
              placeholder="e.g. Bath, Somerset or BA1 1AA"
              className="input-field"
            />
          </Field>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#2C2C2C' }}>
              Photo of your flower bed <span style={{ color: '#7C9A7E' }}>*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className="rounded-xl border-2 border-dashed cursor-pointer transition-colors p-8 text-center select-none"
              style={{
                borderColor: dragActive ? '#7C9A7E' : '#C9B99A',
                backgroundColor: dragActive ? '#F0F5F0' : '#F7F4EE',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onFileChange}
              />
              {file ? (
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#2C2C2C' }}>
                    {file.name}
                  </p>
                  <p className="text-xs" style={{ color: '#9A9A8A' }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#2C2C2C' }}>
                    Drag &amp; drop your photo here
                  </p>
                  <p className="text-xs" style={{ color: '#9A9A8A' }}>
                    or click to browse · JPEG, PNG, WebP, HEIC · max 20 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Colour preferences */}
          <Field
            label="Colour preferences"
            hint="e.g. soft whites and blues, no reds, anything goes"
          >
            <textarea
              name="color_prefs"
              rows={3}
              placeholder="Describe the colours you love or want to avoid…"
              className="input-field resize-none"
            />
          </Field>

          {/* Plants to avoid */}
          <Field
            label="Plants or flowers to avoid"
            hint="Allergies, dislikes or anything already in the garden"
          >
            <textarea
              name="avoid_plants"
              rows={3}
              placeholder="e.g. no buddleia, avoid highly scented flowers…"
              className="input-field resize-none"
            />
          </Field>

          {/* Comments */}
          <Field label="Anything else we should know?" hint="Optional">
            <textarea
              name="comments"
              rows={3}
              placeholder="Soil type, sun exposure, wildlife garden, low maintenance…"
              className="input-field resize-none"
            />
          </Field>

          {/* Error */}
          {error && (
            <p className="text-sm rounded-lg px-4 py-3" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm" style={{ color: '#9A9A8A' }}>
              Secure payment via Stripe
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2C2C2C', color: '#F7F4EE' }}
            >
              {submitting ? 'Redirecting…' : `Submit & Pay ${totalLabel}`}
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
