'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PortfolioForm, { PortfolioItem } from '@/components/PortfolioForm'

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PortfolioItem | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/portfolio')
      .then((r) => r.json())
      .then(({ portfolio }) => setItems(portfolio ?? []))
      .finally(() => setLoading(false))
  }, [])

  function handleSaved(item: PortfolioItem) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = item
        return next
      }
      return [...prev, item]
    })
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this portfolio piece?')) return
    setDeleting(id)
    await fetch(`/api/admin/portfolio/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((p) => p.id !== id))
    setDeleting(null)
  }

  async function togglePublished(item: PortfolioItem) {
    const fd = new FormData()
    fd.set('published', item.published ? 'false' : 'true')
    const res = await fetch(`/api/admin/portfolio/${item.id}`, { method: 'PATCH', body: fd })
    const { item: updated } = await res.json()
    if (updated) handleSaved(updated)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F4EE' }}>
      <nav
        className="border-b px-6 py-4"
        style={{ borderColor: '#D4C5A9', backgroundColor: '#F7F4EE' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span
            className="text-xl tracking-tight"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
          >
            Leaf &amp; Form
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: '#7C9A7E' }}
            >
              Submissions
            </Link>
            <Link
              href="/"
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: '#7C9A7E' }}
            >
              View site
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1
            className="text-3xl"
            style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
          >
            Portfolio
          </h1>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="px-5 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
          >
            + Add piece
          </button>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#9A9A8A' }}>Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-24" style={{ color: '#9A9A8A' }}>
            <p className="text-lg mb-2">No portfolio pieces yet.</p>
            <p className="text-sm">Click "Add piece" to create your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden border"
                style={{ borderColor: '#D4C5A9', backgroundColor: '#FDFCF9' }}
              >
                {/* Thumbnail pair */}
                <div className="grid grid-cols-2 gap-0.5" style={{ backgroundColor: '#D4C5A9' }}>
                  <div className="aspect-[4/3] overflow-hidden" style={{ backgroundColor: '#7C9A7E' }}>
                    {item.blueprint_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.blueprint_url} alt="Overview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-xs opacity-50">Overview</span>
                      </div>
                    )}
                  </div>
                  <div className="aspect-[4/3] overflow-hidden" style={{ backgroundColor: '#4A5E4B' }}>
                    {item.final_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.final_url} alt="Detail plan" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-xs opacity-50">Detail</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base font-medium" style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}>
                      {item.title}
                    </h3>
                    <button
                      onClick={() => togglePublished(item)}
                      className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70"
                      style={{
                        backgroundColor: item.published ? '#D4E5D4' : '#EDE9E1',
                        color: item.published ? '#2D5A2D' : '#9A9A8A',
                      }}
                    >
                      {item.published ? 'Live' : 'Hidden'}
                    </button>
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#9A9A8A' }}>{item.location}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditing(item); setShowForm(true) }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#EDE9E1', color: '#2C2C2C' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
                    >
                      {deleting === item.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <PortfolioForm
          item={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
