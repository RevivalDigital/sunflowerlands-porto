'use client'
import { useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pb'
import { col } from '@/lib/pb'
import { useAppStore } from '@/lib/store'
import { formatSfl, formatUsd } from '@/lib/api'
import { PageHeader, PixelCard, PixelButton, PixelInput, PixelLoading, EmptyState } from '@/components/ui'
import type { WatchlistItem } from '@/types'

// ── Parse /api/sfl/prices (same envelope as TransactionsContent) ───────────
interface PriceItem { name: string; p2p: number | null; seq: number | null }

function parsePrices(raw: any): PriceItem[] {
  const data = raw?.data ?? raw
  const map  = new Map<string, PriceItem>()
  const ingest = (src: any, key: 'p2p' | 'seq') => {
    if (!src || typeof src !== 'object') return
    for (const [name, val] of Object.entries(src)) {
      const price = typeof val === 'number' ? val : null
      if (!price || price <= 0) continue
      const e = map.get(name) ?? { name, p2p: null, seq: null }
      map.set(name, { ...e, [key]: price })
    }
  }
  ingest(data?.p2p, 'p2p')
  ingest(data?.seq, 'seq')
  if (data?.ge) {
    for (const [name, val] of Object.entries(data.ge as any)) {
      if (map.has(name)) continue
      const price = typeof val === 'number' ? val : null
      if (!price) continue
      map.set(name, { name, p2p: price, seq: null })
    }
  }
  if (map.size === 0) ingest(data, 'p2p')
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

// ── Parse /api/sfl/nfts ───────────────────────────────────────────────────
// API: { collectibles: [{id,floor,lastSalePrice,supply,collection,name,have_boost,boost_text},...], wearables: [...], updatedAt }
interface NftItem {
  name:        string
  collection:  string
  floor:       number | null
  lastSalePrice: number | null
  supply:      number | null
  have_boost:  boolean
  boost_text:  string
}

function parseNfts(raw: any): NftItem[] {
  const items: NftItem[] = []

  const ingestArray = (arr: any[], collectionFallback: string) => {
    if (!Array.isArray(arr)) return
    for (const item of arr) {
      if (!item?.name) continue                      // skip unnamed items
      const floor = typeof item.floor === 'number' && item.floor > 0 && item.floor < 1e12
        ? item.floor : null
      items.push({
        name:          item.name,
        collection:    item.collection ?? collectionFallback,
        floor,
        lastSalePrice: typeof item.lastSalePrice === 'number' ? item.lastSalePrice : null,
        supply:        typeof item.supply        === 'number' ? item.supply        : null,
        have_boost:    item.have_boost === 1 || item.have_boost === true,
        boost_text:    item.boost_text ?? '',
      })
    }
  }

  // Primary structure: { collectibles: [...], wearables: [...] }
  if (raw?.collectibles || raw?.wearables) {
    ingestArray(raw.collectibles, 'collectibles')
    ingestArray(raw.wearables,   'wearables')
  } else if (raw?.data) {
    // Wrapped: { data: { collectibles, wearables } }
    ingestArray(raw.data.collectibles, 'collectibles')
    ingestArray(raw.data.wearables,    'wearables')
  }

  return items.sort((a, b) => a.name.localeCompare(b.name))
}

// ── Combined item for picker (prices + nfts merged) ──────────────────────
interface PickerItem {
  name:       string
  collection: string
  p2p:        number | null
  seq:        number | null
  supply:     number | null
  have_boost: boolean
  boost_text: string
}

// ── Item Picker dropdown ───────────────────────────────────────────────────
function ItemPicker({ items, loading, query, onSearch, onSelect, sflPrice, onClose }: {
  items:    PickerItem[]
  loading:  boolean
  query:    string
  onSearch: (q: string) => void
  onSelect: (item: PickerItem) => void
  sflPrice: number | null
  onClose:  () => void
}) {
  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    : items

  return (
    <div className="border-2 border-pixel-gold bg-pixel-bg mt-1">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-pixel-border bg-pixel-panel sticky top-0">
        <span className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>🔍</span>
        <input autoFocus value={query} onChange={e => onSearch(e.target.value)}
          placeholder="SEARCH ITEM / NFT..."
          className="flex-1 bg-transparent font-body text-pixel-text text-xl outline-none placeholder-pixel-muted" />
        <span className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>
          {loading ? 'LOADING...' : `${filtered.length} ITEMS`}
        </span>
        <button type="button" onClick={onClose}
          className="font-pixel text-pixel-muted hover:text-pixel-red ml-1" style={{ fontSize: '11px' }}>×</button>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-64">
        {filtered.length === 0 && !loading && (
          <p className="font-pixel text-pixel-muted text-center py-6" style={{ fontSize: '8px' }}>
            NO ITEMS MATCH "{query}"
          </p>
        )}
        {filtered.map(item => {
          const bestPrice = item.p2p ?? item.seq ?? null
          const usd = bestPrice !== null && sflPrice ? bestPrice * sflPrice : null
          const colLabel = item.collection === 'collectibles' ? 'COLLECTIBLE'
                         : item.collection === 'wearables'    ? 'WEARABLE'
                         : item.collection === 'Resources'    ? 'RESOURCE'
                         : item.collection.toUpperCase()
          const colColor = item.collection === 'collectibles' ? 'text-pixel-gold'
                         : item.collection === 'wearables'    ? 'text-pixel-blue'
                         : 'text-pixel-muted'
          return (
            <button key={`${item.collection}-${item.name}`} type="button"
              onClick={() => onSelect(item)}
              className="w-full flex items-center justify-between px-3 py-2 border-b border-pixel-border hover:bg-pixel-gold/10 text-left group">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-pixel text-pixel-gold group-hover:text-yellow-300 flex-shrink-0" style={{ fontSize: '7px' }}>▶</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-body text-pixel-text text-lg truncate">{item.name}</p>
                    {item.have_boost && (
                      <span className="font-pixel text-pixel-green flex-shrink-0" style={{ fontSize: '6px' }}>⚡BOOST</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-pixel ${colColor}`} style={{ fontSize: '6px' }}>{colLabel}</span>
                    {item.supply != null && (
                      <span className="font-pixel text-pixel-muted" style={{ fontSize: '6px' }}>S:{item.supply.toLocaleString()}</span>
                    )}
                    {item.boost_text && item.have_boost && (
                      <span className="font-pixel text-pixel-green truncate max-w-[120px]" style={{ fontSize: '6px' }}>{item.boost_text}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {item.p2p !== null && (
                  <div className="text-right">
                    <p className="font-pixel text-pixel-gold" style={{ fontSize: '6px' }}>FLOOR</p>
                    <p className="font-mono text-pixel-gold text-sm">{formatSfl(item.p2p, 4)}</p>
                  </div>
                )}
                {item.seq !== null && (
                  <div className="text-right">
                    <p className="font-pixel text-pixel-blue" style={{ fontSize: '6px' }}>SEQ</p>
                    <p className="font-mono text-pixel-blue text-sm">{formatSfl(item.seq, 4)}</p>
                  </div>
                )}
                {usd !== null && (
                  <div className="text-right min-w-[44px]">
                    <p className="font-pixel text-pixel-muted" style={{ fontSize: '6px' }}>USD</p>
                    <p className="font-mono text-pixel-muted text-sm">{formatUsd(usd)}</p>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── WatchModal ────────────────────────────────────────────────────────────
function WatchModal({ onClose, onSaved, allItems, loadingItems, sflPrice }: {
  onClose:      () => void
  onSaved:      () => void
  allItems:     PickerItem[]
  loadingItems: boolean
  sflPrice:     number | null
}) {
  const { addNotification } = useAppStore()
  const [form, setForm] = useState({
    nft_name: '', collection: '', target_buy_price_sfl: '', price_alert_enabled: false, notes: '',
  })
  const [saving,      setSaving]      = useState(false)
  const [showPicker,  setShowPicker]  = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [livePrice,   setLivePrice]   = useState<{ p2p: number|null; seq: number|null; have_boost?: boolean; boost_text?: string; supply?: number|null } | null>(null)

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSelect = (item: PickerItem) => {
    setF('nft_name',   item.name)
    setF('collection', item.collection)
    // Use p2p as target if available, else seq, else NFT floor
    const best = item.p2p ?? item.seq ?? null
    if (best !== null) setF('target_buy_price_sfl', String(best))
    setLivePrice({ p2p: item.p2p, seq: item.seq, have_boost: item.have_boost, boost_text: item.boost_text, supply: item.supply })
    setShowPicker(false)
  }

  const handleNameChange = (name: string) => {
    setF('nft_name', name)
    setLivePrice(null)
    const match = allItems.find(i => i.name.toLowerCase() === name.toLowerCase())
    if (match) {
      setF('collection', match.collection)
      setLivePrice({ p2p: match.p2p, seq: match.seq, have_boost: match.have_boost, boost_text: match.boost_text, supply: match.supply })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await col('watchlist').create({
        ...form,
        target_buy_price_sfl: form.target_buy_price_sfl ? parseFloat(form.target_buy_price_sfl) : null,
        user_id: pb.authStore.model?.id,
      })
      addNotification('success', 'Added to watchlist!')
      onSaved(); onClose()
    } catch (err: any) {
      addNotification('error', err?.message || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md pixel-border-gold bg-pixel-panel max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-pixel-gold sticky top-0 bg-pixel-panel z-10">
          <h2 className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>◎ ADD TO WATCHLIST</h2>
          <button onClick={onClose} className="font-pixel text-pixel-muted hover:text-pixel-red text-sm">×</button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3">

          {/* Name + picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>ITEM / NFT NAME *</label>
              <button type="button" onClick={() => { setPickerQuery(''); setShowPicker(s => !s) }}
                className="font-pixel text-pixel-blue hover:text-blue-300 flex items-center gap-1"
                style={{ fontSize: '7px' }}>
                {loadingItems
                  ? <span className="animate-pixel-blink">LOADING...</span>
                  : <><span>◈</span> BROWSE {allItems.length > 0 ? `(${allItems.length})` : ''}</>
                }
              </button>
            </div>
            <div className="relative">
              <input value={form.nft_name} onChange={e => handleNameChange(e.target.value)}
                placeholder="Type name or BROWSE ↑" required
                className="pixel-input pr-8 w-full" />
              {livePrice && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-pixel-green"
                  style={{ fontSize: '9px' }}>✓</span>
              )}
            </div>

            {showPicker && (
              <ItemPicker items={allItems} loading={loadingItems} query={pickerQuery}
                onSearch={setPickerQuery} onSelect={handleSelect} sflPrice={sflPrice}
                onClose={() => setShowPicker(false)} />
            )}

            {/* Live price badge */}
            {livePrice && !showPicker && (
              <div className="mt-1 px-2 py-1.5 bg-pixel-bg border border-pixel-green space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-pixel text-pixel-green" style={{ fontSize: '7px' }}>◆ LIVE PRICE</span>
                  {livePrice.p2p !== null && (
                    <span className="font-body text-pixel-gold text-base">FLOOR: {formatSfl(livePrice.p2p, 8)} SFL</span>
                  )}
                  {livePrice.seq !== null && (
                    <span className="font-body text-pixel-blue text-base">SEQ: {formatSfl(livePrice.seq, 8)} SFL</span>
                  )}
                  {livePrice.supply != null && (
                    <span className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>
                      SUPPLY: {livePrice.supply.toLocaleString()}
                    </span>
                  )}
                </div>
                {livePrice.have_boost && livePrice.boost_text && (
                  <p className="font-pixel text-pixel-green" style={{ fontSize: '7px' }}>
                    ⚡ {livePrice.boost_text}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Collection (auto-filled, editable) */}
          <PixelInput label="COLLECTION" value={form.collection}
            onChange={e => setF('collection', e.target.value)} placeholder="e.g. Crops, Wearables" />

          {/* Target price */}
          <div>
            <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>
              TARGET BUY PRICE (SFL)
              {livePrice && <span className="ml-2 text-pixel-gold" style={{ fontSize: '6px' }}>← AUTO-FILLED FROM FLOOR</span>}
            </label>
            <input type="number" step="any" min="0"
              value={form.target_buy_price_sfl}
              onChange={e => setF('target_buy_price_sfl', e.target.value)}
              placeholder="0.00" className="pixel-input w-full" />
            {form.target_buy_price_sfl && sflPrice && (
              <p className="font-body text-pixel-muted text-base mt-1">
                ≈ {formatUsd(parseFloat(form.target_buy_price_sfl) * sflPrice)} USD
              </p>
            )}
          </div>

          {/* Alert toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setF('price_alert_enabled', !form.price_alert_enabled)}
              className={`w-8 h-4 border-2 relative transition-colors cursor-pointer ${
                form.price_alert_enabled ? 'border-pixel-gold bg-pixel-gold/20' : 'border-pixel-border'
              }`}>
              {form.price_alert_enabled && <div className="absolute inset-0.5 bg-pixel-gold" />}
            </div>
            <span className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>🔔 ENABLE PRICE ALERT</span>
          </label>

          {/* Notes */}
          <div>
            <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>NOTES</label>
            <textarea className="pixel-input h-16 resize-none w-full" value={form.notes}
              onChange={e => setF('notes', e.target.value)} />
          </div>

          <div className="flex gap-3">
            <PixelButton type="submit" variant="gold" disabled={saving} className="flex-1">
              {saving ? '▓▓▓▓▓' : '◎ ADD TO WATCHLIST'}
            </PixelButton>
            <PixelButton type="button" variant="ghost" onClick={onClose}>CANCEL</PixelButton>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── WatchlistCard ─────────────────────────────────────────────────────────
function WatchlistCard({ item, liveFloors, sflPrice, onDelete }: {
  item:       WatchlistItem
  liveFloors: Record<string, { p2p?: number; seq?: number }>
  sflPrice:   number | null
  onDelete:   () => void
}) {
  const floor    = liveFloors[item.nft_name.toLowerCase()]
  const floorP2p = floor?.p2p
  const floorSeq = floor?.seq
  const bestFloor = Math.min(floorP2p ?? Infinity, floorSeq ?? Infinity)
  const isAtTarget = item.target_buy_price_sfl && bestFloor !== Infinity
    ? bestFloor <= item.target_buy_price_sfl : false

  const priceDiff = item.target_buy_price_sfl && bestFloor !== Infinity
    ? ((bestFloor - item.target_buy_price_sfl) / item.target_buy_price_sfl) * 100
    : null

  return (
    <div className={`bg-pixel-panel transition-colors ${
      isAtTarget ? 'pixel-border-gold pulse-gold' : 'pixel-border'
    }`}>
      {/* Card header */}
      <div className="px-4 py-3 border-b-2 border-pixel-border flex items-start justify-between">
        <div>
          <h3 className="font-pixel text-pixel-text" style={{ fontSize: '9px' }}>{item.nft_name}</h3>
          {item.collection && (
            <p className="font-body text-pixel-muted text-base">{item.collection}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAtTarget && (
            <span className="font-pixel text-pixel-gold animate-pixel-blink" style={{ fontSize: '8px' }}>
              ★ BUY NOW!
            </span>
          )}
          {priceDiff !== null && !isAtTarget && (
            <span className={`font-pixel ${priceDiff > 0 ? 'text-pixel-red' : 'text-pixel-green'}`}
              style={{ fontSize: '7px' }}>
              {priceDiff > 0 ? '▲' : '▼'} {Math.abs(priceDiff).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Prices */}
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-pixel-bg px-2 py-1 border border-pixel-border">
            <p className="font-pixel text-pixel-gold" style={{ fontSize: '6px' }}>FLOOR P2P</p>
            <p className="font-mono text-pixel-gold text-base">
              {floorP2p != null ? formatSfl(floorP2p, 8) : <span className="text-pixel-muted">—</span>}
            </p>
            {floorP2p && sflPrice && (
              <p className="font-body text-pixel-muted text-base">{formatUsd(floorP2p * sflPrice)}</p>
            )}
          </div>
          <div className="bg-pixel-bg px-2 py-1 border border-pixel-border">
            <p className="font-pixel text-pixel-blue" style={{ fontSize: '6px' }}>FLOOR SEQ</p>
            <p className="font-mono text-pixel-blue text-base">
              {floorSeq != null ? formatSfl(floorSeq, 8) : <span className="text-pixel-muted">—</span>}
            </p>
            {floorSeq && sflPrice && (
              <p className="font-body text-pixel-muted text-base">{formatUsd(floorSeq * sflPrice)}</p>
            )}
          </div>
        </div>

        {item.target_buy_price_sfl && (
          <div className={`flex items-center justify-between border-t border-pixel-border pt-2 ${
            isAtTarget ? 'text-pixel-gold' : ''
          }`}>
            <span className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>MY TARGET</span>
            <div className="text-right">
              <span className={`font-pixel ${isAtTarget ? 'text-pixel-gold glow-gold' : 'text-pixel-text'}`}
                style={{ fontSize: '10px' }}>
                {formatSfl(item.target_buy_price_sfl, 8)} SFL
              </span>
              {sflPrice && (
                <p className="font-body text-pixel-muted text-base">
                  {formatUsd(item.target_buy_price_sfl * sflPrice)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-pixel-border px-4 py-2 flex justify-between items-center">
        <span className={`font-pixel ${item.price_alert_enabled ? 'text-pixel-gold' : 'text-pixel-muted'}`}
          style={{ fontSize: '7px' }}>
          {item.price_alert_enabled ? '🔔 ALERT ON' : '🔕 ALERT OFF'}
        </span>
        <button onClick={onDelete}
          className="font-pixel text-pixel-red hover:text-red-300" style={{ fontSize: '8px' }}>
          ✗ REMOVE
        </button>
      </div>
    </div>
  )
}

// ── Main WatchlistContent ─────────────────────────────────────────────────
export default function WatchlistContent() {
  const { addNotification, sflPriceUsd } = useAppStore()
  const [items,         setItems]         = useState<WatchlistItem[]>([])
  const [liveFloors,    setLiveFloors]    = useState<Record<string, { p2p?: number; seq?: number }>>({})
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [refreshing,    setRefreshing]    = useState(false)

  // All items for picker (prices + nfts merged)
  const [allItems,      setAllItems]      = useState<PickerItem[]>([])
  const [loadingItems,  setLoadingItems]  = useState(false)
  const [itemsFetched,  setItemsFetched]  = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const wl = await col('watchlist').getFullList({ sort: 'nft_name' })
      setItems(wl as unknown as WatchlistItem[])
    } catch {}
    finally { setLoading(false) }
  }

  // Fetch + merge prices and NFTs for picker
  const fetchAllItems = useCallback(async () => {
    if (itemsFetched) return
    setLoadingItems(true)
    try {
      const [pricesRes, nftsRes] = await Promise.allSettled([
        fetch('/api/sfl/prices', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/sfl/nfts',   { cache: 'no-store' }).then(r => r.json()),
      ])
      const priceItems = pricesRes.status === 'fulfilled' ? parsePrices(pricesRes.value) : []
      const nftItems   = nftsRes.status   === 'fulfilled' ? parseNfts(nftsRes.value)    : []

      // Build map: NFT data is source of truth for collectibles/wearables
      // Prices API (p2p/seq) enriches floor prices
      const map = new Map<string, PickerItem>()

      // 1. Seed from NFTs API (has names, collections, supply, boost)
      for (const n of nftItems) {
        map.set(n.name, {
          name:       n.name,
          collection: n.collection,
          p2p:        n.floor,     // NFTs API floor = best available price
          seq:        null,
          supply:     n.supply,
          have_boost: n.have_boost,
          boost_text: n.boost_text,
        })
      }

      // 2. Enrich with p2p/seq from prices API (more granular market data)
      for (const p of priceItems) {
        if (map.has(p.name)) {
          const existing = map.get(p.name)!
          map.set(p.name, {
            ...existing,
            p2p: p.p2p ?? existing.p2p,
            seq: p.seq ?? existing.seq,
          })
        } else {
          // Item exists in prices but not NFTs (crops/resources)
          map.set(p.name, {
            name: p.name, collection: 'Resources',
            p2p: p.p2p, seq: p.seq,
            supply: null, have_boost: false, boost_text: '',
          })
        }
      }
      setAllItems(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)))
      setItemsFetched(true)
    } catch (e) {
      console.warn('fetchAllItems:', e)
    } finally {
      setLoadingItems(false)
    }
  }, [itemsFetched])

  // Refresh live floor prices for watchlist items
  const refreshPrices = async () => {
    setRefreshing(true)
    try {
      const res  = await fetch('/api/sfl/prices', { cache: 'no-store' })
      const raw  = await res.json()
      const data = raw?.data ?? raw
      const floors: Record<string, { p2p?: number; seq?: number }> = {}

      const ingest = (src: any, key: 'p2p' | 'seq') => {
        if (!src) return
        for (const [name, val] of Object.entries(src)) {
          const price = typeof val === 'number' ? val : null
          if (!price) continue
          floors[name.toLowerCase()] = { ...floors[name.toLowerCase()], [key]: price }
        }
      }
      ingest(data?.p2p, 'p2p')
      ingest(data?.seq, 'seq')
      ingest(data?.ge,  'p2p')
      setLiveFloors(floors)
      addNotification('success', `Prices updated · ${Object.keys(floors).length} items`)
    } catch {
      addNotification('error', 'Failed to fetch prices')
    } finally { setRefreshing(false) }
  }

  useEffect(() => {
    load()
    fetchAllItems()
  }, [])

  // Auto-refresh prices when items load
  useEffect(() => {
    if (items.length > 0 && Object.keys(liveFloors).length === 0) {
      refreshPrices()
    }
  }, [items.length])

  const handleDelete = async (item: WatchlistItem) => {
    if (!confirm(`Remove "${item.nft_name}" from watchlist?`)) return
    await col('watchlist').delete(item.id)
    addNotification('success', 'Removed from watchlist')
    load()
  }

  const alertCount = items.filter(item => {
    const floor = liveFloors[item.nft_name.toLowerCase()]
    const best  = Math.min(floor?.p2p ?? Infinity, floor?.seq ?? Infinity)
    return item.target_buy_price_sfl && best !== Infinity && best <= item.target_buy_price_sfl
  }).length

  return (
    <div>
      <PageHeader icon="◎" title="WATCHLIST"
        subtitle={`${items.length} ITEMS TRACKED${alertCount > 0 ? ` · ★ ${alertCount} AT TARGET` : ''}`}
        action={
          <div className="flex gap-3">
            <PixelButton variant="blue" onClick={refreshPrices} disabled={refreshing}>
              {refreshing ? '⟳ REFRESHING...' : '⟳ REFRESH PRICES'}
            </PixelButton>
            <PixelButton variant="gold" onClick={() => { fetchAllItems(); setShowModal(true) }}>
              ◎ ADD ITEM
            </PixelButton>
          </div>
        }
      />

      {/* Alert banner */}
      {alertCount > 0 && (
        <div className="mb-4 px-4 py-3 border-2 border-pixel-gold bg-pixel-gold/10 flex items-center gap-3 animate-pixel-slide">
          <span className="font-pixel text-pixel-gold animate-pixel-blink" style={{ fontSize: '10px' }}>★</span>
          <p className="font-pixel text-pixel-gold" style={{ fontSize: '9px' }}>
            {alertCount} ITEM{alertCount > 1 ? 'S' : ''} AT OR BELOW YOUR TARGET PRICE!
          </p>
        </div>
      )}

      {loading ? <PixelLoading /> : items.length === 0 ? (
        <EmptyState icon="◎" title="WATCHLIST EMPTY"
          message="Add items and NFTs to track their floor prices"
          action={
            <PixelButton variant="gold" onClick={() => { fetchAllItems(); setShowModal(true) }}>
              ◎ ADD FIRST ITEM
            </PixelButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <WatchlistCard
              key={item.id}
              item={item}
              liveFloors={liveFloors}
              sflPrice={sflPriceUsd}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <WatchModal
          onClose={() => setShowModal(false)}
          onSaved={load}
          allItems={allItems}
          loadingItems={loadingItems}
          sflPrice={sflPriceUsd}
        />
      )}
    </div>
  )
}
