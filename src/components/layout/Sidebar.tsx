'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore, useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',    icon: '⌂', label: 'DASHBOARD'    },
  { href: '/transactions', icon: '⇄', label: 'TRANSACTIONS'  },
  { href: '/cashflow',     icon: '◈', label: 'CASH FLOW'     },
  { href: '/portfolio',    icon: '◆', label: 'PORTFOLIO'     },
  { href: '/nfts',         icon: '★', label: 'MY NFTS'       },
  { href: '/watchlist',    icon: '◎', label: 'WATCHLIST'     },
]

function SunflowerLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
      <rect x="7" y="1" width="2" height="2" fill="#f7c948"/>
      <rect x="7" y="13" width="2" height="2" fill="#f7c948"/>
      <rect x="1" y="7" width="2" height="2" fill="#f7c948"/>
      <rect x="13" y="7" width="2" height="2" fill="#f7c948"/>
      <rect x="3" y="3" width="2" height="2" fill="#f7c948"/>
      <rect x="11" y="3" width="2" height="2" fill="#f7c948"/>
      <rect x="3" y="11" width="2" height="2" fill="#f7c948"/>
      <rect x="11" y="11" width="2" height="2" fill="#f7c948"/>
      <rect x="5" y="5" width="6" height="6" fill="#8b5e3c"/>
      <rect x="6" y="6" width="4" height="4" fill="#5a3a1a"/>
      <rect x="7" y="15" width="2" height="1" fill="#37b74a"/>
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen, currentFarm, sflPriceUsd } = useAppStore()

  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-30 flex flex-col
        bg-pixel-panel border-r-4 border-pixel-gold
        transition-transform duration-100
        w-52
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:relative lg:translate-x-0
      `}>
        {/* Header */}
        <div className="border-b-4 border-pixel-gold p-4">
          <div className="flex items-center gap-2 mb-1">
            <SunflowerLogo />
            <div>
              <p className="font-pixel text-pixel-gold text-xs leading-tight">SFL</p>
              <p className="font-pixel text-pixel-gold text-xs leading-tight">PORTFOLIO</p>
            </div>
          </div>
          {currentFarm && (
            <div className="mt-2 px-2 py-1 bg-pixel-bg border border-pixel-green text-xs">
              <p className="font-pixel text-pixel-green" style={{ fontSize: '7px' }}>
                FARM #{currentFarm.farm_nft_id}
              </p>
              <p className="font-body text-pixel-text text-base leading-tight">
                {currentFarm.name || 'My Farm'}
              </p>
            </div>
          )}
        </div>

        {/* SFL Price ticker */}
        {sflPriceUsd !== null && (
          <div className="border-b-2 border-pixel-border px-4 py-2 bg-pixel-bg">
            <p className="font-pixel text-pixel-gold glow-gold" style={{ fontSize: '8px' }}>
              SFL: ${sflPriceUsd.toFixed(4)}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 
                  border-l-4 transition-all
                  font-pixel text-xs
                  ${active
                    ? 'border-pixel-gold bg-pixel-gold/10 text-pixel-gold glow-gold'
                    : 'border-transparent text-pixel-muted hover:border-pixel-border hover:text-pixel-text hover:bg-white/5'
                  }
                `}
                style={{ fontSize: '9px' }}>
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
                {active && <span className="ml-auto animate-pixel-blink">◄</span>}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t-4 border-pixel-border p-4">
          {user && (
            <div className="mb-3">
              <p className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>LOGGED IN AS</p>
              <p className="font-body text-pixel-text text-lg leading-tight truncate">
                {user.name || user.email}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="pixel-btn w-full bg-pixel-panel border-2 border-pixel-red text-pixel-red
              hover:bg-pixel-red hover:text-white text-center"
            style={{ boxShadow: '2px 2px 0 #8b1a1a', fontSize: '9px' }}>
            [ LOGOUT ]
          </button>
        </div>
      </aside>
    </>
  )
}
