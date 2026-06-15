'use client'

import { useState } from 'react'
import { TIERS } from '@/lib/tiers'
import type { GiftCardRow } from '@/lib/gift-cards'

const STATUS_STYLES: Record<GiftCardRow['status'], { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: '#EDE9E1', color: '#9A9A8A' },
  active: { label: 'Active', bg: '#D4E5D4', color: '#2D5A2D' },
  redeemed: { label: 'Redeemed', bg: '#C9B99A', color: '#2C2C2C' },
  refunded: { label: 'Refunded', bg: '#FEE2E2', color: '#991B1B' },
}

export default function GiftCardAdminTable({ giftCards }: { giftCards: GiftCardRow[] }) {
  if (giftCards.length === 0) {
    return (
      <div className="text-center py-24" style={{ color: '#9A9A8A' }}>
        <p className="text-lg mb-2">No gift cards issued yet.</p>
        <p className="text-sm">When someone buys a gift card, it will appear here.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: '#D4C5A9' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: '#EDE9E1', borderBottom: '1px solid #D4C5A9' }}>
            {['Purchased', 'Tier', 'Code', 'Sender', 'Recipient', 'Status', ''].map((h) => (
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
          {giftCards.map((g, i) => (
            <Row
              key={g.id}
              gc={g}
              isLast={i === giftCards.length - 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ gc, isLast }: { gc: GiftCardRow; isLast: boolean }) {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState<null | 'ok' | string>(null)
  const tier = TIERS[gc.tier]
  const status = STATUS_STYLES[gc.status]

  async function resend() {
    setResending(true)
    setResent(null)
    try {
      const res = await fetch(`/api/admin/gift-cards/${gc.id}/resend`, { method: 'POST' })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok && json.ok) {
        setResent('ok')
      } else {
        setResent(json.error ?? 'Failed')
      }
    } catch {
      setResent('Network error')
    } finally {
      setResending(false)
    }
  }

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid #EDE9E1' }}>
      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#9A9A8A' }}>
        {new Date(gc.purchased_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#2C2C2C' }}>
        {tier.shortLabel} · {tier.priceLabel}
      </td>
      <td className="px-4 py-3 font-mono text-xs" style={{ color: '#2C2C2C' }}>{gc.code}</td>
      <td className="px-4 py-3" style={{ color: '#5A5A5A' }}>
        <div className="font-medium" style={{ color: '#2C2C2C' }}>{gc.sender_name}</div>
        <div className="text-xs" style={{ color: '#9A9A8A' }}>{gc.sender_email}</div>
      </td>
      <td className="px-4 py-3" style={{ color: '#5A5A5A' }}>
        <div className="font-medium" style={{ color: '#2C2C2C' }}>{gc.recipient_name}</div>
        <div className="text-xs" style={{ color: '#9A9A8A' }}>{gc.recipient_email}</div>
      </td>
      <td className="px-4 py-3">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {gc.status === 'active' && (
          <button
            onClick={resend}
            disabled={resending}
            className="text-xs px-3 py-1 rounded-full font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
          >
            {resending ? 'Sending…' : resent === 'ok' ? 'Sent ✓' : 'Resend email'}
          </button>
        )}
        {resent && resent !== 'ok' && (
          <p className="text-xs mt-1" style={{ color: '#991B1B' }}>{resent}</p>
        )}
      </td>
    </tr>
  )
}
