'use client'
import { useAppStore } from '@/lib/store'
import type { NotificationItem } from '@/types'
import SyncButton from '@/components/ui/SyncButton'

function NotificationToast({ n, onClose }: { n: NotificationItem; onClose: () => void }) {
  const colors = {
    success: 'border-pixel-green text-pixel-green',
    error:   'border-pixel-red text-pixel-red',
    info:    'border-pixel-blue text-pixel-blue',
    warning: 'border-pixel-gold text-pixel-gold',
  }
  const icons = { success: '✓', error: '✗', info: 'ℹ', warning: '⚠' }
  return (
    <div className={`pixel-card border-2 ${colors[n.type]} flex items-start gap-3 max-w-xs animate-pixel-slide`}>
      <span className="font-pixel text-xs mt-0.5">{icons[n.type]}</span>
      <p className="font-body text-pixel-text text-lg flex-1">{n.message}</p>
      <button onClick={onClose} className="font-pixel text-xs opacity-60 hover:opacity-100">×</button>
    </div>
  )
}

export default function TopBar() {
  const { sidebarOpen, setSidebarOpen, notifications, removeNotification,
          sflPriceUsd, polPriceUsd, gemsPriceUsd, coinsPriceUsd, coinsPriceSfl } = useAppStore()

  const fmt4  = (n: number | null) => n != null ? `$${n.toFixed(4)}`  : '—'
  const fmt6  = (n: number | null) => n != null ? `$${n.toFixed(6)}`  : '—'
  const fmtSfl= (n: number | null) => n != null ? `${n.toFixed(6)} SFL` : '—'

  // Ticker segments — shown in scrolling ticker
  const tickerItems = sflPriceUsd != null ? [
    { label: 'SFL',   value: fmt4(sflPriceUsd),   color: '#f7c948' },
    { label: 'POL',   value: fmt4(polPriceUsd),    color: '#8b5cf6' },
    { label: 'GEM',   value: fmt6(gemsPriceUsd),   color: '#37b74a' },
    { label: 'COIN',  value: fmtSfl(coinsPriceSfl),color: '#7c7f99' },
  ] : []

  return (
    <>
      <header className="bg-pixel-panel border-b-4 border-pixel-gold px-4 py-2 flex items-center gap-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="font-pixel text-pixel-gold text-sm hover:text-yellow-300 lg:hidden">☰</button>

        {/* Price ticker */}
        <div className="flex-1 overflow-hidden">
          {tickerItems.length > 0 ? (
            <div className="ticker-wrap hidden md:block">
              <span className="ticker-content font-mono text-sm">
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i}>
                    <span style={{ color: item.color }}>{item.label}</span>
                    <span className="text-pixel-muted">: {item.value}</span>
                    {i < tickerItems.length * 2 - 1 && <span className="text-pixel-border">  ·  </span>}
                  </span>
                ))}
              </span>
            </div>
          ) : (
            <span className="font-pixel text-pixel-muted hidden md:inline" style={{ fontSize: '8px' }}>
              NO PRICE DATA — PRESS [SYNC] TO FETCH
            </span>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <SyncButton />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-pixel-green pulse-gold inline-block" />
            <span className="font-pixel text-pixel-green hidden sm:inline" style={{ fontSize: '8px' }}>LIVE</span>
          </div>
        </div>
      </header>

      {/* Notification stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((n) => (
          <div key={n.id} className="pointer-events-auto">
            <NotificationToast n={n} onClose={() => removeNotification(n.id)} />
          </div>
        ))}
      </div>
    </>
  )
}
