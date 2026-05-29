'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import PortfolioForm, { PortfolioItem } from '@/components/PortfolioForm'

// ── Batch import parser ──────────────────────────────────────────

interface ParsedRow { title: string; location: string; description: string }

function parseImportText(raw: string): ParsedRow[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []

  const rows: ParsedRow[] = []
  for (const line of lines) {
    // Skip box-drawing border/separator lines (┌┐└┘├┤┬┴┼─)
    if (/[┌┐└┘├┤┬┴┼─━]/.test(line)) continue
    // Skip markdown separator rows like |---|---|
    if (/^\|[\s\-|:]+\|?$/.test(line)) continue

    let parts: string[]

    if (line.includes('│')) {
      // Unicode box-drawing table: │ 1 │ Title │ Location │ Desc │
      parts = line.split('│').map(p => p.trim()).filter((p, i, arr) =>
        !(i === 0 && p === '') && !(i === arr.length - 1 && p === '')
      )
    } else if (line.startsWith('|') || line.endsWith('|')) {
      // Markdown table: | 1 | Title | Location | Desc |
      parts = line.split('|').map(p => p.trim()).filter((p, i, arr) =>
        !(i === 0 && p === '') && !(i === arr.length - 1 && p === '')
      )
    } else if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim())
    } else if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim())
    } else {
      parts = [line.trim()]
    }

    if (!parts.length) continue

    // Skip header rows
    const first = parts[0].toLowerCase()
    if (!first || ['title', '#', 'no', 'no.', 'name'].includes(first)) continue
    if (/^[-:]+$/.test(first)) continue

    // Skip if first column is a row number
    let offset = 0
    if (/^\d+$/.test(parts[0])) offset = 1

    const title = parts[offset] || ''
    if (!title) continue

    rows.push({
      title,
      location: parts[offset + 1] || '',
      description: parts[offset + 2] || '',
    })
  }
  return rows
}

// ── Batch Import Modal ───────────────────────────────────────────

function BatchImportModal({ onClose, onImported }: {
  onClose: () => void
  onImported: (items: PortfolioItem[]) => void
}) {
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const rows = parseImportText(text)

  async function handleImport() {
    if (!rows.length) return
    setImporting(true)
    const created: PortfolioItem[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setProgress(`Creating ${i + 1} of ${rows.length}…`)
      const fd = new FormData()
      fd.set('title', row.title)
      fd.set('location', row.location || 'Location TBC')
      if (row.description) fd.set('description', row.description)
      fd.set('sort_order', String(i))
      const res = await fetch('/api/admin/portfolio', { method: 'POST', body: fd })
      const { item } = await res.json()
      if (item) created.push(item)
    }
    setImporting(false)
    onImported(created)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(44,44,44,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-8 relative"
        style={{ backgroundColor: '#F7F4EE' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-sm hover:opacity-70"
          style={{ backgroundColor: '#EDE9E1', color: '#2C2C2C' }}
        >✕</button>

        <h2 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}>
          Batch import
        </h2>
        <p className="text-sm mb-1" style={{ color: '#9A9A8A' }}>
          Paste from Google Sheets, Excel, or any prompt output. One row per piece.
        </p>
        <p className="text-xs mb-5 px-3 py-2 rounded-lg font-mono" style={{ backgroundColor: '#EDE9E1', color: '#5A5A5A' }}>
          Title | Location | Description (optional)<br />
          — or paste tab-separated rows directly from a spreadsheet
        </p>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder={"Cottage Border\tSomerset\tFoxgloves and salvia in soft purples...\nWildflower Meadow\tWiltshire\tNative species for pollinators..."}
          className="w-full rounded-xl border p-3 text-sm font-mono resize-none outline-none"
          style={{ borderColor: '#C9B99A', backgroundColor: '#FDFCF9', color: '#2C2C2C' }}
        />

        {rows.length > 0 && (
          <div className="mt-4 rounded-xl overflow-hidden border" style={{ borderColor: '#D4C5A9' }}>
            <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider" style={{ backgroundColor: '#EDE9E1', color: '#7C9A7E' }}>
              Preview — {rows.length} {rows.length === 1 ? 'piece' : 'pieces'}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid #EDE9E1' }}>
                  {['Title', 'Location', 'Description'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: '#9A9A8A' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #EDE9E1' : 'none', backgroundColor: '#FDFCF9' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: '#2C2C2C' }}>{r.title}</td>
                    <td className="px-3 py-2" style={{ color: '#5A5A5A' }}>{r.location || <span style={{ color: '#C9B99A' }}>TBC</span>}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: '#9A9A8A' }}>{r.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-70"
            style={{ backgroundColor: '#EDE9E1', color: '#2C2C2C' }}
          >Cancel</button>
          <button
            onClick={handleImport}
            disabled={!rows.length || importing}
            className="px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
          >
            {importing ? progress : `Import ${rows.length || ''} ${rows.length === 1 ? 'piece' : 'pieces'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<PortfolioItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)
  const dragId = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/portfolio')
      .then(r => r.json())
      .then(({ portfolio }) => setItems(portfolio ?? []))
      .finally(() => setLoading(false))
  }, [])

  function handleSaved(item: PortfolioItem) {
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === item.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = item; return next }
      return [...prev, item]
    })
    setShowForm(false)
    setEditing(null)
  }

  function handleImported(newItems: PortfolioItem[]) {
    setItems(prev => [...prev, ...newItems])
    setShowImport(false)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelect() { setSelected(new Set()) }

  async function bulkPublish(publish: boolean) {
    setBulkWorking(true)
    const ids = [...selected]
    await Promise.all(ids.map(id => {
      const fd = new FormData()
      fd.set('published', publish ? 'true' : 'false')
      return fetch(`/api/admin/portfolio/${id}`, { method: 'PATCH', body: fd })
        .then(r => r.json())
        .then(({ item }) => item && handleSaved(item))
    }))
    clearSelect()
    setBulkWorking(false)
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} ${selected.size === 1 ? 'piece' : 'pieces'}?`)) return
    setBulkWorking(true)
    const ids = [...selected]
    await Promise.all(ids.map(id =>
      fetch(`/api/admin/portfolio/${id}`, { method: 'DELETE' })
    ))
    setItems(prev => prev.filter(p => !ids.includes(p.id)))
    clearSelect()
    setBulkWorking(false)
  }

  // ── Drag to reorder ──
  function onDragStart(id: string) { dragId.current = id }

  function onDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault()
    if (!dragId.current || dragId.current === overId) return
    setItems(prev => {
      const from = prev.findIndex(p => p.id === dragId.current)
      const to = prev.findIndex(p => p.id === overId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      next.splice(to, 0, next.splice(from, 1)[0])
      return next
    })
  }

  async function onDragEnd() {
    if (!dragId.current) return
    dragId.current = null
    // Persist new sort_order for every item
    await Promise.all(items.map((item, i) => {
      const fd = new FormData()
      fd.set('sort_order', String(i))
      return fetch(`/api/admin/portfolio/${item.id}`, { method: 'PATCH', body: fd })
    }))
  }

  const anySelected = selected.size > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F4EE' }}>
      <nav className="border-b px-6 py-4" style={{ borderColor: '#D4C5A9', backgroundColor: '#F7F4EE' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl tracking-tight" style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}>
            Leaf &amp; Form
          </span>
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm transition-opacity hover:opacity-70" style={{ color: '#7C9A7E' }}>Submissions</Link>
            <Link href="/" className="text-sm transition-opacity hover:opacity-70" style={{ color: '#7C9A7E' }}>View site</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h1 className="text-3xl" style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}>Portfolio</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#EDE9E1', color: '#2C2C2C' }}
            >
              Batch import
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true) }}
              className="px-5 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
            >
              + Add piece
            </button>
          </div>
        </div>

        {/* Drag hint */}
        {items.length > 1 && !anySelected && (
          <p className="text-xs mb-4" style={{ color: '#9A9A8A' }}>Drag cards to reorder · tick to select for bulk actions</p>
        )}

        {/* Bulk action toolbar */}
        {anySelected && (
          <div
            className="flex items-center gap-3 mb-5 px-5 py-3 rounded-2xl flex-wrap"
            style={{ backgroundColor: '#EDE9E1' }}
          >
            <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>
              {selected.size} selected
            </span>
            <button
              onClick={() => bulkPublish(true)}
              disabled={bulkWorking}
              className="px-4 py-1.5 rounded-full text-xs font-medium hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: '#D4E5D4', color: '#2D5A2D' }}
            >Publish all</button>
            <button
              onClick={() => bulkPublish(false)}
              disabled={bulkWorking}
              className="px-4 py-1.5 rounded-full text-xs font-medium hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: '#F7F4EE', color: '#9A9A8A' }}
            >Hide all</button>
            <button
              onClick={bulkDelete}
              disabled={bulkWorking}
              className="px-4 py-1.5 rounded-full text-xs font-medium hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >Delete all</button>
            <button onClick={clearSelect} className="ml-auto text-xs hover:underline" style={{ color: '#9A9A8A' }}>Cancel</button>
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: '#9A9A8A' }}>Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-24" style={{ color: '#9A9A8A' }}>
            <p className="text-lg mb-2">No portfolio pieces yet.</p>
            <p className="text-sm">Add a single piece or use Batch import to add several at once.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const isSelected = selected.has(item.id)
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(item.id)}
                  onDragOver={e => onDragOver(e, item.id)}
                  onDragEnd={onDragEnd}
                  className="rounded-2xl overflow-hidden border transition-shadow"
                  style={{
                    borderColor: isSelected ? '#7C9A7E' : '#D4C5A9',
                    backgroundColor: '#FDFCF9',
                    boxShadow: isSelected ? '0 0 0 2px #7C9A7E' : 'none',
                    cursor: 'grab',
                  }}
                >
                  {/* Thumbnail pair + select checkbox */}
                  <div className="relative">
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
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className="absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: isSelected ? '#7C9A7E' : 'rgba(255,255,255,0.85)',
                        color: isSelected ? '#fff' : '#9A9A8A',
                        border: isSelected ? 'none' : '1.5px solid #C9B99A',
                      }}
                      aria-label={isSelected ? 'Deselect' : 'Select'}
                    >
                      {isSelected ? '✓' : ''}
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-medium" style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}>
                        {item.title}
                      </h3>
                      <button
                        onClick={() => {
                          const fd = new FormData()
                          fd.set('published', item.published ? 'false' : 'true')
                          fetch(`/api/admin/portfolio/${item.id}`, { method: 'PATCH', body: fd })
                            .then(r => r.json()).then(({ item: u }) => u && handleSaved(u))
                        }}
                        className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium hover:opacity-70"
                        style={{ backgroundColor: item.published ? '#D4E5D4' : '#EDE9E1', color: item.published ? '#2D5A2D' : '#9A9A8A' }}
                      >
                        {item.published ? 'Live' : 'Hidden'}
                      </button>
                    </div>
                    <p className="text-xs mb-3" style={{ color: '#9A9A8A' }}>{item.location}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditing(item); setShowForm(true) }}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                        style={{ backgroundColor: '#EDE9E1', color: '#2C2C2C', cursor: 'pointer' }}
                      >Edit</button>
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this piece?')) return
                          await fetch(`/api/admin/portfolio/${item.id}`, { method: 'DELETE' })
                          setItems(prev => prev.filter(p => p.id !== item.id))
                          setSelected(prev => { const next = new Set(prev); next.delete(item.id); return next })
                        }}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                        style={{ backgroundColor: '#FEE2E2', color: '#991B1B', cursor: 'pointer' }}
                      >Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
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

      {showImport && (
        <BatchImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  )
}
