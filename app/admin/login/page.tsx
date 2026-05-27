'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Invalid password.')
        return
      }
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#F7F4EE' }}
    >
      <div className="w-full max-w-sm">
        <h1
          className="text-3xl mb-2 text-center"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
        >
          Leaf &amp; Form
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: '#9A9A8A' }}>
          Admin access
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C2C' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
              style={{
                borderColor: '#C9B99A',
                backgroundColor: '#FDFCF9',
                color: '#2C2C2C',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#7C9A7E')}
              onBlur={(e) => (e.target.style.borderColor = '#C9B99A')}
            />
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#2C2C2C', color: '#F7F4EE' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
