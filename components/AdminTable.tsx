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
                  {new Date(s.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: '#2C2C2C' }}>
                  {s.name}
                </td>
                <td className="px-4 py-3" style={{ color: '#5A5A5A' }}>
                  <a
                    href={`mailto:${s.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline"
                    style={{ color: '#7C9A7E' }}
                  >
                    {s.email}
                  </a>
                </td>
                <td className="px-4 py-3" style={{ color: '#5A5A5A' }}>
                  {s.location}
                </td>
                <td className="px-4 py-3">
                  <img
                    src={s.photo_url}
                    alt=""
                    className="w-12 h-10 object-cover rounded-lg"
                  />
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
              {new Date(selected.created_at).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <h2
              className="text-2xl mb-6"
              style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
            >
              {selected.name}
            </h2>

            <img
              src={selected.photo_url}
              alt="Garden photo"
              className="w-full rounded-2xl mb-6 object-cover"
              style={{ maxHeight: '320px' }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Detail label="Email">
                <a href={`mailto:${selected.email}`} style={{ color: '#7C9A7E' }}>
                  {selected.email}
                </a>
              </Detail>
              <Detail label="Location">{selected.location}</Detail>
            </div>

            {selected.color_prefs && (
              <Detail label="Colour preferences" block>
                {selected.color_prefs}
              </Detail>
            )}
            {selected.avoid_plants && (
              <Detail label="Plants to avoid" block>
                {selected.avoid_plants}
              </Detail>
            )}
            {selected.comments && (
              <Detail label="Additional comments" block>
                {selected.comments}
              </Detail>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Detail({
  label,
  block,
  children,
}: {
  label: string
  block?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={block ? 'mb-4' : ''}>
      <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: '#9A9A8A', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: '#2C2C2C' }}>
        {children}
      </p>
    </div>
  )
}
