'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

// ── Pixel Sunflower SVG sprite ────────────────────────────────────────────
function SunflowerSprite() {
  return (
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}>
      {/* Petals */}
      <rect x="7" y="1" width="2" height="3" fill="#f7c948"/>
      <rect x="7" y="12" width="2" height="3" fill="#f7c948"/>
      <rect x="1" y="7" width="3" height="2" fill="#f7c948"/>
      <rect x="12" y="7" width="3" height="2" fill="#f7c948"/>
      <rect x="3" y="3" width="2" height="2" fill="#f7c948"/>
      <rect x="11" y="3" width="2" height="2" fill="#f7c948"/>
      <rect x="3" y="11" width="2" height="2" fill="#f7c948"/>
      <rect x="11" y="11" width="2" height="2" fill="#f7c948"/>
      {/* Center */}
      <rect x="5" y="5" width="6" height="6" fill="#8b5e3c"/>
      <rect x="6" y="6" width="4" height="4" fill="#5a3a1a"/>
      {/* Seeds */}
      <rect x="6" y="6" width="1" height="1" fill="#8b5e3c"/>
      <rect x="8" y="6" width="1" height="1" fill="#8b5e3c"/>
      <rect x="7" y="7" width="1" height="1" fill="#8b5e3c"/>
      <rect x="6" y="8" width="1" height="1" fill="#8b5e3c"/>
      <rect x="8" y="8" width="1" height="1" fill="#8b5e3c"/>
      {/* Stem */}
      <rect x="7" y="15" width="2" height="1" fill="#37b74a"/>
    </svg>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login, register } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-pixel-bg flex flex-col items-center justify-center px-4"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(247,201,72,0.06) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(55,183,74,0.06) 0%, transparent 50%)
        `
      }}>

      {/* Stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-white opacity-40 animate-pixel-blink"
            style={{
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 23 + 7) % 100}%`,
              animationDelay: `${(i * 0.3) % 2}s`,
              animationDuration: `${1 + (i % 3) * 0.5}s`,
            }} />
        ))}
      </div>

      {/* Logo */}
      <div className="mb-8 text-center animate-float">
        <div className="flex justify-center mb-3">
          <SunflowerSprite />
        </div>
        <h1 className="font-pixel text-pixel-gold text-lg glow-gold leading-relaxed">
          SFL
        </h1>
        <h2 className="font-pixel text-pixel-gold text-sm glow-gold">
          PORTFOLIO
        </h2>
        <p className="font-body text-pixel-muted text-xl mt-2 tracking-widest">
          SUNFLOWER LAND TRACKER
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md pixel-border-gold bg-pixel-panel p-0">
        {/* Tab header */}
        <div className="flex border-b-2 border-pixel-gold">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 font-pixel text-xs py-3 px-4 transition-colors ${
              mode === 'login'
                ? 'bg-pixel-gold text-pixel-bg'
                : 'text-pixel-muted hover:text-pixel-gold'
            }`}>
            [ LOGIN ]
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 font-pixel text-xs py-3 px-4 transition-colors ${
              mode === 'register'
                ? 'bg-pixel-gold text-pixel-bg'
                : 'text-pixel-muted hover:text-pixel-gold'
            }`}>
            [ REGISTER ]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="font-pixel text-xs text-pixel-muted block mb-2">PLAYER NAME</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="pixel-input"
                placeholder="Farmer_001"
                required
              />
            </div>
          )}

          <div>
            <label className="font-pixel text-xs text-pixel-muted block mb-2">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pixel-input"
              placeholder="farmer@example.com"
              required
            />
          </div>

          <div>
            <label className="font-pixel text-xs text-pixel-muted block mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pixel-input"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="pixel-border-red bg-pixel-bg p-3">
              <p className="font-pixel text-pixel-red text-xs">⚠ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="pixel-btn w-full bg-pixel-gold text-pixel-bg font-pixel text-xs
              hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            style={{ boxShadow: '4px 4px 0 #c9952a' }}>
            {loading ? '▓▓▓▓▓▓▓▓▓▓' : mode === 'login' ? '▶ ENTER FARM' : '▶ CREATE ACCOUNT'}
          </button>
        </form>

        {/* Footer hint */}
        <div className="border-t-2 border-pixel-border px-6 py-3">
          <p className="font-body text-pixel-muted text-lg text-center tracking-wide">
            {mode === 'login'
              ? 'NEW PLAYER? PRESS [REGISTER]'
              : 'RETURNING? PRESS [LOGIN]'}
          </p>
        </div>
      </div>

      <p className="mt-6 font-pixel text-xs text-pixel-muted opacity-40">
        v0.1.0 · SUNFLOWER LAND · POLYGON
      </p>
    </div>
  )
}
