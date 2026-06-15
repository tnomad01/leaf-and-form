import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase'
import GiftCardAdminTable from '@/components/GiftCardAdminTable'
import type { GiftCardRow } from '@/lib/gift-cards'

export const metadata = {
  title: 'Gift Cards — Leaf & Form Admin',
}

export const dynamic = 'force-dynamic'

async function getGiftCards(): Promise<GiftCardRow[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .order('purchased_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch gift cards:', error)
    return []
  }
  return (data ?? []) as GiftCardRow[]
}

export default async function AdminGiftCardsPage() {
  const giftCards = await getGiftCards()

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
            <span className="text-sm" style={{ color: '#9A9A8A' }}>
              {giftCards.length} gift {giftCards.length === 1 ? 'card' : 'cards'}
            </span>
            <Link
              href="/admin"
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: '#7C9A7E' }}
            >
              Submissions
            </Link>
            <Link
              href="/admin/portfolio"
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: '#7C9A7E' }}
            >
              Portfolio
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
        <h1
          className="text-3xl mb-8"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
        >
          Gift Cards
        </h1>
        <GiftCardAdminTable giftCards={giftCards} />
      </main>
    </div>
  )
}
