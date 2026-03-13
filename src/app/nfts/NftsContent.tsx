'use client'
import { useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pb'
import { col } from '@/lib/pb'
import { useAppStore } from '@/lib/store'
import { formatSfl, formatUsd, RARITY_COLORS } from '@/lib/api'
import { PageHeader, PixelCard, PixelButton, PixelInput, PixelSelect,
         PixelLoading, EmptyState, StatCard, PixelBadge } from '@/components/ui'
import type { NftHolding, NftRarity } from '@/types'
import { format } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  holding: '#37b74a', listed: '#f7c948', sold: '#7c7f99', burned: '#e53535'
}

// ── Picker types & parsers (same logic as TransactionsContent) ─────────────
interface PickerNft {
  name:       string
  collection: string
  floor:      number | null
  supply:     number | null
  have_boost: boolean
  boost_text: string
}

function parseNftsForPicker(raw: any): PickerNft[] {
  const items: PickerNft[] = []
  const ingest = (arr: any[], collection: string) => {
    if (!Array.isArray(arr)) return
    for (const item of arr) {
      if (!item?.name) continue
      const floor = typeof item.floor === 'number' && item.floor > 0 && item.floor < 1e12 ? item.floor : null
      items.push({
        name: item.name, collection,
        floor,
        supply:     typeof item.supply === 'number' ? item.supply : null,
        have_boost: item.have_boost === 1 || item.have_boost === true,
        boost_text: item.boost_text ?? '',
      })
    }
  }
  const src = raw?.collectibles || raw?.wearables ? raw : (raw?.data ?? {})
  ingest(src.collectibles ?? [], 'collectibles')
  ingest(src.wearables    ?? [], 'wearables')
  return items.sort((a, b) => a.name.localeCompare(b.name))
}

// ── NftPicker component ────────────────────────────────────────────────────
function NftPicker({ items, loading, query, onSearch, onSelect, sflPrice, onClose }: {
  items: PickerNft[]; loading: boolean; query: string
  onSearch: (q: string) => void; onSelect: (i: PickerNft) => void
  sflPrice: number | null; onClose: () => void
}) {
  const [tab, setTab] = useState<'all'|'collectibles'|'wearables'>('all')
  const filtered = items
    .filter(i => tab === 'all' ? true : i.collection === tab)
    .filter(i => !query.trim() || i.name.toLowerCase().includes(query.toLowerCase()))
  const counts = {
    all:          items.length,
    collectibles: items.filter(i => i.collection === 'collectibles').length,
    wearables:    items.filter(i => i.collection === 'wearables').length,
  }
  return (
    <div className="border-2 border-pixel-gold bg-pixel-bg mt-1">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-pixel-border bg-pixel-panel">
        <span className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>🔍</span>
        <input autoFocus value={query} onChange={e => onSearch(e.target.value)}
          placeholder="SEARCH NFT..." className="flex-1 bg-transparent font-body text-pixel-text text-xl outline-none placeholder-pixel-muted" />
        {loading
          ? <span className="font-pixel text-pixel-muted animate-pixel-blink" style={{ fontSize: '7px' }}>LOADING...</span>
          : <span className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>{filtered.length}</span>
        }
      </div>
      {/* Tabs */}
      <div className="flex border-b-2 border-pixel-border">
        {(['all','collectibles','wearables'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 py-1.5 font-pixel border-r border-pixel-border last:border-r-0 transition-colors ${
              tab === t ? 'bg-pixel-gold/20 text-pixel-gold' : 'text-pixel-muted hover:text-pixel-text'
            }`} style={{ fontSize: '6px' }}>
            {t.toUpperCase()}<br/><span style={{ fontSize: '7px' }}>{counts[t]}</span>
          </button>
        ))}
      </div>
      {/* List */}
      <div className="overflow-y-auto max-h-52">
        {filtered.length === 0 && !loading && (
          <p className="font-pixel text-pixel-muted text-center py-6" style={{ fontSize: '8px' }}>
            {query ? `NO RESULTS FOR "${query}"` : 'NO ITEMS'}
          </p>
        )}
        {filtered.map(item => {
          const usd = item.floor != null && sflPrice ? item.floor * sflPrice : null
          const colColor = item.collection === 'collectibles' ? 'text-pixel-gold' : 'text-pixel-blue'
          return (
            <button key={`${item.collection}-${item.name}`} type="button" onClick={() => onSelect(item)}
              className="w-full flex items-center justify-between px-3 py-1.5 border-b border-pixel-border hover:bg-pixel-gold/10 text-left group">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-pixel text-pixel-gold group-hover:text-yellow-300 flex-shrink-0" style={{ fontSize: '7px' }}>▶</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-body text-pixel-text text-lg truncate">{item.name}</span>
                    {item.have_boost && <span className="font-pixel text-pixel-green flex-shrink-0" style={{ fontSize: '6px' }}>⚡</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-pixel ${colColor}`} style={{ fontSize: '6px' }}>
                      {item.collection === 'collectibles' ? 'COLLECTIBLE' : 'WEARABLE'}
                    </span>
                    {item.supply != null && (
                      <span className="font-pixel text-pixel-muted" style={{ fontSize: '6px' }}>S:{item.supply.toLocaleString()}</span>
                    )}
                    {item.have_boost && item.boost_text && (
                      <span className="font-pixel text-pixel-green truncate max-w-[100px]" style={{ fontSize: '6px' }}>{item.boost_text}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-1">
                {item.floor != null && (
                  <div className="text-right">
                    <p className="font-pixel text-pixel-gold" style={{ fontSize: '6px' }}>FLOOR</p>
                    <p className="font-mono text-pixel-gold text-sm">{item.floor.toFixed(4)}</p>
                  </div>
                )}
                {usd != null && (
                  <div className="text-right min-w-[44px]">
                    <p className="font-pixel text-pixel-muted" style={{ fontSize: '6px' }}>USD</p>
                    <p className="font-mono text-pixel-muted text-sm">${usd.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <button type="button" onClick={onClose}
        className="w-full font-pixel text-pixel-muted hover:text-pixel-red py-1 border-t-2 border-pixel-border bg-pixel-panel"
        style={{ fontSize: '7px' }}>
        ✕ CLOSE PICKER
      </button>
    </div>
  )
}

function NftCard({ nft, sflPrice, onEdit, onDelete }: {
  nft: NftHolding; sflPrice: number | null; onEdit: () => void; onDelete: () => void
}) {
  const floorSfl = nft.floor_price_p2p_sfl || nft.floor_price_seq_sfl || 0
  const floorUsd = sflPrice ? floorSfl * sflPrice : 0
  const costUsd  = nft.avg_cost_usd || (sflPrice && nft.avg_cost_sfl ? nft.avg_cost_sfl * sflPrice : 0)
  const pnlUsd   = costUsd && floorUsd ? (floorUsd - costUsd) * nft.quantity : null

  return (
    <div className="bg-pixel-panel pixel-border hover:border-pixel-gold transition-colors group">
      {/* NFT Header */}
      <div className="border-b-2 border-pixel-border px-4 py-3 flex items-start justify-between">
        <div>
          <h3 className="font-pixel text-pixel-text" style={{ fontSize: '9px' }}>
            {nft.nft_name}
          </h3>
          {nft.collection && (
            <p className="font-body text-pixel-muted text-base mt-0.5">{nft.collection}</p>
          )}
        </div>
        <PixelBadge color={RARITY_COLORS[nft.rarity || 'common']}>
          {(nft.rarity || 'COMMON').toUpperCase()}
        </PixelBadge>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between">
          <span className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>QTY</span>
          <span className="font-body text-pixel-gold text-xl">×{nft.quantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>AVG COST</span>
          <span className="font-body text-pixel-text text-lg">
            {formatSfl(nft.avg_cost_sfl)} SFL
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>FLOOR (P2P)</span>
          <span className="font-body text-pixel-gold text-lg">
            {nft.floor_price_p2p_sfl ? formatSfl(nft.floor_price_p2p_sfl) + ' SFL' : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>FLOOR (SEQ)</span>
          <span className="font-body text-pixel-blue text-lg">
            {nft.floor_price_seq_sfl ? formatSfl(nft.floor_price_seq_sfl) + ' SFL' : '—'}
          </span>
        </div>
        {pnlUsd !== null && (
          <div className="flex justify-between border-t border-pixel-border pt-2">
            <span className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>UNREALIZED P&L</span>
            <span className={`font-pixel ${pnlUsd >= 0 ? 'text-pixel-green' : 'text-pixel-red'}`}
              style={{ fontSize: '10px' }}>
              {pnlUsd >= 0 ? '+' : ''}{formatUsd(pnlUsd)}
            </span>
          </div>
        )}
        {nft.total_supply && (
          <div className="flex justify-between">
            <span className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>SUPPLY</span>
            <span className="font-body text-pixel-muted text-base">{nft.total_supply.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-pixel-border px-4 py-2 flex items-center justify-between">
        <span className="font-pixel" style={{ fontSize: '8px', color: STATUS_COLORS[nft.status || 'holding'] }}>
          ● {(nft.status || 'holding').toUpperCase()}
        </span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="font-pixel text-pixel-blue hover:text-blue-300"
            style={{ fontSize: '9px' }}>✎</button>
          <button onClick={onDelete} className="font-pixel text-pixel-red hover:text-red-300"
            style={{ fontSize: '9px' }}>✗</button>
        </div>
      </div>
    </div>
  )
}

function NftModal({ nft, onClose, onSaved }: {
  nft?: NftHolding | null; onClose: () => void; onSaved: () => void
}) {
  const { currentFarm, addNotification } = useAppStore()
  const [form, setForm] = useState({
    nft_name:           nft?.nft_name || '',
    collection:         nft?.collection || '',
    quantity:           String(nft?.quantity || 1),
    avg_cost_sfl:       String(nft?.avg_cost_sfl || ''),
    avg_cost_usd:       String(nft?.avg_cost_usd || ''),
    floor_price_p2p_sfl:String(nft?.floor_price_p2p_sfl || ''),
    floor_price_seq_sfl:String(nft?.floor_price_seq_sfl || ''),
    total_supply:       String(nft?.total_supply || ''),
    rarity:             nft?.rarity || 'common',
    status:             nft?.status || 'holding',
    acquired_date:      nft?.acquired_date?.slice(0,10) || format(new Date(), 'yyyy-MM-dd'),
    notes:              nft?.notes || '',
  })
  const [saving,       setSaving]       = useState(false)
  const [showPicker,   setShowPicker]   = useState(false)
  const [pickerQuery,  setPickerQuery]  = useState('')
  const [nftList,      setNftList]      = useState<PickerNft[]>([])
  const [nftLoading,   setNftLoading]   = useState(false)
  const [nftFetched,   setNftFetched]   = useState(false)
  const [liveNft,      setLiveNft]      = useState<PickerNft | null>(null)
  const { sflPriceUsd } = useAppStore()

  const s = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const fetchNfts = useCallback(async () => {
    if (nftFetched) return
    setNftLoading(true)
    try {
      const res  = await fetch('/api/sfl/nfts', { cache: 'no-store' })
      const data = await res.json()
      setNftList(parseNftsForPicker(data))
      setNftFetched(true)
    } catch(e) { console.error('nfts fetch:', e) }
    finally    { setNftLoading(false) }
  }, [nftFetched])

  const handleOpenPicker = () => {
    setPickerQuery('')
    setShowPicker(true)
    fetchNfts()
  }

  const handleSelectNft = (item: PickerNft) => {
    s('nft_name',   item.name)
    s('collection', item.collection === 'collectibles' ? 'Collectibles' : 'Wearables')
    if (item.floor != null) {
      s('avg_cost_sfl',        String(item.floor))
      s('floor_price_p2p_sfl', String(item.floor))
      if (sflPriceUsd) s('avg_cost_usd', (item.floor * sflPriceUsd).toFixed(4))
    }
    if (item.supply != null) s('total_supply', String(item.supply))
    setLiveNft(item)
    setShowPicker(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const data = {
        ...form,
        quantity:            parseInt(form.quantity),
        avg_cost_sfl:        form.avg_cost_sfl ? parseFloat(form.avg_cost_sfl) : null,
        avg_cost_usd:        form.avg_cost_usd ? parseFloat(form.avg_cost_usd) : null,
        floor_price_p2p_sfl: form.floor_price_p2p_sfl ? parseFloat(form.floor_price_p2p_sfl) : null,
        floor_price_seq_sfl: form.floor_price_seq_sfl ? parseFloat(form.floor_price_seq_sfl) : null,
        total_supply: form.total_supply ? parseInt(form.total_supply) : null,
        user_id: pb.authStore.model?.id,
        farm_id: currentFarm?.id || null,
      }
      if (nft) { await col('nft_holdings').update(nft.id, data) }
      else      { await col('nft_holdings').create(data) }
      addNotification('success', nft ? 'NFT updated!' : 'NFT added!')
      onSaved(); onClose()
    } catch (err: any) { addNotification('error', err?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg pixel-border-gold bg-pixel-panel max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-pixel-gold">
          <h2 className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>
            {nft ? '✎ EDIT NFT' : '★ ADD NFT'}
          </h2>
          <button onClick={onClose} className="font-pixel text-pixel-muted hover:text-pixel-red text-sm">×</button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3">
          {/* NFT Name + Picker */}
          <div>
            <div className="flex items-end gap-2 mb-1">
              <label className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>NFT NAME *</label>
              <button type="button" onClick={handleOpenPicker}
                className="ml-auto font-pixel border px-2 py-0.5 transition-colors border-pixel-gold text-pixel-gold hover:bg-pixel-gold/20"
                style={{ fontSize: '7px' }}>
                {nftLoading ? '⏳ LOADING...' : <>◈ BROWSE {nftList.length > 0 ? `(${nftList.length})` : 'NFTs'}</>}
              </button>
            </div>
            <div className="relative">
              <input value={form.nft_name} required
                onChange={e => {
                  s('nft_name', e.target.value)
                  // live lookup
                  const match = nftList.find(i => i.name.toLowerCase() === e.target.value.toLowerCase())
                  if (match) { setLiveNft(match) } else { setLiveNft(null) }
                }}
                placeholder="Type name or press BROWSE ↑"
                className="pixel-input pr-10" />
              {liveNft && <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-pixel-green" style={{ fontSize: '9px' }}>✓</span>}
            </div>

            {/* Picker dropdown */}
            {showPicker && (
              <NftPicker
                items={nftList} loading={nftLoading}
                query={pickerQuery} onSearch={setPickerQuery}
                onSelect={handleSelectNft} sflPrice={sflPriceUsd}
                onClose={() => setShowPicker(false)}
              />
            )}

            {/* Live NFT badge */}
            {liveNft && !showPicker && (
              <div className="mt-1 px-2 py-1.5 bg-pixel-bg border border-pixel-green space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-pixel text-pixel-green" style={{ fontSize: '7px' }}>◆ LIVE DATA</span>
                  {liveNft.floor != null && (
                    <span className="font-body text-pixel-gold text-base">FLOOR: {liveNft.floor.toFixed(8)} SFL</span>
                  )}
                  {liveNft.supply != null && (
                    <span className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>SUPPLY: {liveNft.supply.toLocaleString()}</span>
                  )}
                </div>
                {liveNft.have_boost && liveNft.boost_text && (
                  <p className="font-pixel text-pixel-green" style={{ fontSize: '7px' }}>⚡ {liveNft.boost_text}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PixelInput label="COLLECTION" value={form.collection}
              onChange={e => s('collection', e.target.value)} placeholder="e.g. Wearables" />
            <PixelInput label="QUANTITY" type="number" min="1" step="1" value={form.quantity}
              onChange={e => s('quantity', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PixelInput label="AVG COST (SFL)" type="number" step="any" min="0"
              value={form.avg_cost_sfl} onChange={e => s('avg_cost_sfl', e.target.value)} />
            <PixelInput label="AVG COST (USD)" type="number" step="any" min="0"
              value={form.avg_cost_usd} onChange={e => s('avg_cost_usd', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PixelInput label="FLOOR P2P (SFL)" type="number" step="any" min="0"
              value={form.floor_price_p2p_sfl} onChange={e => s('floor_price_p2p_sfl', e.target.value)} />
            <PixelInput label="FLOOR SEQ (SFL)" type="number" step="any" min="0"
              value={form.floor_price_seq_sfl} onChange={e => s('floor_price_seq_sfl', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PixelSelect label="RARITY" value={form.rarity} onChange={e => s('rarity', e.target.value)}
              options={['common','uncommon','rare','epic','legendary','mythical'].map(r => ({ value: r, label: r.toUpperCase() }))} />
            <PixelSelect label="STATUS" value={form.status} onChange={e => s('status', e.target.value)}
              options={['holding','listed','sold','burned'].map(r => ({ value: r, label: r.toUpperCase() }))} />
          </div>
          <PixelInput label="ACQUIRED DATE" type="date" value={form.acquired_date}
            onChange={e => s('acquired_date', e.target.value)} />
          <div>
            <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>NOTES</label>
            <textarea className="pixel-input h-16 resize-none" value={form.notes}
              onChange={e => s('notes', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <PixelButton type="submit" variant="gold" disabled={saving} className="flex-1">
              {saving ? '▓▓▓▓▓' : '▶ SAVE NFT'}
            </PixelButton>
            <PixelButton type="button" variant="ghost" onClick={onClose}>CANCEL</PixelButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NftsContent() {
  const { currentFarm, sflPriceUsd, addNotification } = useAppStore()
  const [nfts, setNfts] = useState<NftHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editNft, setEditNft] = useState<NftHolding | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRarity, setFilterRarity] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const filters = [
        currentFarm ? `farm_id="${currentFarm.id}"` : '',
        filterStatus ? `status="${filterStatus}"` : '',
        filterRarity ? `rarity="${filterRarity}"` : '',
        search ? `nft_name~"${search}"` : '',
      ].filter(Boolean)
      const items = await col('nft_holdings').getFullList({
        sort: 'nft_name',
        filter: filters.join(' && ') || '',
      })
      setNfts(items as unknown as NftHolding[])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [currentFarm, filterStatus, filterRarity, search])

  const handleDelete = async (nft: NftHolding) => {
    if (!confirm('DELETE THIS NFT?')) return
    await col('nft_holdings').delete(nft.id)
    addNotification('success', 'NFT removed')
    load()
  }

  const holdingNfts = nfts.filter(n => n.status !== 'sold' && n.status !== 'burned')
  const totalValueUsd = holdingNfts.reduce((s, n) => {
    const floor = n.floor_price_p2p_sfl || n.floor_price_seq_sfl || 0
    return s + (sflPriceUsd ? floor * n.quantity * sflPriceUsd : 0)
  }, 0)
  const totalUnrealizedPnl = holdingNfts.reduce((s, n) => {
    const floor   = n.floor_price_p2p_sfl || n.floor_price_seq_sfl || 0
    const cost    = n.avg_cost_sfl || 0
    const pnlSfl  = (floor - cost) * n.quantity
    return s + (sflPriceUsd ? pnlSfl * sflPriceUsd : 0)
  }, 0)

  return (
    <div>
      <PageHeader icon="★" title="MY NFTS"
        subtitle={`${holdingNfts.length} NFT TYPES HELD`}
        action={<PixelButton variant="gold" onClick={() => { setEditNft(null); setShowModal(true) }}>★ ADD NFT</PixelButton>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="TOTAL NFT VALUE"   value={formatUsd(totalValueUsd)}     icon="★" variant="gold" />
        <StatCard label="UNREALIZED P&L"    value={formatUsd(totalUnrealizedPnl)} icon={totalUnrealizedPnl >= 0 ? '▲' : '▼'}
          variant={totalUnrealizedPnl >= 0 ? 'green' : 'red'} />
        <StatCard label="NFT TYPES HOLDING" value={String(holdingNfts.length)}   icon="◆" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <PixelInput placeholder="SEARCH..." value={search}
          onChange={e => setSearch(e.target.value)} className="w-40" />
        <PixelSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          options={[{ value: '', label: 'ALL STATUS' }, ...['holding','listed','sold','burned'].map(v => ({ value: v, label: v.toUpperCase() }))]}
          className="w-36" />
        <PixelSelect value={filterRarity} onChange={e => setFilterRarity(e.target.value)}
          options={[{ value: '', label: 'ALL RARITY' }, ...['common','uncommon','rare','epic','legendary','mythical'].map(v => ({ value: v, label: v.toUpperCase() }))]}
          className="w-36" />
      </div>

      {loading ? <PixelLoading /> : nfts.length === 0 ? (
        <EmptyState icon="★" title="NO NFTS FOUND"
          message="Add your NFT holdings to track their value and P&L"
          action={<PixelButton variant="gold" onClick={() => setShowModal(true)}>★ ADD FIRST NFT</PixelButton>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {nfts.map(nft => (
            <NftCard key={nft.id} nft={nft} sflPrice={sflPriceUsd}
              onEdit={() => { setEditNft(nft); setShowModal(true) }}
              onDelete={() => handleDelete(nft)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NftModal nft={editNft} onClose={() => setShowModal(false)} onSaved={load} />
      )}
    </div>
  )
}
