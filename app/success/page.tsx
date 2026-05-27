import Link from 'next/link'

export const metadata = {
  title: 'Request Received — Leaf & Form',
}

export default function SuccessPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: '#F7F4EE', color: '#2C2C2C' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-8"
        style={{ backgroundColor: '#7C9A7E', color: '#F7F4EE' }}
      >
        ✓
      </div>
      <h1
        className="text-4xl mb-4"
        style={{ fontFamily: 'var(--font-playfair)', color: '#2C2C2C' }}
      >
        Request received
      </h1>
      <p className="text-lg max-w-md mb-3" style={{ color: '#5A5A5A' }}>
        Thank you for submitting your garden. Your payment was successful.
      </p>
      <p className="text-sm max-w-sm mb-10" style={{ color: '#9A9A8A' }}>
        We will review your photo and preferences and send your bespoke planting
        plan to your email within 5 working days.
      </p>
      <Link
        href="/"
        className="text-sm transition-opacity hover:opacity-70"
        style={{ color: '#7C9A7E' }}
      >
        ← Back to Leaf &amp; Form
      </Link>
    </div>
  )
}
