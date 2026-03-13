'use client'
import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import pb from '@/lib/pb'
import { col } from '@/lib/pb'
import { useAppStore } from '@/lib/store'
import { formatUsd, formatSfl, pnlColor } from '@/lib/api'
import { StatCard, PixelCard, PageHeader, PixelLoading, PixelBadge } from '@/components/ui'
import type { Transaction, CashFlow, Portfolio } from '@/types'
import { format, subMonths, startOfMonth } from 'date-fns'

// Pixel-styled tooltip for Recharts
function PixelTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="pixel-border-gold bg-pixel-panel p-3">
      <p className="font-pixel text-pixel-gold mb-1" style={{ fontSize: '8px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-body text-lg" style={{ color: p.color }}>
          {p.name}: {formatUsd(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function DashboardContent() {
  const { currentFarm, sflPriceUsd, polPriceUsd } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [monthlyCf, setMonthlyCf] = useState<any[]>([])
  const [latestPort, setLatestPort] = useState<Portfolio | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        // Portfolio snapshots for chart (last 6 months)
        const ports = await col('portfolios').getList(1, 12, {
          sort: '-snapshot_date',
          filter: currentFarm ? `farm_id="${currentFarm.id}"` : '',
        })
        const portItems = ports.items as unknown as Portfolio[]
        setPortfolios([...portItems].reverse())
        if (portItems.length > 0) setLatestPort(portItems[0])

        // Recent transactions
        const txs = await col('transactions').getList(1, 8, {
          sort: '-transaction_date',
          filter: currentFarm ? `farm_id="${currentFarm.id}"` : '',
        })
        setRecentTx(txs.items as unknown as Transaction[])

        // Monthly cash flow for last 6 months
        const cfData: any[] = []
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i)
          const yr = d.getFullYear()
          const mo = d.getMonth() + 1
          const cfs = await col('cash_flows').getFullList({
            filter: `period_year=${yr} && period_month=${mo}${currentFarm ? ` && farm_id="${currentFarm.id}"` : ''}`,
          }) as unknown as CashFlow[]
          const inflow  = cfs.filter(c => c.direction === 'inflow').reduce((s, c) => s + c.amount_usd, 0)
          const outflow = cfs.filter(c => c.direction === 'outflow').reduce((s, c) => s + c.amount_usd, 0)
          cfData.push({ month: format(d, 'MMM'), inflow, outflow, net: inflow - outflow })
        }
        setMonthlyCf(cfData)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentFarm])

  if (loading) return <PixelLoading message="LOADING FARM DATA..." />

  const totalPnl = monthlyCf.reduce((s, m) => s + m.net, 0)
  const lastMonth = monthlyCf[monthlyCf.length - 1]

  const TX_ICONS: Record<string, string> = {
    buy_nft: '▼', sell_nft: '▲', buy_sfl: '▼', sell_sfl: '▲',
    earn_sfl: '★', spend_sfl: '◆', buy_gems: '◇', swap: '⇄',
    transfer_in: '→', transfer_out: '←', other: '?',
  }
  const TX_COLORS: Record<string, string> = {
    buy_nft:'text-pixel-red', sell_nft:'text-pixel-green', buy_sfl:'text-pixel-red',
    sell_sfl:'text-pixel-green', earn_sfl:'text-pixel-gold', spend_sfl:'text-pixel-muted',
    buy_gems:'text-pixel-purple', swap:'text-pixel-blue',
    transfer_in:'text-pixel-green', transfer_out:'text-pixel-red', other:'text-pixel-muted',
  }

  return (
    <div>
      <PageHeader icon="⌂" title="DASHBOARD"
        subtitle={currentFarm ? `FARM #${currentFarm.farm_nft_id} · ${currentFarm.name || ''}` : 'ALL FARMS'}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="TOTAL VALUE"
          value={formatUsd(latestPort?.total_value_usd)}
          sub={latestPort ? `Updated ${format(new Date(latestPort.snapshot_date), 'dd MMM')}` : 'No snapshot yet'}
          icon="◆"
          variant="gold"
        />
        <StatCard
          label="SFL BALANCE"
          value={formatSfl(latestPort?.sfl_balance) + ' SFL'}
          sub={latestPort && sflPriceUsd ? formatUsd((latestPort.sfl_balance || 0) * sflPriceUsd) : undefined}
          icon="🌻"
          variant="green"
        />
        <StatCard
          label="6M NET P&L"
          value={formatUsd(totalPnl)}
          sub={totalPnl >= 0 ? 'PROFITABLE ▲' : 'LOSS ▼'}
          icon={totalPnl >= 0 ? '▲' : '▼'}
          variant={totalPnl >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="THIS MONTH"
          value={formatUsd(lastMonth?.net || 0)}
          sub={`IN: ${formatUsd(lastMonth?.inflow || 0)} · OUT: ${formatUsd(lastMonth?.outflow || 0)}`}
          icon="◈"
          variant={lastMonth?.net >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Portfolio value chart */}
        <div className="lg:col-span-2">
          <PixelCard title="◆ PORTFOLIO VALUE HISTORY" variant="gold">
            {portfolios.length < 2 ? (
              <div className="flex items-center justify-center h-40">
                <p className="font-pixel text-pixel-muted" style={{ fontSize: '9px' }}>
                  ADD PORTFOLIO SNAPSHOTS TO SEE CHART
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={portfolios}>
                  <defs>
                    <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f7c948" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f7c948" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="snapshot_date"
                    tickFormatter={v => format(new Date(v), 'dd/MM')}
                    tick={{ fill: '#7c7f99', fontSize: 10, fontFamily: 'VT323' }}
                    axisLine={{ stroke: '#3d4052' }} tickLine={false}
                  />
                  <YAxis
                    tickFormatter={v => '$' + (v/1000).toFixed(1) + 'k'}
                    tick={{ fill: '#7c7f99', fontSize: 10, fontFamily: 'VT323' }}
                    axisLine={false} tickLine={false} width={50}
                  />
                  <Tooltip content={<PixelTooltip />} />
                  <Area
                    type="stepAfter" dataKey="total_value_usd" name="VALUE"
                    stroke="#f7c948" strokeWidth={2} fill="url(#valGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </PixelCard>
        </div>

        {/* Token balances */}
        <PixelCard title="◆ ASSET BREAKDOWN" variant="default">
          {latestPort ? (
            <div className="space-y-3">
              {[
                { label: 'SFL', value: latestPort.sfl_balance || 0, usd: (latestPort.sfl_balance||0)*(sflPriceUsd||0), color: '#f7c948' },
                { label: 'POL', value: latestPort.pol_balance || 0, usd: (latestPort.pol_balance||0)*(polPriceUsd||0), color: '#8b5cf6' },
                { label: 'GEMS', value: latestPort.gems_balance || 0, usd: 0, color: '#4e9af1' },
                { label: 'COINS', value: latestPort.coins_balance || 0, usd: 0, color: '#37b74a' },
                { label: 'NFTs', value: latestPort.total_nft_value_sfl || 0, usd: (latestPort.total_nft_value_sfl||0)*(sflPriceUsd||0), color: '#f87171' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="font-pixel" style={{ fontSize: '8px', color: item.color }}>{item.label}</span>
                    <span className="font-body text-pixel-text text-base">{formatSfl(item.value)}</span>
                  </div>
                  <div className="pixel-progress h-3">
                    <div className="pixel-progress-fill" style={{
                      width: `${Math.min(100, (item.usd / (latestPort.total_value_usd || 1)) * 100)}%`,
                      background: item.color,
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-pixel-muted text-lg text-center py-8">NO SNAPSHOT DATA</p>
          )}
        </PixelCard>
      </div>

      {/* Cash flow bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <PixelCard title="◈ MONTHLY CASH FLOW" variant="default">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyCf} barGap={2}>
              <XAxis dataKey="month" tick={{ fill: '#7c7f99', fontSize: 10, fontFamily: 'VT323' }}
                axisLine={{ stroke: '#3d4052' }} tickLine={false} />
              <YAxis tickFormatter={v => '$' + v} tick={{ fill: '#7c7f99', fontSize: 10, fontFamily: 'VT323' }}
                axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<PixelTooltip />} />
              <Bar dataKey="inflow"  name="INFLOW"  fill="#37b74a" />
              <Bar dataKey="outflow" name="OUTFLOW" fill="#e53535" />
            </BarChart>
          </ResponsiveContainer>
        </PixelCard>

        {/* Recent Transactions */}
        <PixelCard title="⇄ RECENT TRANSACTIONS" variant="default">
          {recentTx.length === 0 ? (
            <p className="font-body text-pixel-muted text-lg text-center py-8">NO TRANSACTIONS YET</p>
          ) : (
            <div className="space-y-2">
              {recentTx.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-2 py-2 border-b border-pixel-border">
                  <span className={`font-pixel text-sm ${TX_COLORS[tx.transaction_type] || 'text-pixel-muted'}`}>
                    {TX_ICONS[tx.transaction_type] || '?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-pixel truncate" style={{ fontSize: '8px' }}>
                      {tx.asset_name || tx.asset_type}
                    </p>
                    <p className="font-body text-pixel-muted text-base">
                      {format(new Date(tx.transaction_date), 'dd MMM yy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-pixel-text text-lg">{formatSfl(tx.quantity)}</p>
                    {tx.total_amount_usd != null && (
                      <p className="font-body text-pixel-muted text-base">{formatUsd(tx.total_amount_usd)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelCard>
      </div>
    </div>
  )
}
