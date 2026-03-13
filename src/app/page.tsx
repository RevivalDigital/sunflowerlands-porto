'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import pb from '@/lib/pb'

// ── Pixel art components ──────────────────────────────────────────────────
function SunflowerSprite({ size = 64 }: { size?: number }) {
  const s = size / 16
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}>
      <rect x="7" y="1" width="2" height="3" fill="#f7c948"/>
      <rect x="7" y="12" width="2" height="3" fill="#f7c948"/>
      <rect x="1" y="7" width="3" height="2" fill="#f7c948"/>
      <rect x="12" y="7" width="3" height="2" fill="#f7c948"/>
      <rect x="3" y="3" width="2" height="2" fill="#f7c948"/>
      <rect x="11" y="3" width="2" height="2" fill="#f7c948"/>
      <rect x="3" y="11" width="2" height="2" fill="#f7c948"/>
      <rect x="11" y="11" width="2" height="2" fill="#f7c948"/>
      <rect x="5" y="5" width="6" height="6" fill="#8b5e3c"/>
      <rect x="6" y="6" width="4" height="4" fill="#5a3a1a"/>
      <rect x="6" y="6" width="1" height="1" fill="#8b5e3c"/>
      <rect x="8" y="6" width="1" height="1" fill="#8b5e3c"/>
      <rect x="7" y="7" width="1" height="1" fill="#8b5e3c"/>
      <rect x="6" y="8" width="1" height="1" fill="#8b5e3c"/>
      <rect x="8" y="8" width="1" height="1" fill="#8b5e3c"/>
      <rect x="7" y="15" width="2" height="1" fill="#37b74a"/>
    </svg>
  )
}

function CoinSprite() {
  return (
    <svg width="32" height="32" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="0" width="4" height="1" fill="#f7c948"/>
      <rect x="1" y="1" width="6" height="1" fill="#f7c948"/>
      <rect x="0" y="2" width="8" height="4" fill="#f7c948"/>
      <rect x="1" y="6" width="6" height="1" fill="#f7c948"/>
      <rect x="2" y="7" width="4" height="1" fill="#f7c948"/>
      <rect x="3" y="2" width="2" height="4" fill="#c9952a"/>
      <rect x="2" y="3" width="4" height="2" fill="#c9952a"/>
    </svg>
  )
}

function ChartSprite() {
  return (
    <svg width="48" height="32" viewBox="0 0 12 8" xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}>
      <rect x="0" y="7" width="12" height="1" fill="#3d4052"/>
      <rect x="1" y="5" width="2" height="2" fill="#37b74a"/>
      <rect x="4" y="3" width="2" height="4" fill="#37b74a"/>
      <rect x="7" y="1" width="2" height="6" fill="#f7c948"/>
      <rect x="10" y="4" width="2" height="3" fill="#e53535"/>
    </svg>
  )
}

function NftSprite() {
  return (
    <svg width="40" height="40" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}>
      <rect x="1" y="0" width="8" height="1" fill="#8b5cf6"/>
      <rect x="0" y="1" width="10" height="8" fill="#2d2f3e"/>
      <rect x="1" y="9" width="8" height="1" fill="#8b5cf6"/>
      <rect x="3" y="3" width="4" height="4" fill="#8b5cf6"/>
      <rect x="4" y="4" width="2" height="2" fill="#c4b5fd"/>
      <rect x="1" y="1" width="1" height="1" fill="#8b5cf6"/>
      <rect x="8" y="1" width="1" height="1" fill="#8b5cf6"/>
      <rect x="1" y="8" width="1" height="1" fill="#8b5cf6"/>
      <rect x="8" y="8" width="1" height="1" fill="#8b5cf6"/>
    </svg>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color }: {
  icon: React.ReactNode
  title: string
  desc: string
  color: string
}) {
  return (
    <div className="bg-pixel-panel border-2 p-5 flex flex-col gap-3 hover:scale-105 transition-transform duration-200"
      style={{ borderColor: color, boxShadow: `4px 4px 0 #000` }}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-pixel leading-relaxed" style={{ fontSize: '9px', color }}>{title}</span>
      </div>
      <p className="font-body text-pixel-muted text-lg leading-snug">{desc}</p>
    </div>
  )
}

// ── Stat badge ────────────────────────────────────────────────────────────
function StatBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center px-4 py-3 bg-pixel-panel border-2 border-pixel-border"
      style={{ boxShadow: '3px 3px 0 #000' }}>
      <div className="font-pixel text-sm" style={{ color }}>{value}</div>
      <div className="font-body text-pixel-muted text-base mt-1 tracking-widest">{label}</div>
    </div>
  )
}

// ── Main landing page ─────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // If already logged in → go straight to dashboard
    if (pb.authStore.isValid) {
      router.replace('/dashboard')
    } else {
      setChecking(false)
    }
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-pixel-bg flex items-center justify-center">
        <p className="font-pixel text-pixel-gold text-xs animate-pixel-blink">LOADING...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pixel-bg overflow-x-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 15% 85%, rgba(247,201,72,0.05) 0%, transparent 50%),
          radial-gradient(circle at 85% 15%, rgba(55,183,74,0.05) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(139,92,246,0.03) 0%, transparent 60%)
        `
      }}>

      {/* CRT scanlines */}
      <div className="crt-overlay" aria-hidden />

      {/* Pixel stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute bg-white opacity-30 animate-pixel-blink"
            style={{
              width: i % 5 === 0 ? '2px' : '1px',
              height: i % 5 === 0 ? '2px' : '1px',
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 23 + 7) % 100}%`,
              animationDelay: `${(i * 0.27) % 3}s`,
              animationDuration: `${1.5 + (i % 4) * 0.4}s`,
            }} />
        ))}
      </div>

      {/* ── NAV ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b-2 border-pixel-border bg-pixel-panel/80">
        <div className="flex items-center gap-3">
          <SunflowerSprite size={32} />
          <div>
            <span className="font-pixel text-pixel-gold glow-gold" style={{ fontSize: '10px' }}>SFL</span>
            <span className="font-pixel text-pixel-text ml-2" style={{ fontSize: '10px' }}>PORTFOLIO</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/auth')}
            className="font-pixel text-pixel-muted hover:text-pixel-text border border-pixel-border px-4 py-2 hover:border-pixel-gold transition-colors"
            style={{ fontSize: '8px' }}>
            LOGIN
          </button>
          <button onClick={() => router.push('/auth')}
            className="font-pixel bg-pixel-gold text-pixel-bg px-4 py-2 hover:bg-yellow-300 transition-colors"
            style={{ fontSize: '8px', boxShadow: '3px 3px 0 #c9952a' }}>
            ▶ START
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16">
        <div className="animate-float mb-6">
          <SunflowerSprite size={96} />
        </div>

        <h1 className="font-pixel text-pixel-gold glow-gold leading-loose mb-2"
          style={{ fontSize: 'clamp(18px, 4vw, 32px)' }}>
          SFL PORTFOLIO
        </h1>
        <p className="font-pixel text-pixel-muted mb-6" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>
          SUNFLOWER LAND TRACKER
        </p>

        <p className="font-body text-pixel-text text-xl max-w-xl leading-relaxed mb-8 opacity-80">
          Track your Sunflower Land transactions, NFT holdings, cash flow, and portfolio value — all in one pixel-perfect dashboard.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <button onClick={() => router.push('/auth')}
            className="font-pixel bg-pixel-gold text-pixel-bg px-8 py-4 hover:bg-yellow-300 transition-all hover:scale-105"
            style={{ fontSize: '10px', boxShadow: '4px 4px 0 #c9952a' }}>
            ▶ ENTER FARM
          </button>
          <button onClick={() => router.push('/auth')}
            className="font-pixel border-2 border-pixel-green text-pixel-green px-8 py-4 hover:bg-pixel-green/10 transition-all hover:scale-105"
            style={{ fontSize: '10px', boxShadow: '4px 4px 0 #000' }}>
            + CREATE ACCOUNT
          </button>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 justify-center">
          <StatBadge value="4 APIs" label="LIVE PRICES" color="#f7c948" />
          <StatBadge value="SFL·POL" label="SUPPORTED" color="#8b5cf6" />
          <StatBadge value="NFT+ITEM" label="TRACKER" color="#37b74a" />
          <StatBadge value="FREE" label="OPEN ACCESS" color="#37b74a" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 px-6 pb-16 max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-10">
          <div className="inline-block border-b-2 border-pixel-gold px-6 pb-2">
            <span className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>◈ FEATURES</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon={<ChartSprite />}
            title="PORTFOLIO DASHBOARD"
            desc="Visualize your SFL portfolio value, P&L over time, and asset allocation with pixel-art charts."
            color="#f7c948"
          />
          <FeatureCard
            icon={<CoinSprite />}
            title="TRANSACTION LOG"
            desc="Record every buy, sell, earn, and spend with live SFL/POL/GEM/COIN price auto-fill and market fee calculator."
            color="#37b74a"
          />
          <FeatureCard
            icon={<NftSprite />}
            title="NFT HOLDINGS"
            desc="Track your collectibles and wearables with live floor prices, supply data, and boost info from SFL World API."
            color="#8b5cf6"
          />
          <FeatureCard
            icon={<span style={{ fontSize: '24px' }}>◈</span>}
            title="CASH FLOW TRACKER"
            desc="Monthly inflow/outflow breakdown with auto-generated entries from transactions and 6-month bar chart overview."
            color="#37b74a"
          />
          <FeatureCard
            icon={<span style={{ fontSize: '24px' }}>★</span>}
            title="WATCHLIST"
            desc="Set target prices for NFTs and items. Get notified when floor price hits your target with real-time comparison."
            color="#f7c948"
          />
          <FeatureCard
            icon={<span style={{ fontSize: '24px' }}>⟳</span>}
            title="LIVE PRICE SYNC"
            desc="One-click sync fetches SFL, POL, Gems, Coins exchange rates plus item and NFT floor prices from sfl.world."
            color="#f7c948"
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 px-6 pb-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-block border-b-2 border-pixel-gold px-6 pb-2">
            <span className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>▶ HOW IT WORKS</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {[
            { step: '01', title: 'CREATE ACCOUNT', desc: 'Register with email and password. Add your farm ID to link your Sunflower Land farm.', color: '#f7c948' },
            { step: '02', title: 'SYNC PRICES', desc: 'Press SYNC to fetch live SFL, POL, Gems, and item floor prices from SFL World API.', color: '#37b74a' },
            { step: '03', title: 'LOG TRANSACTIONS', desc: 'Record your buys, sells, NFT trades. Market fees and cash flows are calculated automatically.', color: '#8b5cf6' },
            { step: '04', title: 'TRACK PORTFOLIO', desc: 'Monitor your NFT holdings, set watchlist targets, and view monthly cash flow reports.', color: '#f7c948' },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="flex gap-4 items-start bg-pixel-panel border-2 border-pixel-border p-4"
              style={{ boxShadow: '3px 3px 0 #000' }}>
              <div className="font-pixel flex-shrink-0 w-10 text-center" style={{ fontSize: '14px', color }}>
                {step}
              </div>
              <div>
                <div className="font-pixel mb-1" style={{ fontSize: '8px', color }}>{title}</div>
                <p className="font-body text-pixel-muted text-lg leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section className="relative z-10 px-6 pb-20 text-center">
        <div className="max-w-lg mx-auto bg-pixel-panel border-2 border-pixel-gold p-8"
          style={{ boxShadow: '6px 6px 0 #c9952a' }}>
          <SunflowerSprite size={48} />
          <h2 className="font-pixel text-pixel-gold glow-gold mt-4 mb-2 leading-relaxed" style={{ fontSize: '12px' }}>
            READY TO TRACK?
          </h2>
          <p className="font-body text-pixel-muted text-xl mb-6">
            Free to use. No wallet connection required.
          </p>
          <button onClick={() => router.push('/auth')}
            className="font-pixel bg-pixel-gold text-pixel-bg px-10 py-4 hover:bg-yellow-300 transition-all hover:scale-105 w-full"
            style={{ fontSize: '10px', boxShadow: '4px 4px 0 #c9952a' }}>
            ▶ GET STARTED — IT'S FREE
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t-2 border-pixel-border px-6 py-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-6 mb-3">
          <span className="font-pixel text-pixel-muted opacity-40" style={{ fontSize: '7px' }}>
            SFL PORTFOLIO v0.1.0
          </span>
          <span className="font-pixel text-pixel-muted opacity-40" style={{ fontSize: '7px' }}>
            SUNFLOWER LAND · POLYGON
          </span>
          <span className="font-pixel text-pixel-muted opacity-40" style={{ fontSize: '7px' }}>
            PRICES BY SFL.WORLD
          </span>
        </div>
        <p className="font-body text-pixel-muted opacity-30 text-base">
          NOT AFFILIATED WITH SUNFLOWER LAND. FAN-MADE TOOL.
        </p>
      </footer>
    </div>
  )
}
