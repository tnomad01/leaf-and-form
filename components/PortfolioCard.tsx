'use client'

import { useState } from 'react'

interface PortfolioCardProps {
  title: string
  location: string
  description: string | null
  blueprintUrl: string | null   // main / overview image — shown on front
  finalUrl: string | null       // detailed blueprint — shown on back
}

function OverviewPlaceholder() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ backgroundColor: '#7C9A7E' }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="rgba(255,255,255,0.18)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
      <div className="relative z-10 text-center px-6">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 opacity-60">
          <rect x="6" y="6" width="28" height="28" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
          <line x1="6" y1="14" x2="34" y2="14" stroke="white" strokeWidth="1"/>
          <line x1="14" y1="6" x2="14" y2="34" stroke="white" strokeWidth="1"/>
          <circle cx="20" cy="23" r="4" stroke="white" strokeWidth="1.5" fill="none"/>
        </svg>
        <p className="text-white text-sm font-medium opacity-70">Garden overview</p>
        <p className="text-white text-xs opacity-40 mt-1">Coming soon</p>
      </div>
    </div>
  )
}

function DetailPlaceholder() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ backgroundColor: '#4A5E4B' }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div className="relative z-10 text-center px-6">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 opacity-50">
          <rect x="5" y="8" width="30" height="24" rx="1.5" stroke="white" strokeWidth="1.5" fill="none"/>
          <line x1="5" y1="14" x2="35" y2="14" stroke="white" strokeWidth="1"/>
          <line x1="14" y1="8" x2="14" y2="32" stroke="white" strokeWidth="0.75" strokeDasharray="2 2"/>
          <line x1="23" y1="8" x2="23" y2="32" stroke="white" strokeWidth="0.75" strokeDasharray="2 2"/>
          <circle cx="19" cy="23" r="3" stroke="white" strokeWidth="1" fill="none"/>
          <circle cx="27" cy="20" r="2" stroke="white" strokeWidth="1" fill="none"/>
        </svg>
        <p className="text-white text-sm font-medium opacity-60">Detailed plan</p>
        <p className="text-white text-xs opacity-35 mt-1">Coming soon</p>
      </div>
    </div>
  )
}

export default function PortfolioCard({
  title,
  location,
  description,
  blueprintUrl,
  finalUrl,
}: PortfolioCardProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      style={{ perspective: '1200px', cursor: 'pointer' }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped((v) => !v)}
    >
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
          aspectRatio: '4 / 3',
          borderRadius: '1rem',
          overflow: 'visible',
        }}
      >
        {/* Front — overview image */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            position: 'absolute',
            inset: 0,
            borderRadius: '1rem',
            overflow: 'hidden',
          }}
        >
          {blueprintUrl ? (
            <img
              src={blueprintUrl}
              alt={`${title} — garden overview`}
              className="w-full h-full object-cover"
            />
          ) : (
            <OverviewPlaceholder />
          )}

          <div className="absolute top-3 left-3">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#C9B99A', color: '#2C2C2C' }}
            >
              Overview
            </span>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between"
            style={{ background: 'linear-gradient(to top, rgba(44,44,44,0.75), transparent)' }}
          >
            <span
              className="text-sm font-medium text-white"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {title}
            </span>
            <span className="text-xs text-white opacity-70">
              Hover to reveal →
            </span>
          </div>
        </div>

        {/* Back — detailed blueprint + planting notes */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            inset: 0,
            borderRadius: '1rem',
            overflow: 'hidden',
          }}
        >
          {finalUrl ? (
            <img
              src={finalUrl}
              alt={`${title} — detailed plan`}
              className="w-full h-full object-cover"
            />
          ) : (
            <DetailPlaceholder />
          )}

          <div className="absolute top-3 left-3">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(44,44,44,0.6)', color: '#F7F4EE' }}
            >
              Planting plan
            </span>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 px-4 pt-8 pb-4"
            style={{ background: 'linear-gradient(to top, rgba(30,45,30,0.95) 60%, transparent)' }}
          >
            <h3
              className="text-white text-lg leading-tight mb-0.5"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {title}
            </h3>
            <p className="text-xs mb-1.5" style={{ color: '#C9B99A' }}>
              {location}
            </p>
            {description && (
              <p className="text-white text-xs leading-relaxed opacity-80 line-clamp-3">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
