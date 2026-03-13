'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import pb from '@/lib/pb'
import { col } from '@/lib/pb'
import { useAppStore } from '@/lib/store'
import { formatUsd, formatSfl, TX_TYPE_LABELS, TX_TYPE_COLORS } from '@/lib/api'
import { createCashFlowFromTx } from '@/lib/integrations'
import {
  PageHeader, PixelCard, PixelButton, PixelInput, PixelSelect,
  PixelTable, PixelLoading,
} from '@/components/ui'
import type { Transaction } from '@/types'
import { format } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────



interface TxFormData {
  transaction_type: string
  asset_type:       string
  asset_name:       string
  quantity:         string
  unit_price_sfl:   string
  unit_price_usd:   string
  gas_fee_usd:      string
  market_fee:       string
  market_source:    string
  tx_hash:          string
  transaction_date: string
  notes:            string
}

const EMPTY_FORM: TxFormData = {
  transaction_type: 'buy_nft',
  asset_type:       'NFT',
  asset_name:       '',
  quantity:         '1',
  unit_price_sfl:   '',
  unit_price_usd:   '',
  gas_fee_usd:      '',
  market_fee:       '0',
  market_source:    '',
  tx_hash:          '',
  transaction_date: format(new Date(), 'yyyy-MM-dd'),
  notes:            '',
}

const TX_TYPES = [
  { value: '',             label: 'ALL TYPES' },
  { value: 'buy_sfl',      label: '▼ BUY SFL' },
  { value: 'sell_sfl',     label: '▲ SELL SFL' },
  { value: 'buy_nft',      label: '▼ BUY NFT' },
  { value: 'sell_nft',     label: '▲ SELL NFT' },
  { value: 'buy_gems',     label: '▼ BUY GEMS' },
  { value: 'spend_gems',   label: '◆ SPEND GEMS' },
  { value: 'earn_sfl',     label: '★ EARN SFL' },
  { value: 'spend_sfl',    label: '◆ SPEND SFL' },
  { value: 'swap',         label: '⇄ SWAP' },
  { value: 'transfer_in',  label: '→ TRANSFER IN' },
  { value: 'transfer_out', label: '← TRANSFER OUT' },
  { value: 'other',        label: '? OTHER' },
]

const ASSET_TYPES = [
  { value: '',      label: 'ALL ASSETS' },
  { value: 'SFL',   label: 'SFL' },
  { value: 'POL',   label: 'POL (MATIC)' },
  { value: 'GEMS',  label: 'GEMS' },
  { value: 'COINS', label: 'COINS' },
  { value: 'NFT',   label: 'NFT' },
  { value: 'ITEM',  label: 'ITEM' },
  { value: 'OTHER', label: 'OTHER' },
]

// Asset types that benefit from the item picker
const PICKER_ASSET_TYPES = new Set(['NFT', 'ITEM'])

// ── Unified picker item (prices API + NFTs API merged) ────────────────────

interface PriceItem {
  name:       string
  collection: string   // 'collectibles' | 'wearables' | 'Resources'
  p2p:        number | null
  seq:        number | null
  supply:     number | null
  have_boost: boolean
  boost_text: string
}

// Parse /api/sfl/prices → { data: { p2p:{name:price}, seq:{}, ge:{} } }
function parsePricesIntoMap(raw: any, map: Map<string, PriceItem>) {
  const data = raw?.data ?? raw
  const ingest = (src: any, key: 'p2p' | 'seq') => {
    if (!src || typeof src !== 'object') return
    for (const [name, val] of Object.entries(src)) {
      const price = typeof val === 'number' ? val : null
      if (!price || price <= 0) continue
      const e = map.get(name) ?? { name, collection: 'Resources', p2p: null, seq: null, supply: null, have_boost: false, boost_text: '' }
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
      map.set(name, { name, collection: 'Resources', p2p: price, seq: null, supply: null, have_boost: false, boost_text: '' })
    }
  }
}

// Parse /api/sfl/nfts → { collectibles:[{name,floor,supply,have_boost,boost_text}], wearables:[...] }
function parseNftsIntoMap(raw: any, map: Map<string, PriceItem>) {
  const ingestArr = (arr: any[], collection: string) => {
    if (!Array.isArray(arr)) return
    for (const item of arr) {
      if (!item?.name) continue
      const floor = typeof item.floor === 'number' && item.floor > 0 && item.floor < 1e12 ? item.floor : null
      const existing = map.get(item.name)
      map.set(item.name, {
        name:       item.name,
        collection,
        p2p:        existing?.p2p ?? floor,
        seq:        existing?.seq ?? null,
        supply:     typeof item.supply === 'number' ? item.supply : null,
        have_boost: item.have_boost === 1 || item.have_boost === true,
        boost_text: item.boost_text ?? '',
      })
    }
  }
  const src = raw?.collectibles || raw?.wearables ? raw : (raw?.data ?? {})
  ingestArr(src.collectibles ?? [], 'collectibles')
  ingestArr(src.wearables    ?? [], 'wearables')
}

// ── Item Picker with search + price display ────────────────────────────────

interface ItemPickerProps {
  items:     PriceItem[]
  loading:   boolean
  query:     string
  onSearch:  (q: string) => void
  onSelect:  (item: PriceItem) => void
  sflPrice:  number | null
}

function ItemPicker({ items, loading, query, onSearch, onSelect, sflPrice }: ItemPickerProps) {
  const [tab, setTab] = useState<'all' | 'collectibles' | 'wearables' | 'resources'>('all')

  const filtered = items
    .filter(i => tab === 'all' ? true
               : tab === 'resources' ? i.collection === 'Resources'
               : i.collection === tab)
    .filter(i => !query.trim() || i.name.toLowerCase().includes(query.toLowerCase()))

  const counts = {
    all:          items.length,
    collectibles: items.filter(i => i.collection === 'collectibles').length,
    wearables:    items.filter(i => i.collection === 'wearables').length,
    resources:    items.filter(i => i.collection === 'Resources').length,
  }

  return (
    <div className="border-2 border-pixel-gold bg-pixel-bg">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-pixel-border bg-pixel-panel">
        <span className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>🔍</span>
        <input autoFocus value={query} onChange={e => onSearch(e.target.value)}
          placeholder="SEARCH NFT / ITEM..."
          className="flex-1 bg-transparent font-body text-pixel-text text-xl outline-none placeholder-pixel-muted" />
        {loading
          ? <span className="font-pixel text-pixel-muted animate-pixel-blink" style={{ fontSize: '7px' }}>LOADING...</span>
          : <span className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>{filtered.length}</span>
        }
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-pixel-border">
        {([
          ['all',          'ALL',          counts.all],
          ['collectibles', 'COLLECTIBLES', counts.collectibles],
          ['wearables',    'WEARABLES',    counts.wearables],
          ['resources',    'RESOURCES',    counts.resources],
        ] as const).map(([key, label, count]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex-1 py-1.5 font-pixel border-r border-pixel-border last:border-r-0 transition-colors ${
              tab === key ? 'bg-pixel-gold/20 text-pixel-gold' : 'text-pixel-muted hover:text-pixel-text'
            }`} style={{ fontSize: '6px' }}>
            {label}<br/><span style={{ fontSize: '7px' }}>{count}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-52">
        {filtered.length === 0 && !loading && (
          <p className="font-pixel text-pixel-muted text-center py-6" style={{ fontSize: '8px' }}>
            {query ? `NO RESULTS FOR "${query}"` : 'NO ITEMS IN THIS CATEGORY'}
          </p>
        )}
        {filtered.map(item => {
          const bestPrice = item.p2p ?? item.seq ?? null
          const usd = bestPrice !== null && sflPrice ? bestPrice * sflPrice : null
          const colColor = item.collection === 'collectibles' ? 'text-pixel-gold'
                         : item.collection === 'wearables'    ? 'text-pixel-blue'
                         : 'text-pixel-muted'
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
                      {item.collection === 'collectibles' ? 'COLLECTIBLE'
                       : item.collection === 'wearables'   ? 'WEARABLE' : 'RESOURCE'}
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

// ── TxModal ────────────────────────────────────────────────────────────────

function TxModal({ onClose, onSaved, editTx }: {
  onClose:  () => void
  onSaved:  () => void
  editTx?:  Transaction | null
}) {
  const { currentFarm, addNotification, sflPriceUsd, polPriceUsd, gemsPriceUsd, coinsPriceSfl, coinsPriceUsd } = useAppStore()

  const [form, setForm] = useState<TxFormData>(editTx ? {
    transaction_type: editTx.transaction_type,
    asset_type:       editTx.asset_type,
    asset_name:       editTx.asset_name || '',
    quantity:         String(editTx.quantity),
    unit_price_sfl:   String(editTx.unit_price_sfl || ''),
    unit_price_usd:   String(editTx.unit_price_usd || ''),
    gas_fee_usd:      String(editTx.gas_fee_usd || ''),
    market_fee:       String(editTx.market_fee ?? 0),
    market_source:    editTx.market_source || '',
    tx_hash:          editTx.tx_hash || '',
    transaction_date: editTx.transaction_date.slice(0, 10),
    notes:            editTx.notes || '',
  } : EMPTY_FORM)

  const [saving,       setSaving]       = useState(false)
  const [showPicker,   setShowPicker]   = useState(false)
  const [pickerQuery,  setPickerQuery]  = useState('')
  const [priceItems,   setPriceItems]   = useState<PriceItem[]>([])
  const [pricesLoading,setPricesLoading]= useState(false)
  const [pricesFetched,setPricesFetched]= useState(false)
  const [fetchedPrice, setFetchedPrice] = useState<{ p2p: number|null; seq: number|null; have_boost?: boolean; boost_text?: string; supply?: number|null } | null>(null)

  const set = (k: keyof TxFormData, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Per-asset live rate: returns { sfl, usd } for 1 unit of the selected asset
  const assetRate = (() => {
    switch (form.asset_type) {
      case 'SFL':   return { sfl: 1,                              usd: sflPriceUsd ?? 0 }
      case 'POL':   return { sfl: polPriceUsd && sflPriceUsd && sflPriceUsd > 0
                                    ? polPriceUsd / sflPriceUsd : 0,
                             usd: polPriceUsd ?? 0 }
      case 'GEMS':  return { sfl: gemsPriceUsd && sflPriceUsd && sflPriceUsd > 0
                                    ? gemsPriceUsd / sflPriceUsd : 0,
                             usd: gemsPriceUsd ?? 0 }
      case 'COINS': return { sfl: coinsPriceSfl ?? 0,
                             usd: coinsPriceUsd ?? 0 }
      default:      return null   // NFT/ITEM — priced per item
    }
  })()

  // Totals
  // Market fee is deducted FROM the sale (platform keeps fee%, seller receives less)
  // e.g. sell 100 SFL at 20% fee → fee = 20 SFL, net received = 80 SFL
  const qty       = parseFloat(form.quantity      || '0')
  const priceSfl  = parseFloat(form.unit_price_sfl || '0')
  const priceUsd  = parseFloat(form.unit_price_usd || '0')
  const feePct    = parseFloat(form.market_fee     || '0') / 100
  const totalSfl  = qty * priceSfl
  const feeSfl    = totalSfl * feePct
  const netSfl    = totalSfl - feeSfl          // net received after fee deduction
  const totalUsd  = priceSfl > 0 && sflPriceUsd
    ? netSfl * sflPriceUsd
    : qty * priceUsd * (1 - feePct)

  // Show picker when asset type is NFT/ITEM
  const showItemPicker = PICKER_ASSET_TYPES.has(form.asset_type)

  // Fetch prices + NFTs, merge into single list
  const fetchPrices = useCallback(async () => {
    if (pricesFetched) return
    setPricesLoading(true)
    try {
      const [pricesRes, nftsRes] = await Promise.allSettled([
        fetch('/api/sfl/prices', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/sfl/nfts',   { cache: 'no-store' }).then(r => r.json()),
      ])
      const map = new Map<string, PriceItem>()
      if (nftsRes.status   === 'fulfilled') parseNftsIntoMap(nftsRes.value,   map)
      if (pricesRes.status === 'fulfilled') parsePricesIntoMap(pricesRes.value, map)
      setPriceItems(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)))
      setPricesFetched(true)
    } catch (e) {
      console.error('prices/nfts fetch:', e)
    } finally {
      setPricesLoading(false)
    }
  }, [pricesFetched])

  // Auto-fetch prices when switching to NFT/ITEM asset type
  useEffect(() => {
    if (showItemPicker && !pricesFetched) {
      fetchPrices()
    }
  }, [showItemPicker, fetchPrices, pricesFetched])

  // Open picker
  const handleOpenPicker = () => {
    setPickerQuery('')
    setShowPicker(true)
    if (!pricesFetched) fetchPrices()
  }

  // Select item from picker → auto-fill name + price
  const handleSelectItem = (item: PriceItem) => {
    const bestPrice = item.p2p ?? item.seq ?? null
    const src = item.collection === 'collectibles' || item.collection === 'wearables'
      ? 'plaza_p2p'
      : item.p2p !== null ? 'plaza_p2p' : item.seq !== null ? 'sequence_market' : ''

    set('asset_name',    item.name)
    set('market_source', src)
    if (bestPrice !== null) {
      set('unit_price_sfl', String(bestPrice))
      if (sflPriceUsd) {
        set('unit_price_usd', (bestPrice * sflPriceUsd).toFixed(4))
      }
    }
    setFetchedPrice({ p2p: item.p2p, seq: item.seq, have_boost: item.have_boost, boost_text: item.boost_text, supply: item.supply })
    setShowPicker(false)
  }

  // When user manually types asset name, look up price
  const handleAssetNameChange = (name: string) => {
    set('asset_name', name)
    setFetchedPrice(null)
    if (!name.trim() || priceItems.length === 0) return
    const match = priceItems.find(
      i => i.name.toLowerCase() === name.toLowerCase()
    )
    if (match) setFetchedPrice({ p2p: match.p2p, seq: match.seq })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data: any = {
        ...form,
        quantity:           parseFloat(form.quantity),
        unit_price_sfl:     form.unit_price_sfl  ? parseFloat(form.unit_price_sfl)  : null,
        unit_price_usd:     form.unit_price_usd  ? parseFloat(form.unit_price_usd)  : null,
        gas_fee_usd:        form.gas_fee_usd     ? parseFloat(form.gas_fee_usd)     : null,
        total_amount_sfl:   netSfl  || null,
        total_amount_usd:   totalUsd || null,
        sfl_price_usd_at_tx: sflPriceUsd,
        user_id:            pb.authStore.model?.id,
        farm_id:            currentFarm?.id || null,
        market_source:      form.market_source || null,
        tx_hash:            form.tx_hash || null,
        notes:              form.notes   || null,
      }
      if (editTx) {
        await col('transactions').update(editTx.id, data)
        addNotification('success', 'Transaction updated!')
      } else {
        const saved = await col('transactions').create(data)
        // Auto-create cash flow entry
        try {
          await createCashFlowFromTx({
            id: saved.id,
            transaction_type: data.transaction_type,
            asset_name: data.asset_name,
            total_amount_usd: data.total_amount_usd,
            total_amount_sfl: data.total_amount_sfl,
            gas_fee_usd: data.gas_fee_usd,
            transaction_date: data.transaction_date,
            farm_id: data.farm_id,
            user_id: data.user_id,
          })
        } catch (cfErr) {
          console.warn('Cash flow auto-create failed:', cfErr)
        }
        addNotification('success', 'Transaction saved! Cash flow updated ✓')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      addNotification('error', err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg pixel-border-gold bg-pixel-panel max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-pixel-gold sticky top-0 bg-pixel-panel z-10">
          <h2 className="font-pixel text-pixel-gold" style={{ fontSize: '10px' }}>
            {editTx ? '✎ EDIT TRANSACTION' : '+ NEW TRANSACTION'}
          </h2>
          <button onClick={onClose}
            className="font-pixel text-pixel-muted hover:text-pixel-red text-sm">×</button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-3">

          {/* TYPE + ASSET TYPE */}
          <div className="grid grid-cols-2 gap-3">
            <PixelSelect label="TYPE" value={form.transaction_type}
              onChange={e => set('transaction_type', e.target.value)}
              options={TX_TYPES.slice(1)} />
            <PixelSelect label="ASSET TYPE" value={form.asset_type}
              onChange={e => {
                const type = e.target.value
                set('asset_type', type)
                setFetchedPrice(null)
                // Auto-fill price for non-NFT/ITEM assets
                const rates: Record<string, { sfl: number; usd: number }> = {
                  SFL:   { sfl: 1,                                                          usd: sflPriceUsd ?? 0 },
                  POL:   { sfl: polPriceUsd && sflPriceUsd ? polPriceUsd / sflPriceUsd : 0, usd: polPriceUsd ?? 0 },
                  GEMS:  { sfl: gemsPriceUsd && sflPriceUsd ? gemsPriceUsd / sflPriceUsd : 0, usd: gemsPriceUsd ?? 0 },
                  COINS: { sfl: coinsPriceSfl ?? 0,                                          usd: coinsPriceUsd ?? 0 },
                }
                const r = rates[type]
                if (r && r.sfl > 0) {
                  set('unit_price_sfl', r.sfl.toFixed(8))
                  set('unit_price_usd', r.usd.toFixed(6))
                }
              }}
              options={ASSET_TYPES.slice(1)} />
          </div>

          {/* ASSET NAME — with picker button for NFT/ITEM */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>
                ASSET NAME
              </label>
              {showItemPicker && (
                <button
                  type="button"
                  onClick={handleOpenPicker}
                  className="font-pixel text-pixel-blue hover:text-blue-300 flex items-center gap-1"
                  style={{ fontSize: '7px' }}
                >
                  {pricesLoading
                    ? <span className="animate-pixel-blink">LOADING PRICES...</span>
                    : <><span>◈</span> BROWSE NFT/ITEMS {priceItems.length > 0 ? `(${priceItems.length})` : ''}</>
                  }
                </button>
              )}
            </div>

            <div className="relative">
              <input
                value={form.asset_name}
                onChange={e => handleAssetNameChange(e.target.value)}
                placeholder={showItemPicker ? 'Type name or press BROWSE ITEMS ↑' : 'e.g. Bumpkin Hat, SFL, Gem'}
                className="pixel-input pr-10"
              />
              {/* Live match indicator */}
              {fetchedPrice && (form.asset_name) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-pixel-green"
                  style={{ fontSize: '9px' }}>✓</span>
              )}
            </div>

            {/* Item Picker dropdown */}
            {showPicker && showItemPicker && (
              <div className="mt-1">
                <ItemPicker
                  items={priceItems}
                  loading={pricesLoading}
                  query={pickerQuery}
                  onSearch={setPickerQuery}
                  onSelect={handleSelectItem}
                  sflPrice={sflPriceUsd}
                />
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="w-full font-pixel text-pixel-muted hover:text-pixel-red py-1 border-x-2 border-b-2 border-pixel-border bg-pixel-panel"
                  style={{ fontSize: '7px' }}
                >
                  ✕ CLOSE PICKER
                </button>
              </div>
            )}

            {/* Fetched price badge */}
            {fetchedPrice && !showPicker && (form.asset_name) && (
              <div className="mt-1 px-2 py-1.5 bg-pixel-bg border border-pixel-green space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-pixel text-pixel-green" style={{ fontSize: '7px' }}>◆ MARKET PRICE</span>
                  {fetchedPrice.p2p !== null && (
                    <span className="font-body text-pixel-gold text-base">
                      FLOOR: {formatSfl(fetchedPrice.p2p, 8)} SFL
                    </span>
                  )}
                  {fetchedPrice.seq !== null && (
                    <span className="font-body text-pixel-blue text-base">
                      SEQ: {formatSfl(fetchedPrice.seq, 8)} SFL
                    </span>
                  )}
                  {fetchedPrice.supply != null && (
                    <span className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>
                      SUPPLY: {fetchedPrice.supply.toLocaleString()}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const price = fetchedPrice.p2p ?? fetchedPrice.seq ?? null
                      if (price !== null) {
                        set('unit_price_sfl', String(price))
                        if (sflPriceUsd) set('unit_price_usd', (price * sflPriceUsd).toFixed(4))
                        set('market_source', fetchedPrice.p2p !== null ? 'plaza_p2p' : 'sequence_market')
                      }
                    }}
                    className="ml-auto font-pixel text-pixel-green hover:text-green-300 border border-pixel-green px-2 py-0.5"
                    style={{ fontSize: '7px' }}
                  >
                    ↓ USE PRICE
                  </button>
                </div>
                {fetchedPrice.have_boost && fetchedPrice.boost_text && (
                  <p className="font-pixel text-pixel-green" style={{ fontSize: '7px' }}>⚡ {fetchedPrice.boost_text}</p>
                )}
              </div>
            )}
          </div>

          {/* QTY + UNIT PRICE SFL */}
          <div className="grid grid-cols-2 gap-3">
            <PixelInput
              label="QUANTITY"
              type="number" step="any" min="0"
              value={form.quantity}
              onChange={e => set('quantity', e.target.value)}
              required
            />
            <div>
              <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>
                UNIT PRICE (SFL)
                {fetchedPrice && (
                  <span className="ml-2 text-pixel-gold" style={{ fontSize: '6px' }}>← FROM API</span>
                )}
                {assetRate && assetRate.sfl > 0 && (
                  <span className="ml-2 text-pixel-green" style={{ fontSize: '6px' }}>
                    ◆ LIVE: {assetRate.sfl.toFixed(8)}
                  </span>
                )}
              </label>
              <div className="flex gap-1">
                <input
                  type="number" step="any" min="0"
                  value={form.unit_price_sfl}
                  onChange={e => {
                    set('unit_price_sfl', e.target.value)
                    if (sflPriceUsd && e.target.value) {
                      set('unit_price_usd', (parseFloat(e.target.value) * sflPriceUsd).toFixed(6))
                    }
                  }}
                  placeholder="0.00"
                  className="pixel-input flex-1"
                />
                {assetRate && assetRate.sfl > 0 && (
                  <button type="button"
                    onClick={() => {
                      set('unit_price_sfl', assetRate.sfl.toFixed(8))
                      set('unit_price_usd', assetRate.usd.toFixed(6))
                    }}
                    className="font-pixel text-pixel-green border border-pixel-green px-2 hover:bg-pixel-green/10 flex-shrink-0"
                    style={{ fontSize: '7px' }}>
                    ↓ USE
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* USD PRICE + GAS FEE */}
          <div className="grid grid-cols-2 gap-3">
            <PixelInput
              label="UNIT PRICE (USD)"
              type="number" step="any" min="0"
              value={form.unit_price_usd}
              onChange={e => set('unit_price_usd', e.target.value)}
              placeholder="0.00"
            />
            <PixelInput
              label="GAS FEE (USD)"
              type="number" step="any" min="0"
              value={form.gas_fee_usd}
              onChange={e => set('gas_fee_usd', e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Total preview */}
          {(totalSfl > 0 || totalUsd > 0) && (
            <div className="bg-pixel-bg px-3 py-2 border-2 border-pixel-border space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>
                    GROSS {feePct > 0 ? `(${qty}×${formatSfl(priceSfl,4)})` : 'TOTAL'}
                  </p>
                  <p className="font-body text-pixel-gold text-xl">{formatSfl(totalSfl, 8)} SFL</p>
                </div>
                {feePct > 0 && (
                  <div className="text-right">
                    <p className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>
                      FEE ({form.market_fee}%)
                    </p>
                    <p className="font-body text-pixel-red text-xl">−{formatSfl(feeSfl, 8)} SFL</p>
                  </div>
                )}
                {feePct > 0 && (
                  <div className="text-right border-l border-pixel-border pl-2">
                    <p className="font-pixel text-pixel-green" style={{ fontSize: '7px' }}>NET RECEIVED</p>
                    <p className="font-body text-pixel-green text-xl">{formatSfl(netSfl, 8)} SFL</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-pixel-border pt-1">
                <p className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>≈ USD (net)</p>
                <div className="flex items-center gap-3">
                  <p className="font-body text-pixel-text text-lg">{formatUsd(totalUsd)}</p>
                  {form.gas_fee_usd && parseFloat(form.gas_fee_usd) > 0 && (
                    <p className="font-body text-pixel-red text-lg">
                      − {formatUsd(parseFloat(form.gas_fee_usd))} gas
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MARKET FEE + MARKET SOURCE */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>
                MARKET FEE
                {feePct > 0 && totalSfl > 0 && (
                  <span className="ml-2 text-pixel-red" style={{ fontSize: '6px' }}>
                    −{formatSfl(feeSfl, 4)} SFL
                  </span>
                )}
              </label>
              <div className="grid grid-cols-4 gap-1 mb-1">
                {['0','7.5','10','15','20','25','50'].map(pct => (
                  <button key={pct} type="button"
                    onClick={() => set('market_fee', pct)}
                    className={`font-pixel px-1 py-1 border text-center transition-colors ${
                      form.market_fee === pct
                        ? 'border-pixel-gold bg-pixel-gold/20 text-pixel-gold'
                        : 'border-pixel-border text-pixel-muted hover:border-pixel-gold/50 hover:text-pixel-text'
                    }`}
                    style={{ fontSize: '7px' }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number" step="0.01" min="0" max="100"
                  value={form.market_fee}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= 100)) set('market_fee', v)
                  }}
                  placeholder="Custom %"
                  className="pixel-input flex-1"
                  style={{ fontSize: '10px' }}
                />
                <span className="font-pixel text-pixel-muted" style={{ fontSize: '9px' }}>%</span>
              </div>
            </div>
            <PixelSelect
              label="MARKET SOURCE"
              value={form.market_source}
              onChange={e => set('market_source', e.target.value)}
              options={[
                { value: '',                label: 'SELECT...'   },
                { value: 'plaza_p2p',       label: 'PLAZA P2P'   },
                { value: 'sequence_market', label: 'SEQUENCE'     },
                { value: 'opensea',         label: 'OPENSEA'      },
                { value: 'direct',          label: 'DIRECT'       },
                { value: 'in_game',         label: 'IN-GAME'      },
                { value: 'other',           label: 'OTHER'        },
              ]}
            />
          </div>

          {/* DATE */}
          <PixelInput
            label="DATE"
            type="date"
            value={form.transaction_date}
            onChange={e => set('transaction_date', e.target.value)}
            required
          />

          {/* TX HASH */}
          <PixelInput
            label="TX HASH (optional)"
            value={form.tx_hash}
            onChange={e => set('tx_hash', e.target.value)}
            placeholder="0x..."
          />

          {/* NOTES */}
          <div>
            <label className="font-pixel text-pixel-muted block mb-1" style={{ fontSize: '8px' }}>NOTES</label>
            <textarea
              className="pixel-input h-16 resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <PixelButton type="submit" variant="gold" disabled={saving} className="flex-1">
              {saving ? '▓▓▓▓▓▓▓▓' : '▶ SAVE TX'}
            </PixelButton>
            <PixelButton type="button" variant="ghost" onClick={onClose}>CANCEL</PixelButton>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function TransactionsContent() {
  const { currentFarm, addNotification } = useAppStore()
  const [txs,        setTxs]        = useState<Transaction[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editTx,     setEditTx]     = useState<Transaction | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterAsset,setFilterAsset]= useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadTxs = async () => {
    setLoading(true)
    try {
      const filters: string[] = []
      if (currentFarm) filters.push(`farm_id="${currentFarm.id}"`)
      if (filterType)  filters.push(`transaction_type="${filterType}"`)
      if (filterAsset) filters.push(`asset_type="${filterAsset}"`)
      if (searchTerm)  filters.push(`asset_name~"${searchTerm}"`)
      const result = await col('transactions').getList(page, 20, {
        sort:   '-transaction_date',
        filter: filters.join(' && ') || '',
      })
      setTxs(result.items as unknown as Transaction[])
      setTotalPages(result.totalPages)
    } catch (e) { console.error(e) }
    finally     { setLoading(false) }
  }

  useEffect(() => { loadTxs() }, [currentFarm, filterType, filterAsset, searchTerm, page])

  const handleDelete = async (tx: Transaction) => {
    if (!confirm('DELETE THIS TRANSACTION?\nLinked cash flow entries will also be deleted.')) return
    try {
      // Delete linked auto-generated cash flows first
      try {
        const linked = await col('cash_flows').getList(1, 50, {
          filter: `notes~"Auto from TX #${tx.id}"`,
          requestKey: null,
        })
        await Promise.all(linked.items.map((cf: any) => col('cash_flows').delete(cf.id)))
      } catch { /* no linked cash flows, continue */ }

      await col('transactions').delete(tx.id)
      addNotification('success', 'Transaction + linked cash flows deleted')
      loadTxs()
    } catch { addNotification('error', 'Delete failed') }
  }

  const columns = [
    {
      key: 'transaction_date', header: 'DATE',
      render: (r: Transaction) => (
        <span className="font-mono text-sm text-pixel-muted">
          {format(new Date(r.transaction_date), 'dd/MM/yy')}
        </span>
      ),
    },
    {
      key: 'transaction_type', header: 'TYPE',
      render: (r: Transaction) => (
        <span className={`font-pixel ${TX_TYPE_COLORS[r.transaction_type] || ''}`} style={{ fontSize: '8px' }}>
          {TX_TYPE_LABELS[r.transaction_type] || r.transaction_type}
        </span>
      ),
    },
    {
      key: 'asset_name', header: 'ASSET',
      render: (r: Transaction) => (
        <div>
          <p className="font-body text-pixel-text text-lg">{r.asset_name || r.asset_type}</p>
          <p className="font-pixel text-pixel-muted" style={{ fontSize: '7px' }}>{r.asset_type}</p>
        </div>
      ),
    },
    {
      key: 'quantity', header: 'QTY',
      render: (r: Transaction) => (
        <span className="font-mono text-base text-pixel-text">{formatSfl(r.quantity, 0)}</span>
      ),
    },
    {
      key: 'total_amount_sfl', header: 'TOTAL (SFL)',
      render: (r: Transaction) => (
        <span className="font-mono text-base text-pixel-gold">{formatSfl(r.total_amount_sfl)}</span>
      ),
    },
    {
      key: 'total_amount_usd', header: 'TOTAL (USD)',
      render: (r: Transaction) => (
        <span className="font-mono text-base text-pixel-text">{formatUsd(r.total_amount_usd)}</span>
      ),
    },
    {
      key: 'actions', header: '',
      render: (r: Transaction) => (
        <div className="flex gap-2">
          <button onClick={() => { setEditTx(r); setShowModal(true) }}
            className="font-pixel text-pixel-blue hover:text-blue-300" style={{ fontSize: '9px' }}>✎</button>
          <button onClick={() => handleDelete(r)}
            className="font-pixel text-pixel-red hover:text-red-300" style={{ fontSize: '9px' }}>✗</button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader icon="⇄" title="TRANSACTIONS"
        subtitle={`${txs.length} RECORDS`}
        action={
          <PixelButton variant="gold" onClick={() => { setEditTx(null); setShowModal(true) }}>
            + ADD TX
          </PixelButton>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <PixelInput
          placeholder="SEARCH ASSET..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-48"
        />
        <PixelSelect
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          options={TX_TYPES}
          className="w-40"
        />
        <PixelSelect
          value={filterAsset}
          onChange={e => setFilterAsset(e.target.value)}
          options={ASSET_TYPES}
          className="w-36"
        />
      </div>

      <PixelCard variant="default" className="overflow-hidden p-0">
        {loading ? <PixelLoading /> : (
          <>
            <PixelTable columns={columns} data={txs}
              emptyMessage="NO TRANSACTIONS FOUND · ADD YOUR FIRST TX!"
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-4 border-t-2 border-pixel-border">
                <PixelButton variant="ghost" size="sm" disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}>◄ PREV</PixelButton>
                <span className="font-pixel text-pixel-muted" style={{ fontSize: '8px' }}>
                  PAGE {page}/{totalPages}
                </span>
                <PixelButton variant="ghost" size="sm" disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}>NEXT ►</PixelButton>
              </div>
            )}
          </>
        )}
      </PixelCard>

      {showModal && (
        <TxModal
          onClose={() => setShowModal(false)}
          onSaved={loadTxs}
          editTx={editTx}
        />
      )}
    </div>
  )
}
