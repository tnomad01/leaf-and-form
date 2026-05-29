import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase'
import PortfolioCard from '@/components/PortfolioCard'

export const dynamic = 'force-dynamic'

interface PortfolioItem {
  id: string
  title: string
  location: string
  description: string | null
  blueprint_url: string | null
  final_url: string | null
}

async function getPortfolio(): Promise<PortfolioItem[]> {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('portfolio')
      .select('id, title, location, description, blueprint_url, final_url')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const portfolio = await getPortfolio()
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F4EE', color: '#2C2C2C' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span
          className="text-xl tracking-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
        >
          Leaf &amp; Form
        </span>
        <Link
          href="/submit"
          className="text-sm font-medium px-5 py-2 rounded-full transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
        >
          Submit a Request
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-28 text-center">
        <p
          className="text-xs font-medium mb-6"
          style={{ color: '#7C9A7E', letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          Bespoke Garden Design
        </p>
        <h1
          className="text-5xl sm:text-6xl md:text-7xl leading-tight mb-8 max-w-4xl mx-auto"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
        >
          Beautiful gardens,<br />thoughtfully designed.
        </h1>
        <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: '#5A5A5A' }}>
          Upload a photo of your flower bed and receive a bespoke planting plan
          tailored to your space, soil and style.
        </p>
        <Link
          href="/submit"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#2C2C2C', color: '#F7F4EE' }}
        >
          Submit Your Garden <span aria-hidden>→</span>
        </Link>
        <p className="mt-4 text-sm" style={{ color: '#9A9A8A' }}>
          One-off fee of £25 · No subscription · Designs delivered within 5 days
        </p>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <hr style={{ borderColor: '#D4C5A9' }} />
      </div>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2
          className="text-3xl mb-16 text-center"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
        >
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-5"
                style={{ backgroundColor: '#C9B99A', color: '#2C2C2C' }}
              >
                {i + 1}
              </div>
              <h3
                className="text-xl mb-3"
                style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5A5A5A' }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <hr style={{ borderColor: '#D4C5A9' }} />
      </div>

      {/* Portfolio */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2
          className="text-3xl mb-2 text-center"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
        >
          Our Work
        </h2>
        <p className="text-center text-sm mb-2" style={{ color: '#7C9A7E', letterSpacing: '0.06em' }}>
          Overview → Planting Plan
        </p>
        <p className="text-center text-sm mb-14" style={{ color: '#9A9A8A' }}>
          Each card shows the garden overview. Hover to reveal the detailed planting plan.
        </p>
        {portfolio.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((item) => (
              <PortfolioCard
                key={item.id}
                title={item.title}
                location={item.location}
                description={item.description}
                blueprintUrl={item.blueprint_url}
                finalUrl={item.final_url}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-sm" style={{ color: '#9A9A8A' }}>
            Portfolio coming soon.
          </p>
        )}
      </section>

      {/* CTA Banner */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div
          className="rounded-3xl px-8 py-16 text-center"
          style={{ backgroundColor: '#7C9A7E' }}
        >
          <h2
            className="text-3xl sm:text-4xl mb-4"
            style={{ fontFamily: 'var(--font-playfair)', color: '#F7F4EE' }}
          >
            Ready to transform your garden?
          </h2>
          <p className="mb-8 text-sm" style={{ color: '#D4E5D4' }}>
            Share a photo and your preferences — we&apos;ll handle the rest.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#F7F4EE', color: '#2C2C2C' }}
          >
            Get started for £25 <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6" style={{ borderColor: '#D4C5A9' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <span style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C', fontSize: '1.1rem' }}>
            Leaf &amp; Form
          </span>
          <a
            href="mailto:hello@leafandform.co.uk"
            className="transition-opacity hover:opacity-70"
            style={{ color: '#7C9A7E' }}
          >
            hello@leafandform.co.uk
          </a>
          <p style={{ color: '#9A9A8A', fontSize: '0.75rem' }}>
            © {new Date().getFullYear()} Leaf &amp; Form. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

const steps = [
  {
    title: 'Upload a photo',
    description:
      'Take a clear photograph of your flower bed or garden border. Include any surrounding context — nearby walls, fences or paths — that might be helpful.',
  },
  {
    title: 'Share your preferences',
    description:
      'Tell us your preferred colours, any plants you wish to avoid, your location and any other wishes or constraints for the space.',
  },
  {
    title: 'Receive your design',
    description:
      'Within 5 working days you will receive a tailored planting plan with species names, suggested placement and seasonal care notes.',
  },
]
