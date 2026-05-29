'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.85

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { height = Math.round((height / width) * MAX_DIMENSION); width = MAX_DIMENSION }
        else { width = Math.round((width / height) * MAX_DIMENSION); height = MAX_DIMENSION }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file),
        'image/jpeg',
        JPEG_QUALITY
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export interface PortfolioItem {
  id: string
  title: string
  location: string
  description: string | null
  blueprint_url: string | null
  final_url: string | null
  sort_order: number
  published: boolean
}

interface Props {
  item?: PortfolioItem
  onClose: () => void
  onSaved: (item: PortfolioItem) => void
}

const MAX_FILE_BYTES = 10 * 1024 * 1024

function ImageUploadField({
  label,
  fieldName,
  currentUrl,
  file,
  onFile,
}: {
  label: string
  fieldName: string
  currentUrl: string | null
  file: File | null
  onFile: (f: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function handleFile(f: File) {
    if (!f.type.startsWith('image/')) return
    if (f.size > MAX_FILE_BYTES) return
    onFile(f)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const preview = file ? URL.createObjectURL(file) : currentUrl

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#2C2C2C' }}>
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className="rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden"
        style={{
          borderColor: drag ? '#7C9A7E' : '#C9B99A',
          backgroundColor: drag ? '#F0F5F0' : '#F7F4EE',
          aspectRatio: '4/3',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          name={fieldName}
          accept="image/*"
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        {preview ? (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="w-full h-full object-cover" />
            <div
              className="absolute inset-0 flex items-end justify-center pb-3"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}
            >
              <span className="text-white text-xs opacity-80">Click to replace</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm font-medium mb-1" style={{ color: '#2C2C2C' }}>
              Drag &amp; drop or click to upload
            </p>
            <p className="text-xs" style={{ color: '#9A9A8A' }}>
              JPEG, PNG, WebP · max 10 MB
            </p>
          </div>
        )}
      </div>
      {file && (
        <button
          type="button"
          onClick={() => onFile(null)}
          className="mt-1 text-xs hover:underline"
          style={{ color: '#9A9A8A' }}
        >
          Remove
        </button>
      )}
    </div>
  )
}

export default function PortfolioForm({ item, onClose, onSaved }: Props) {
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null)
  const [finalFile, setFinalFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const form = e.currentTarget
    const fd = new FormData(form)

    if (blueprintFile) {
      const compressed = await compressImage(blueprintFile)
      fd.set('blueprint', compressed, compressed.name)
    } else {
      fd.delete('blueprint')
    }

    if (finalFile) {
      const compressed = await compressImage(finalFile)
      fd.set('final', compressed, compressed.name)
    } else {
      fd.delete('final')
    }

    try {
      const url = item ? `/api/admin/portfolio/${item.id}` : '/api/admin/portfolio'
      const method = item ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, body: fd })
      let json: { item?: PortfolioItem; error?: string } = {}
      try { json = await res.json() } catch { /* ignore */ }
      if (!res.ok) { setError(json.error ?? 'Save failed.'); return }
      onSaved(json.item!)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
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
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-opacity hover:opacity-70"
          style={{ backgroundColor: '#EDE9E1', color: '#2C2C2C' }}
          aria-label="Close"
        >
          ✕
        </button>

        <h2
          className="text-2xl mb-6"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
        >
          {item ? 'Edit piece' : 'Add new piece'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C2C' }}>
                Title <span style={{ color: '#7C9A7E' }}>*</span>
              </label>
              <input
                name="title"
                type="text"
                required
                defaultValue={item?.title ?? ''}
                placeholder="e.g. Cottage Border"
                className="pf-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C2C' }}>
                Location <span style={{ color: '#7C9A7E' }}>*</span>
              </label>
              <input
                name="location"
                type="text"
                required
                defaultValue={item?.location ?? ''}
                placeholder="e.g. Somerset"
                className="pf-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C2C' }}>
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={item?.description ?? ''}
              placeholder="Planting notes — species, colours, seasonal interest…"
              className="pf-input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ImageUploadField
              label="Main image — overview (front)"
              fieldName="blueprint"
              currentUrl={item?.blueprint_url ?? null}
              file={blueprintFile}
              onFile={setBlueprintFile}
            />
            <ImageUploadField
              label="Detailed blueprint (back)"
              fieldName="final"
              currentUrl={item?.final_url ?? null}
              file={finalFile}
              onFile={setFinalFile}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C2C' }}>
                Sort order
              </label>
              <input
                name="sort_order"
                type="number"
                defaultValue={item?.sort_order ?? 0}
                className="pf-input"
              />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <input
                type="checkbox"
                id="published"
                name="published"
                value="true"
                defaultChecked={item?.published ?? true}
                className="w-4 h-4 accent-[#7C9A7E]"
              />
              <label htmlFor="published" className="text-sm" style={{ color: '#2C2C2C' }}>
                Published (visible on site)
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm rounded-lg px-4 py-3" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-70"
              style={{ backgroundColor: '#EDE9E1', color: '#2C2C2C' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
            >
              {saving ? 'Saving…' : item ? 'Save changes' : 'Add piece'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .pf-input {
          width: 100%;
          padding: 0.65rem 0.9rem;
          border-radius: 0.75rem;
          border: 1px solid #C9B99A;
          background: #FDFCF9;
          color: #2C2C2C;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.15s;
          font-family: var(--font-inter), system-ui, sans-serif;
        }
        .pf-input:focus {
          border-color: #7C9A7E;
          box-shadow: 0 0 0 3px rgba(124,154,126,0.15);
        }
        .pf-input::placeholder { color: #B0AFA8; }
      `}</style>
    </div>
  )
}
