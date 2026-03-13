'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import pb from '@/lib/pb'
import { useAuthStore, useAppStore } from '@/lib/store'
import { fetchExchangeRates } from '@/lib/api'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { refreshAuth } = useAuthStore()
  const { setExchangeRates, setFarms, setCurrentFarm } = useAppStore()
  const initialized = useRef(false)

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (initialized.current) return
    initialized.current = true

    refreshAuth()
    if (!pb.authStore.isValid) {
      router.replace('/auth')
      return
    }

    // Load farms — pass { requestKey: null } to skip auto-cancel per request
    const loadFarms = async () => {
      try {
        const farms = await pb.collection('farms').getFullList({
          filter: 'is_active=true',
          requestKey: null,   // disable per-request auto-cancel
        })
        setFarms(farms as any)
        if (farms.length > 0) setCurrentFarm(farms[0] as any)
      } catch (e: any) {
        if (e?.isAbort) return   // silently ignore genuine aborts
        console.warn('loadFarms:', e?.message)
      }
    }

    // Fetch live prices from SFL World exchange API
    const loadPrices = async () => {
      try {
        const data = await fetchExchangeRates()
        // API: { sfl:{usd,...}, pol:{usd,...}, gems:{"100":{gem,usd,sfl},...}, coins:{"160":{coin,sfl,usd},...} }
        const sfl  = typeof data?.sfl?.usd === 'number' ? data.sfl.usd : 0
        const pol  = typeof data?.pol?.usd === 'number' ? data.pol.usd : 0
        // gems: price per 1 gem from smallest pack (100 gems)
        const gemPacks = data?.gems ? Object.values(data.gems) as any[] : []
        gemPacks.sort((a: any, b: any) => a.gem - b.gem)
        const gemUsd = gemPacks.length > 0 ? gemPacks[0].usd / gemPacks[0].gem : 0
        // coins: SFL per 1 coin from smallest pack (160 coins)
        const coinPacks = data?.coins ? Object.values(data.coins) as any[] : []
        coinPacks.sort((a: any, b: any) => a.coin - b.coin)
        const coinSfl    = coinPacks.length > 0 ? coinPacks[0].sfl / coinPacks[0].coin : 0
        const coinUsd    = coinSfl * sfl
        if (sfl > 0 || pol > 0) setExchangeRates(sfl, pol, gemUsd, coinUsd, coinSfl)
      } catch (e: any) {
        if (e?.isAbort) return
        console.warn('loadPrices:', e?.message)
      }
    }

    loadFarms()
    loadPrices()

    const interval = setInterval(loadPrices, 60_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen overflow-hidden bg-pixel-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
