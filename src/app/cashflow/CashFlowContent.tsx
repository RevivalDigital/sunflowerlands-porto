'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import pb from '@/lib/pb'
import { col } from '@/lib/pb'
import { useAppStore } from '@/lib/store'
import { formatUsd } from '@/lib/api'
import { PageHeader, PixelCard, PixelButton, PixelInput, PixelSelect,
         PixelTable, PixelLoading, StatCard } from '@/components/ui'
import type { CashFlow, CashFlowCategory } from '@/types'
import { format, subMonths } from 'date-fns'

const CATEGORY_OPTIONS = [
  { value: 'farming_reward', label: '🌱 FARMING REWARD' },
  { value: 'nft_sale',       label: '▲ NFT SALE' },
  { value: 'nft_purchase',   label: '▼ NFT PURCHASE' },
  { value: 'token_purchase', label: '▼ TOKEN PURCHASE' },
  { value: 'token_sale',     label: '▲ TOKEN SALE' },
  { value: 'gem_purchase',   label: '▼ GEM PURCHASE' },
  { value: 'gem_spend',      label: '◆ GEM SPEND' },
  { value: 'gas_fee',        label: '⛽ GAS FEE' },
  { value: 'platform_fee',   label: '◈ PLATFORM FEE' },
  { value: 'bonus',          label: '★ BONUS' },
  { value: 'airdrop',        label: '🎁 AIRDROP' },
  { value: 'other',          label: '? OTHER' },
]

const CATEGORY_ICONS: Record<string, string> = {
  farming_reward: '🌱', nft_sale: '▲', nft_purchase: '▼',
  token_purchase: '▼', token_sale: '▲', gem_purchase: '◇',
  gem_spend: '◆', gas_fee: '⛽', platform_fee: '◈',
  bonus: '★', airdrop: '🎁', other: '?',
}

function CfModal({ onClose, onSaved, editCf }: { onClose: () => void; onSaved: () => void; editCf?: CashFlow | null }) {
  const { currentFarm, addNotification } = useAppStore()
  const [form, setForm] = useState({
    direction: editCf?.direction || 'inflow',
    category:  editCf?.category  || 'farming_reward',
    description: editCf?.description || '',
    amount_usd:  String(editCf?.amount_usd  ?? ''),
    amount_sfl:  String(editCf?.amount_sfl  ?? ''),
    amount_gems: String(editCf?.amount_gems  ?? ''),
    amount_coins:String(editCf?.amount_coins ?? ''),
    flow_date:   editCf?.flow_date?.slice(0,10) || format(new Date(), 'yyyy-MM-dd'),
    notes:       editCf?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const d = new Date(form.flow_date)
      const payload = {
        ...form,
        amount_usd:   parseFloat(form.amount_usd) || 0,
        amount_sfl:   form.amount_sfl   ? parseFloat(form.amount_sfl)   : null,
        amount_gems:  form.amount_gems  ? parseInt(form.amount_gems)    : null,
        amount_coins: form.amount_coins ? parseInt(form.amount_coins)   : null,
        period_year:  d.getFullYear(),
        period_month: d.getMonth() + 1,
        user_id: pb.authStore.model?.id,
        farm_id: currentFarm?.id || null,
      }
      if (editCf) {
        await col('cash_flows').update(editCf.id, payload)
        addNotification('success', 'Cash flow updated!')
      } else {
        await col('cash_flows').create(payload)
        addNotification('success', 'Cash flow saved!')
      }
      onSaved(); onClose()
    } catch (err: any) {
      addNotification('error', err?.message || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md pixel-border-gold bg-pixel-panel max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-pixel-gold">
          <h2 className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>{editCf ? '✎ EDIT CASH FLOW' : '+ ADD CASH FLOW'}</h2>
          <button onClick={onClose} className="font-pixel text-pixel-muted hover:text-pixel-red text-sm">×</button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3">
          {/* Direction toggle */}
          <div className="flex gap-0">
            {(['inflow', 'outflow'] as const).map(dir => (
              <button key={dir} type="button"
                onClick={() => s('direction', dir)}
                className={`flex-1 font-pixel py-3 text-xs border-2 transition-colors ${
                  form.direction === dir
                    ? dir === 'inflow'
                      ? 'bg-pixel-green text-white border-pixel-green'
                      : 'bg-pixel-red text-white border-pixel-red'
                    : 'bg-pixel-panel text-pixel-muted border-pixel-border'
                }`} style={{ fontSize: '9px' }}>
                {dir === 'inflow' ? '▲ INFLOW' : '▼ OUTFLOW'}
              </button>
            ))}
          </div>
          <PixelSelect label="CATEGORY" value={form.category}
            onChange={e => s('category', e.target.value)} options={CATEGORY_OPTIONS} />
          <PixelInput label="DESCRIPTION" value={form.description}
            onChange={e => s('description', e.target.value)} placeholder="Optional description" />
          <div className="grid grid-cols-2 gap-3">
            <PixelInput label="AMOUNT (USD) *" type="number" step="any" min="0"
              value={form.amount_usd} onChange={e => s('amount_usd', e.target.value)} required />
            <PixelInput label="AMOUNT (SFL)" type="number" step="any" min="0"
              value={form.amount_sfl} onChange={e => s('amount_sfl', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PixelInput label="GEMS" type="number" step="1" min="0"
              value={form.amount_gems} onChange={e => s('amount_gems', e.target.value)} />
            <PixelInput label="COINS" type="number" step="1" min="0"
              value={form.amount_coins} onChange={e => s('amount_coins', e.target.value)} />
          </div>
          <PixelInput label="DATE" type="date" value={form.flow_date}
            onChange={e => s('flow_date', e.target.value)} required />
          <div>
            <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>NOTES</label>
            <textarea className="pixel-input h-16 resize-none" value={form.notes}
              onChange={e => s('notes', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <PixelButton type="submit" variant={form.direction === 'inflow' ? 'green' : 'red'}
              disabled={saving} className="flex-1">
              {saving ? '▓▓▓▓▓' : editCf ? '▶ UPDATE' : '▶ SAVE'}
            </PixelButton>
            <PixelButton type="button" variant="ghost" onClick={onClose}>CANCEL</PixelButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CashFlowContent() {
  const { currentFarm, addNotification } = useAppStore()
  const [flows, setFlows] = useState<CashFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCf, setEditCf] = useState<CashFlow | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [monthlySummary, setMonthlySummary] = useState<any[]>([])

  const loadFlows = async () => {
    setLoading(true)
    try {
      const [yr, mo] = selectedMonth.split('-')
      const items = await col('cash_flows').getFullList({
        sort: '-flow_date',
        filter: [
          `period_year=${yr}`,
          `period_month=${parseInt(mo)}`,
          ...(currentFarm ? [`farm_id="${currentFarm.id}"`] : []),
        ].join(' && '),
      })
      setFlows(items as unknown as CashFlow[])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadSummary = async () => {
    const data: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i)
      const yr = d.getFullYear(), mo = d.getMonth() + 1
      try {
        const items = await col('cash_flows').getFullList({
          filter: [
            `period_year=${yr}`,
            `period_month=${mo}`,
            ...(currentFarm ? [`farm_id="${currentFarm.id}"`] : []),
          ].join(' && '),
        }) as unknown as CashFlow[]
        const inflow  = items.filter(c => c.direction === 'inflow').reduce((s, c) => s + c.amount_usd, 0)
        const outflow = items.filter(c => c.direction === 'outflow').reduce((s, c) => s + c.amount_usd, 0)
        data.push({ month: format(d, 'MMM yy'), inflow, outflow, net: inflow - outflow })
      } catch {}
    }
    setMonthlySummary(data)
  }

  useEffect(() => { loadFlows() }, [selectedMonth, currentFarm])
  useEffect(() => { loadSummary() }, [currentFarm])

  const totalInflow  = flows.filter(f => f.direction === 'inflow').reduce((s, f) => s + f.amount_usd, 0)
  const totalOutflow = flows.filter(f => f.direction === 'outflow').reduce((s, f) => s + f.amount_usd, 0)
  const netFlow = totalInflow - totalOutflow

  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') }
  })

  const isAutoTx = (cf: CashFlow) =>
    !!(cf.notes?.startsWith('Auto from TX') || cf.notes?.startsWith('Auto gas'))

  const handleEdit = (cf: CashFlow) => {
    if (isAutoTx(cf)) {
      addNotification('error', '⇄ AUTO-TX entries can only be edited via Transactions page')
      return
    }
    setEditCf(cf)
    setShowModal(true)
  }

  const handleDelete = async (cf: CashFlow) => {
    if (isAutoTx(cf)) {
      addNotification('error', '⇄ AUTO-TX entries can only be deleted via Transactions page')
      return
    }
    if (!confirm('DELETE THIS CASH FLOW ENTRY?')) return
    try {
      await col('cash_flows').delete(cf.id)
      addNotification('success', 'Cash flow deleted')
      loadFlows()
    } catch { addNotification('error', 'Delete failed') }
  }

  const columns = [
    {
      key: 'flow_date',
      header: 'DATE',
      render: (r: CashFlow) => (
        <span className="font-mono text-sm text-pixel-muted">
          {format(new Date(r.flow_date), 'dd/MM')}
        </span>
      ),
    },
    {
      key: 'direction',
      header: 'DIR',
      render: (r: CashFlow) => (
        <span className={`font-pixel ${r.direction === 'inflow' ? 'text-pixel-green' : 'text-pixel-red'}`}
          style={{ fontSize: '9px' }}>
          {r.direction === 'inflow' ? '▲ IN' : '▼ OUT'}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'CATEGORY',
      render: (r: CashFlow) => (
        <span className="font-body text-pixel-text text-lg">
          {CATEGORY_ICONS[r.category]} {r.category.replace(/_/g, ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'DESCRIPTION',
      render: (r: CashFlow) => (
        <div>
          <span className="font-body text-pixel-muted text-base truncate max-w-[120px] block">
            {r.description || '—'}
          </span>
          {r.notes?.startsWith('Auto from TX') && (
            <span className="font-pixel text-pixel-blue" style={{ fontSize: '6px' }}>⇄ AUTO-TX</span>
          )}
          {r.notes?.startsWith('Auto gas') && (
            <span className="font-pixel text-pixel-muted" style={{ fontSize: '6px' }}>⛽ AUTO-GAS</span>
          )}
        </div>
      ),
    },
    {
      key: 'amount_usd',
      header: 'USD',
      render: (r: CashFlow) => (
        <span className={`font-mono text-base font-bold ${
          r.direction === 'inflow' ? 'text-pixel-green' : 'text-pixel-red'
        }`}>
          {r.direction === 'inflow' ? '+' : '-'}{formatUsd(r.amount_usd)}
        </span>
      ),
    },
    {
      key: 'amount_sfl',
      header: 'SFL',
      render: (r: CashFlow) => (
        <span className="font-body text-pixel-muted text-base">
          {r.amount_sfl != null ? r.amount_sfl.toFixed(2) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r: CashFlow) => {
        const locked = isAutoTx(r)
        return (
          <div className="flex items-center gap-2 justify-end">
            {locked ? (
              <span className="font-pixel text-pixel-blue" style={{ fontSize: '6px' }}
                title="Managed via Transactions page">
                🔒 TX
              </span>
            ) : (
              <>
                <button onClick={() => handleEdit(r)}
                  className="font-pixel text-pixel-blue hover:text-blue-300 transition-colors"
                  style={{ fontSize: '11px' }} title="Edit">✎</button>
                <button onClick={() => handleDelete(r)}
                  className="font-pixel text-pixel-red hover:text-red-300 transition-colors"
                  style={{ fontSize: '11px' }} title="Delete">✗</button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader icon="◈" title="CASH FLOW"
        subtitle="MONTHLY INFLOW / OUTFLOW TRACKER"
        action={
          <PixelButton variant="gold" onClick={() => { setEditCf(null); setShowModal(true) }}>+ ADD FLOW</PixelButton>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="TOTAL INFLOW"  value={formatUsd(totalInflow)}  icon="▲" variant="green" />
        <StatCard label="TOTAL OUTFLOW" value={formatUsd(totalOutflow)} icon="▼" variant="red" />
        <StatCard label="NET FLOW"      value={formatUsd(netFlow)}      icon="◈"
          variant={netFlow >= 0 ? 'green' : 'red'} />
      </div>

      {/* Chart */}
      <PixelCard title="◈ 6-MONTH OVERVIEW" className="mb-6">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlySummary} barGap={2}>
            <XAxis dataKey="month" tick={{ fill: '#7c7f99', fontSize: 10, fontFamily: 'VT323' }}
              axisLine={{ stroke: '#3d4052' }} tickLine={false} />
            <YAxis tick={{ fill: '#7c7f99', fontSize: 10, fontFamily: 'VT323' }}
              tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: '#2d2f3e', border: '2px solid #f7c948', fontFamily: 'VT323' }}
              formatter={(v: number) => ['$' + v.toFixed(2)]} />
            <Bar dataKey="inflow"  name="IN"  fill="#37b74a" />
            <Bar dataKey="outflow" name="OUT" fill="#e53535" />
          </BarChart>
        </ResponsiveContainer>
      </PixelCard>

      {/* Month selector + table */}
      <div className="flex items-center gap-4 mb-4">
        <PixelSelect value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          options={monthOptions} className="w-40" label="VIEW MONTH" />
      </div>

      <PixelCard className="p-0 overflow-hidden">
        {loading ? <PixelLoading /> : (
          <PixelTable columns={columns} data={flows}
            emptyMessage="NO CASH FLOW RECORDS THIS MONTH" />
        )}
      </PixelCard>

      {showModal && <CfModal onClose={() => { setShowModal(false); setEditCf(null) }} onSaved={loadFlows} editCf={editCf} />}
    </div>
  )
}
