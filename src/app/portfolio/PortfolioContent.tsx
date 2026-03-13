'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import pb from '@/lib/pb'
import { col } from '@/lib/pb'
import { useAppStore } from '@/lib/store'
import { formatUsd, formatSfl } from '@/lib/api'
import { PageHeader, PixelCard, PixelButton, PixelInput, PixelLoading, StatCard } from '@/components/ui'
import type { Portfolio, PnlSummary } from '@/types'
import { format } from 'date-fns'

function SnapshotModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { currentFarm, addNotification, sflPriceUsd } = useAppStore()
  const [form, setForm] = useState({
    sfl_balance:         '',
    pol_balance:         '',
    gems_balance:        '',
    coins_balance:       '',
    total_nft_value_sfl: '',
    snapshot_date:       format(new Date(), 'yyyy-MM-dd'),
    notes:               '',
  })
  const [saving, setSaving] = useState(false)
  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const totalUsd = (() => {
    const sfl  = (parseFloat(form.sfl_balance)         || 0) * (sflPriceUsd || 0)
    const pol  = (parseFloat(form.pol_balance)          || 0) * 0 // pol price unknown here
    const nfts = (parseFloat(form.total_nft_value_sfl)  || 0) * (sflPriceUsd || 0)
    return sfl + nfts
  })()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await col('portfolios').create({
        ...form,
        sfl_balance:          parseFloat(form.sfl_balance)         || 0,
        pol_balance:          parseFloat(form.pol_balance)          || 0,
        gems_balance:         parseInt(form.gems_balance)           || 0,
        coins_balance:        parseInt(form.coins_balance)          || 0,
        total_nft_value_sfl:  parseFloat(form.total_nft_value_sfl)  || 0,
        total_value_usd:      totalUsd,
        user_id: pb.authStore.model?.id,
        farm_id: currentFarm?.id || null,
      })
      addNotification('success', 'Snapshot saved!')
      onSaved(); onClose()
    } catch (err: any) { addNotification('error', err?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md pixel-border-gold bg-pixel-panel">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-pixel-gold">
          <h2 className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>◆ NEW SNAPSHOT</h2>
          <button onClick={onClose} className="font-pixel text-pixel-muted hover:text-pixel-red text-sm">×</button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3">
          <PixelInput label="DATE" type="date" value={form.snapshot_date}
            onChange={e => s('snapshot_date', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <PixelInput label="SFL BALANCE" type="number" step="any" min="0"
              value={form.sfl_balance} onChange={e => s('sfl_balance', e.target.value)} />
            <PixelInput label="POL BALANCE" type="number" step="any" min="0"
              value={form.pol_balance} onChange={e => s('pol_balance', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PixelInput label="GEMS" type="number" step="1" min="0"
              value={form.gems_balance} onChange={e => s('gems_balance', e.target.value)} />
            <PixelInput label="COINS" type="number" step="1" min="0"
              value={form.coins_balance} onChange={e => s('coins_balance', e.target.value)} />
          </div>
          <PixelInput label="TOTAL NFT VALUE (SFL)" type="number" step="any" min="0"
            value={form.total_nft_value_sfl} onChange={e => s('total_nft_value_sfl', e.target.value)} />

          {totalUsd > 0 && (
            <div className="bg-pixel-bg p-3 border-2 border-pixel-green">
              <p className="font-pixel text-pixel-muted mb-1" style={{ fontSize: '8px' }}>EST. TOTAL VALUE</p>
              <p className="font-pixel text-pixel-green glow-green" style={{ fontSize: '14px' }}>
                {formatUsd(totalUsd)}
              </p>
            </div>
          )}

          <div>
            <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>NOTES</label>
            <textarea className="pixel-input h-16 resize-none" value={form.notes}
              onChange={e => s('notes', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <PixelButton type="submit" variant="gold" disabled={saving} className="flex-1">
              {saving ? '▓▓▓▓▓' : '▶ SAVE SNAPSHOT'}
            </PixelButton>
            <PixelButton type="button" variant="ghost" onClick={onClose}>CANCEL</PixelButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PortfolioContent() {
  const { currentFarm, sflPriceUsd } = useAppStore()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [pnlSummaries, setPnlSummaries] = useState<PnlSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const ports = await col('portfolios').getList(1, 30, {
        sort: '-snapshot_date',
        filter: currentFarm ? `farm_id="${currentFarm.id}"` : '',
      })
      setPortfolios(ports.items as unknown as Portfolio[])

      const pnls = await col('pnl_summaries').getList(1, 12, {
        sort: '-period_year,-period_month',
        filter: [
          currentFarm ? `farm_id="${currentFarm.id}"` : '',
          `period_type="monthly"`,
        ].filter(Boolean).join(' && '),
      })
      setPnlSummaries(pnls.items as unknown as PnlSummary[])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [currentFarm])

  const latest = portfolios[0]
  const chartData = [...portfolios].reverse().map(p => ({
    date: format(new Date(p.snapshot_date), 'dd/MM'),
    value: p.total_value_usd,
    sfl: p.sfl_balance,
  }))

  const allTimePnl = pnlSummaries.reduce((s, p) => s + p.net_pnl_usd, 0)

  return (
    <div>
      <PageHeader icon="◆" title="PORTFOLIO"
        subtitle="BALANCE SNAPSHOTS & P&L HISTORY"
        action={<PixelButton variant="gold" onClick={() => setShowModal(true)}>◆ NEW SNAPSHOT</PixelButton>}
      />

      {loading ? <PixelLoading /> : (
        <>
          {/* Current stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="TOTAL VALUE"    value={formatUsd(latest?.total_value_usd)}    icon="◆" variant="gold" />
            <StatCard label="SFL BALANCE"    value={formatSfl(latest?.sfl_balance) + ' SFL'} icon="🌻" variant="green" />
            <StatCard label="GEMS"           value={String(latest?.gems_balance || 0)}       icon="◇" />
            <StatCard label="ALL-TIME P&L"   value={formatUsd(allTimePnl)}                  icon={allTimePnl >= 0 ? '▲' : '▼'}
              variant={allTimePnl >= 0 ? 'green' : 'red'} />
          </div>

          {/* Chart */}
          {chartData.length >= 2 && (
            <PixelCard title="◆ PORTFOLIO VALUE OVER TIME" variant="gold" className="mb-6">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fill: '#7c7f99', fontSize: 10, fontFamily: 'VT323' }}
                    axisLine={{ stroke: '#3d4052' }} tickLine={false} />
                  <YAxis tick={{ fill: '#7c7f99', fontSize: 10, fontFamily: 'VT323' }}
                    tickFormatter={v => '$' + (v/1000).toFixed(1) + 'k'}
                    axisLine={false} tickLine={false} width={50} />
                  <Tooltip
                    contentStyle={{ background: '#2d2f3e', border: '3px solid #f7c948', fontFamily: 'VT323', fontSize: 18 }}
                    formatter={(v: number) => [formatUsd(v), 'VALUE']} />
                  <Line type="stepAfter" dataKey="value" stroke="#f7c948" strokeWidth={2}
                    dot={{ fill: '#f7c948', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </PixelCard>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Snapshot history */}
            <PixelCard title="◆ SNAPSHOT HISTORY">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {portfolios.length === 0 ? (
                  <p className="font-body text-pixel-muted text-lg text-center py-8">NO SNAPSHOTS YET</p>
                ) : portfolios.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2
                    border-b border-pixel-border hover:bg-white/5">
                    <div>
                      <p className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>
                        {format(new Date(p.snapshot_date), 'dd MMM yyyy')}
                      </p>
                      <p className="font-body text-pixel-text text-lg">
                        {formatSfl(p.sfl_balance)} SFL · {p.gems_balance || 0} GEMS
                      </p>
                    </div>
                    <p className="font-pixel text-pixel-gold glow-gold" style={{ fontSize: '11px' }}>
                      {formatUsd(p.total_value_usd)}
                    </p>
                  </div>
                ))}
              </div>
            </PixelCard>

            {/* Monthly P&L */}
            <PixelCard title="◈ MONTHLY P&L">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {pnlSummaries.length === 0 ? (
                  <p className="font-body text-pixel-muted text-lg text-center py-8">NO P&L DATA YET</p>
                ) : pnlSummaries.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2
                    border-b border-pixel-border hover:bg-white/5">
                    <div>
                      <p className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>
                        {p.period_month?.toString().padStart(2, '0')}/{p.period_year}
                      </p>
                      <p className="font-body text-pixel-muted text-base">
                        IN: {formatUsd(p.total_inflow_usd)} · OUT: {formatUsd(p.total_outflow_usd)}
                      </p>
                    </div>
                    <p className={`font-pixel ${p.net_pnl_usd >= 0 ? 'text-pixel-green glow-green' : 'text-pixel-red glow-red'}`}
                      style={{ fontSize: '11px' }}>
                      {p.net_pnl_usd >= 0 ? '+' : ''}{formatUsd(p.net_pnl_usd)}
                    </p>
                  </div>
                ))}
              </div>
            </PixelCard>
          </div>
        </>
      )}

      {showModal && <SnapshotModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  )
}
