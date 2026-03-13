/**
 * SFL World Data Sync Service
 * Fetches from 3 APIs and saves to PocketBase:
 *   1. /api/v1.1/exchange  → price_snapshots
 *   2. /api/v1/prices      → nft_market_prices (floor p2p + seq)
 *   3. /api/v1/nfts        → nft_market_prices (supply + metadata)
 */

import pb from '@/lib/pb'

const SFL_API = '/api/sfl'

export interface SyncResult {
  success: boolean
  exchange?: { sfl: number; pol: number; gems: number; coins: number; gemSfl?: number; coinSfl?: number }
  pricesCount?: number
  nftsCount?: number
  errors: string[]
  timestamp: Date
}

export interface SyncProgress {
  step: 'exchange' | 'prices' | 'nfts' | 'saving' | 'done' | 'idle'
  label: string
  pct: number
}

// ─── Fetch helpers (no Next.js cache — always fresh) ──────────────────────

async function apiFetch(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  return res.json()
}

// ─── Parse exchange rates from v1.1/exchange ──────────────────────────────
// API: { sfl:{usd,pol,...,supply}, pol:{usd,...,sfl}, gems:{100:{gem,usd,sfl,...},...}, coins:{160:{sfl,coin,usd,pol},...} }

export interface ExchangeRates {
  sfl:        number   // SFL price in USD
  pol:        number   // POL price in USD
  sflInPol:   number   // SFL price in POL
  sflSupply:  number   // circulating supply
  // Gems: price per 1 gem in USD (smallest pack: 100 gems)
  gemUsd:     number   // USD per gem (smallest pack)
  gemSfl:     number   // SFL per gem (smallest pack)
  gemPacks:   { gems: number; usd: number; sfl: number; pol: number; usdPer1: number }[]
  // Coins: price per 1 coin in SFL (smallest pack: 160 coins)
  coinSfl:    number   // SFL per coin
  coinUsd:    number   // USD per coin
  coinPacks:  { coins: number; sfl: number; usd: number; pol: number; sflPer1: number }[]
  raw:        any
}

function parseExchange(data: any): ExchangeRates {
  // SFL
  const sfl      = typeof data?.sfl?.usd === 'number' ? data.sfl.usd : 0
  const pol      = typeof data?.pol?.usd === 'number' ? data.pol.usd : 0
  const sflInPol = typeof data?.sfl?.pol === 'number' ? data.sfl.pol : (pol > 0 ? sfl / pol : 0)
  const sflSupply= typeof data?.sfl?.supply === 'number' ? data.sfl.supply : 0

  // Gems — object keyed by pack size e.g. "100", "650"...
  const gemPacks: ExchangeRates['gemPacks'] = []
  if (data?.gems && typeof data.gems === 'object') {
    for (const pack of Object.values(data.gems) as any[]) {
      if (!pack?.gem || !pack?.usd) continue
      gemPacks.push({
        gems:    pack.gem,
        usd:     pack.usd,
        sfl:     pack.sfl  ?? 0,
        pol:     pack.pol  ?? 0,
        usdPer1: pack.usd / pack.gem,
      })
    }
    gemPacks.sort((a, b) => a.gems - b.gems)
  }
  const smallestGem = gemPacks[0]
  const gemUsd = smallestGem ? smallestGem.usdPer1 : 0
  const gemSfl = smallestGem && smallestGem.gems > 0 ? smallestGem.sfl / smallestGem.gems : 0

  // Coins — object keyed by pack size e.g. "160", "8640"...
  const coinPacks: ExchangeRates['coinPacks'] = []
  if (data?.coins && typeof data.coins === 'object') {
    for (const pack of Object.values(data.coins) as any[]) {
      if (!pack?.coin || !pack?.sfl) continue
      coinPacks.push({
        coins:   pack.coin,
        sfl:     pack.sfl,
        usd:     pack.usd  ?? 0,
        pol:     pack.pol  ?? 0,
        sflPer1: pack.sfl / pack.coin,
      })
    }
    coinPacks.sort((a, b) => a.coins - b.coins)
  }
  const smallestCoin = coinPacks[0]
  const coinSfl = smallestCoin ? smallestCoin.sflPer1 : 0
  const coinUsd = coinSfl * sfl

  return { sfl, pol, sflInPol, sflSupply, gemUsd, gemSfl, gemPacks, coinSfl, coinUsd, coinPacks, raw: data }
}

// ─── Parse floor prices from v1/prices ────────────────────────────────────

function parsePrices(raw: any): Map<string, { p2p?: number; seq?: number }> {
  // Unwrap envelope: { data: { p2p, seq, ge }, updatedAt } or direct { p2p, seq }
  const data = raw?.data ?? raw
  const map = new Map<string, { p2p?: number; seq?: number }>()

  const process = (source: Record<string, any> | null | undefined, type: 'p2p' | 'seq') => {
    if (!source || typeof source !== 'object') return
    for (const [name, value] of Object.entries(source)) {
      const price = typeof value === 'number' ? value
                  : typeof value === 'object' && value !== null ? (value?.price ?? value?.floor ?? value?.sfl)
                  : null
      if (price == null || price <= 0) continue
      const existing = map.get(name) ?? {}
      map.set(name, { ...existing, [type]: price })
    }
  }

  process(data?.p2p, 'p2p')
  process(data?.seq, 'seq')
  // ge = game economy prices, use as p2p fallback
  if (data?.ge) {
    for (const [name, val] of Object.entries(data.ge as Record<string, any>)) {
      if (map.has(name)) continue
      const price = typeof val === 'number' ? val : null
      if (!price || price <= 0) continue
      map.set(name, { p2p: price })
    }
  }
  // Flat fallback
  if (map.size === 0) process(data, 'p2p')

  return map
}

// ─── Parse NFT data from v1/nfts ──────────────────────────────────────────

function parseNfts(raw: any): Map<string, { supply?: number; price?: number; collection?: string }> {
  // API: { collectibles: [{id,floor,lastSalePrice,supply,name,have_boost,boost_text},...], wearables: [...] }
  const map = new Map<string, { supply?: number; price?: number; collection?: string }>()

  const ingestArray = (arr: any[], collection: string) => {
    if (!Array.isArray(arr)) return
    for (const item of arr) {
      if (!item?.name) continue
      const floor = typeof item.floor === 'number' && item.floor > 0 && item.floor < 1e12
        ? item.floor : null
      map.set(item.name, {
        supply:     typeof item.supply === 'number' ? item.supply : null,
        price:      floor,
        collection,
      })
    }
  }

  // Primary: { collectibles: [...], wearables: [...] }
  if (raw?.collectibles || raw?.wearables) {
    ingestArray(raw.collectibles ?? [], 'collectibles')
    ingestArray(raw.wearables    ?? [], 'wearables')
  } else if (raw?.data) {
    ingestArray(raw.data.collectibles ?? [], 'collectibles')
    ingestArray(raw.data.wearables    ?? [], 'wearables')
  }

  return map
}

// ─── Save price snapshot to PocketBase ────────────────────────────────────

async function savePriceSnapshot(exchange: ExchangeRates) {
  await pb.collection('price_snapshots').create({
    sfl_price_usd:  exchange.sfl,
    pol_price_usd:  exchange.pol,
    gems_price_usd: exchange.gemUsd,
    coins_price_usd:exchange.coinUsd,
    sfl_price_pol:  exchange.pol > 0 ? exchange.sfl / exchange.pol : null,
    source:         'sfl_world_exchange',
    raw_api_response: exchange.raw,
  })
}

// ─── Save/upsert NFT market prices to PocketBase ──────────────────────────

async function saveNftMarketPrices(
  priceMap: Map<string, { p2p?: number; seq?: number }>,
  nftMap:   Map<string, { supply?: number; price?: number; collection?: string }>
): Promise<number> {
  // Merge both maps by NFT name
  const allNames = new Set([...Array.from(priceMap.keys()), ...Array.from(nftMap.keys())])
  let saved = 0

  // Batch in chunks of 20 to avoid overloading PB
  const names = Array.from(allNames)
  for (let i = 0; i < names.length; i += 20) {
    const chunk = names.slice(i, i + 20)
    await Promise.allSettled(chunk.map(async (name) => {
      const pr  = priceMap.get(name)
      const nft = nftMap.get(name)
      try {
        await pb.collection('nft_market_prices').create({
          nft_name:            name,
          collection:          nft?.collection ?? null,
          floor_price_p2p_sfl: pr?.p2p  ?? (nft?.price ?? null),
          floor_price_seq_sfl: pr?.seq  ?? null,
          total_supply:        nft?.supply ?? null,
          source:              'sfl_world_prices',
          raw_api_data:        { prices: pr ?? null, nft: nft ?? null },
        })
        saved++
      } catch { /* skip individual failures */ }
    }))
  }
  return saved
}

// ─── Main sync function ────────────────────────────────────────────────────

export async function syncAllData(
  onProgress?: (p: SyncProgress) => void
): Promise<SyncResult> {
  const errors: string[] = []
  const result: SyncResult = { success: false, errors, timestamp: new Date() }

  const progress = (step: SyncProgress['step'], label: string, pct: number) => {
    onProgress?.({ step, label, pct })
  }

  // ── Step 1: Exchange rates ────────────────────────────────────────────
  progress('exchange', 'Fetching exchange rates...', 10)
  let exchange: ExchangeRates | null = null
  try {
    const raw = await apiFetch(`${SFL_API}/exchange`)
    exchange = parseExchange(raw)
    result.exchange = { sfl: exchange.sfl, pol: exchange.pol, gems: exchange.gemUsd, coins: exchange.coinUsd, gemSfl: exchange.gemSfl, coinSfl: exchange.coinSfl }
  } catch (e: any) {
    errors.push(`Exchange API: ${e.message}`)
  }

  // ── Step 2: Floor prices ──────────────────────────────────────────────
  progress('prices', 'Fetching floor prices...', 35)
  let priceMap = new Map<string, { p2p?: number; seq?: number }>()
  try {
    const raw = await apiFetch(`${SFL_API}/prices`)
    priceMap = parsePrices(raw)
    result.pricesCount = priceMap.size
  } catch (e: any) {
    errors.push(`Prices API: ${e.message}`)
  }

  // ── Step 3: NFT data ──────────────────────────────────────────────────
  progress('nfts', 'Fetching NFT data...', 60)
  let nftMap = new Map<string, { supply?: number; price?: number; collection?: string }>()
  try {
    const raw = await apiFetch(`${SFL_API}/nfts`)
    nftMap = parseNfts(raw)
    result.nftsCount = nftMap.size
  } catch (e: any) {
    errors.push(`NFTs API: ${e.message}`)
  }

  // ── Step 4: Save to PocketBase ────────────────────────────────────────
  progress('saving', 'Saving to database...', 80)

  if (exchange) {
    try {
      await savePriceSnapshot(exchange)
    } catch (e: any) {
      errors.push(`Save exchange snapshot: ${e.message}`)
    }
  }

  if (priceMap.size > 0 || nftMap.size > 0) {
    try {
      await saveNftMarketPrices(priceMap, nftMap)
    } catch (e: any) {
      errors.push(`Save NFT prices: ${e.message}`)
    }
  }

  progress('done', 'Sync complete!', 100)
  result.success = errors.length === 0
  return result
}

// ─── Quick exchange-only sync (for TopBar price ticker) ───────────────────

export async function syncExchangeOnly(): Promise<{
  sfl: number; pol: number; gemUsd: number; coinUsd: number; coinSfl: number
} | null> {
  try {
    const raw = await apiFetch(`${SFL_API}/exchange`)
    const ex = parseExchange(raw)
    if (ex.sfl > 0) {
      await savePriceSnapshot(ex)
    }
    return { sfl: ex.sfl, pol: ex.pol, gemUsd: ex.gemUsd, coinUsd: ex.coinUsd, coinSfl: ex.coinSfl }
  } catch {
    return null
  }
}
