'use client'
import { useState, useCallback } from 'react'
import { syncAllData, type SyncProgress, type SyncResult } from '@/lib/sync'
import { useAppStore } from '@/lib/store'
import { formatUsd } from '@/lib/api'

// ── Pixel progress bar ─────────────────────────────────────────────────────
function PixelProgressBar({ pct }: { pct: number }) {
  return (
    <div className="pixel-progress h-5 w-full">
      <div
        className="pixel-progress-fill h-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Step indicator ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 'exchange', icon: '💱', label: 'EXCHANGE RATES' },
  { id: 'prices',   icon: '◈',  label: 'FLOOR PRICES'  },
  { id: 'nfts',     icon: '★',  label: 'NFT DATA'      },
  { id: 'saving',   icon: '💾',  label: 'SAVING TO DB'  },
  { id: 'done',     icon: '✓',  label: 'COMPLETE'      },
]

function StepRow({ id, icon, label, current, done, error }: {
  id: string; icon: string; label: string
  current: boolean; done: boolean; error: boolean
}) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 border-b border-pixel-border transition-colors ${
      current ? 'bg-pixel-gold/10' : done ? 'bg-pixel-green/5' : ''
    }`}>
      <span className={`text-lg ${
        error   ? 'text-pixel-red'
        : done  ? 'text-pixel-green'
        : current ? 'text-pixel-gold animate-pixel-blink'
        : 'text-pixel-muted opacity-40'
      }`}>
        {error ? '✗' : done ? '✓' : current ? '▶' : '○'}
      </span>
      <span className="text-base">{icon}</span>
      <span className={`font-pixel ${
        error   ? 'text-pixel-red'
        : done  ? 'text-pixel-green'
        : current ? 'text-pixel-gold'
        : 'text-pixel-muted opacity-40'
      }`} style={{ fontSize: '8px' }}>
        {label}
      </span>
      {current && (
        <span className="ml-auto font-pixel text-pixel-gold animate-pixel-blink"
          style={{ fontSize: '7px' }}>SYNCING...</span>
      )}
      {done && !error && (
        <span className="ml-auto font-pixel text-pixel-green" style={{ fontSize: '7px' }}>OK</span>
      )}
    </div>
  )
}

// ── Result summary panel ────────────────────────────────────────────────────
function ResultPanel({ result }: { result: SyncResult }) {
  return (
    <div className={`mt-4 border-2 p-3 ${
      result.success ? 'border-pixel-green bg-pixel-green/10' : 'border-pixel-gold bg-pixel-gold/10'
    }`}>
      <p className={`font-pixel mb-2 ${result.success ? 'text-pixel-green' : 'text-pixel-gold'}`}
        style={{ fontSize: '9px' }}>
        {result.success ? '✓ SYNC COMPLETE' : '⚠ SYNC PARTIAL'}
      </p>
      <div className="space-y-1">
        {result.exchange && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[
              { label: 'SFL',   val: formatUsd(result.exchange.sfl,   4) },
              { label: 'POL',   val: formatUsd(result.exchange.pol,   4) },
              { label: 'GEMS',  val: formatUsd(result.exchange.gems,  4) },
              { label: 'COINS', val: formatUsd(result.exchange.coins, 6) },
            ].map(({ label, val }) => (
              <span key={label} className="font-body text-pixel-text text-lg">
                <span className="text-pixel-gold">{label}:</span> {val}
              </span>
            ))}
          </div>
        )}
        {result.pricesCount != null && (
          <p className="font-body text-pixel-muted text-lg">
            Floor prices: <span className="text-pixel-text">{result.pricesCount} items</span>
          </p>
        )}
        {result.nftsCount != null && (
          <p className="font-body text-pixel-muted text-lg">
            NFT records: <span className="text-pixel-text">{result.nftsCount} items</span>
          </p>
        )}
        {result.errors.length > 0 && (
          <div className="mt-2 border-t border-pixel-border pt-2">
            {result.errors.map((e, i) => (
              <p key={i} className="font-pixel text-pixel-red" style={{ fontSize: '7px' }}>✗ {e}</p>
            ))}
          </div>
        )}
      </div>
      <p className="font-body text-pixel-muted text-base mt-2">
        {result.timestamp.toLocaleTimeString()}
      </p>
    </div>
  )
}

// ── Main SyncModal ──────────────────────────────────────────────────────────
function SyncModal({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState<SyncProgress>({ step: 'idle', label: '', pct: 0 })
  const [result, setResult]     = useState<SyncResult | null>(null)
  const [running, setRunning]   = useState(false)
  const { setExchangeRates, addNotification } = useAppStore()

  const completedSteps = (): string[] => {
    const order = ['exchange', 'prices', 'nfts', 'saving', 'done']
    const idx = order.indexOf(progress.step)
    return idx <= 0 ? [] : order.slice(0, idx)
  }

  const handleSync = useCallback(async () => {
    setRunning(true)
    setResult(null)

    try {
      const res = await syncAllData((p) => setProgress(p))
      setResult(res)

      // Update global price state
      if (res.exchange) {
        setExchangeRates(res.exchange.sfl, res.exchange.pol, res.exchange.gems, res.exchange.coins, res.exchange.coinSfl ?? 0)
      }

      if (res.success) {
        addNotification('success', `Sync done! SFL: $${res.exchange?.sfl.toFixed(4)}`)
      } else if (res.errors.length > 0) {
        addNotification('warning', `Sync partial — ${res.errors.length} error(s)`)
      }
    } catch (e: any) {
      addNotification('error', `Sync failed: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }, [])

  const done = completedSteps()
  const errorSteps = result?.errors
    .map(e => {
      if (e.includes('Exchange')) return 'exchange'
      if (e.includes('Prices'))  return 'prices'
      if (e.includes('NFTs'))    return 'nfts'
      return null
    })
    .filter(Boolean) as string[] ?? []

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => !running && e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md pixel-border-gold bg-pixel-panel">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-4 border-pixel-gold
          bg-gradient-to-r from-pixel-panel to-pixel-bg">
          <div className="flex items-center gap-3">
            <span className={`text-xl ${running ? 'animate-pixel-bounce' : ''}`}>⟳</span>
            <div>
              <h2 className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>
                SYNC MARKET DATA
              </h2>
              <p className="font-body text-pixel-muted text-base">sfl.world API</p>
            </div>
          </div>
          {!running && (
            <button onClick={onClose}
              className="font-pixel text-pixel-muted hover:text-pixel-red text-lg">×</button>
          )}
        </div>

        {/* API sources */}
        <div className="px-4 pt-4 pb-2">
          <p className="font-pixel text-pixel-muted mb-3" style={{ fontSize: '7px' }}>
            DATA SOURCES
          </p>
          <div className="space-y-1 mb-4">
            {[
              { label: 'EXCHANGE', url: 'sfl.world/api/v1.1/exchange', desc: 'SFL · POL · GEMS · COINS prices' },
              { label: 'PRICES',   url: 'sfl.world/api/v1/prices',     desc: 'Floor prices P2P & Sequence' },
              { label: 'NFTS',     url: 'sfl.world/api/v1/nfts',       desc: 'NFT supply & metadata' },
            ].map(src => (
              <div key={src.label} className="flex items-start gap-2 py-1 px-2 bg-pixel-bg border border-pixel-border">
                <span className="font-pixel text-pixel-gold mt-0.5" style={{ fontSize: '6px' }}>◆</span>
                <div>
                  <span className="font-pixel text-pixel-text" style={{ fontSize: '7px' }}>{src.label}</span>
                  <p className="font-mono text-pixel-muted text-xs">{src.url}</p>
                  <p className="font-body text-pixel-muted text-base">{src.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress steps */}
        <div className="border-t-2 border-pixel-border">
          {STEPS.map(step => (
            <StepRow
              key={step.id}
              {...step}
              current={progress.step === step.id}
              done={done.includes(step.id) || (result != null && step.id !== 'idle')}
              error={errorSteps.includes(step.id)}
            />
          ))}
        </div>

        {/* Progress bar */}
        {running && (
          <div className="px-4 py-3 border-t-2 border-pixel-border">
            <div className="flex justify-between mb-1">
              <span className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>
                {progress.label}
              </span>
              <span className="font-pixel text-pixel-gold" style={{ fontSize: '7px' }}>
                {progress.pct}%
              </span>
            </div>
            <PixelProgressBar pct={progress.pct} />
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="px-4 pb-4">
            <ResultPanel result={result} />
          </div>
        )}

        {/* Action button */}
        <div className="px-4 pb-4 pt-2 flex gap-3">
          {!running && !result && (
            <button
              onClick={handleSync}
              className="pixel-btn flex-1 bg-pixel-gold text-pixel-bg font-pixel hover:bg-yellow-300"
              style={{ boxShadow: '4px 4px 0 #c9952a', fontSize: '10px' }}>
              ▶ START SYNC
            </button>
          )}
          {running && (
            <div className="flex-1 flex items-center justify-center py-3">
              <span className="font-pixel text-pixel-gold animate-pixel-blink" style={{ fontSize: '9px' }}>
                ▓▓▓▓▓▓▓▓▓▓ SYNCING...
              </span>
            </div>
          )}
          {result && !running && (
            <>
              <button
                onClick={handleSync}
                className="pixel-btn flex-1 bg-pixel-panel text-pixel-gold font-pixel border-2 border-pixel-gold hover:bg-pixel-gold hover:text-pixel-bg"
                style={{ boxShadow: '3px 3px 0 #c9952a', fontSize: '9px' }}>
                ⟳ SYNC AGAIN
              </button>
              <button
                onClick={onClose}
                className="pixel-btn bg-pixel-green text-white font-pixel border-2 border-pixel-green"
                style={{ boxShadow: '3px 3px 0 #1e7a2e', fontSize: '9px', padding: '8px 16px' }}>
                ✓ CLOSE
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── The actual button (used in TopBar) ────────────────────────────────────
export default function SyncButton() {
  const [open, setOpen] = useState(false)
  const { sflPriceUsd } = useAppStore()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Sync market data from sfl.world"
        className="group flex items-center gap-2 px-3 py-1.5 border-2 border-pixel-gold
          bg-pixel-panel hover:bg-pixel-gold hover:text-pixel-bg
          transition-colors font-pixel"
        style={{ boxShadow: '3px 3px 0 #c9952a', fontSize: '8px' }}>
        <span className="group-hover:animate-pixel-bounce inline-block">⟳</span>
        <span className="hidden sm:inline">SYNC</span>
      </button>

      {open && <SyncModal onClose={() => setOpen(false)} />}
    </>
  )
}
