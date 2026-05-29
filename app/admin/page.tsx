import { createSupabaseServerClient } from '@/lib/supabase'
import AdminTable, { Submission } from '@/components/AdminTable'
import Link from 'next/link'

export const metadata = {
  title: 'Admin — Leaf & Form',
}

export const dynamic = 'force-dynamic'

async function getSubmissions(): Promise<Submission[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch submissions:', error)
    return []
  }
  return data as Submission[]
}

export default async function AdminPage() {
  const submissions = await getSubmissions()

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
              {submissions.length} paid {submissions.length === 1 ? 'submission' : 'submissions'}
            </span>
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
          Submissions
        </h1>
        <AdminTable submissions={submissions} />
      </main>
    </div>
  )
}
