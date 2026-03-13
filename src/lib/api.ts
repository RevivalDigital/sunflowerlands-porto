/**
 * SFL World API client
 *
 * All fetches go through /api/sfl/* (Next.js proxy) to avoid CORS.
 * Direct fetch to sfl.world is blocked by browsers — the proxy runs
 * server-side where CORS does not apply.
 */

// Proxy base — always relative so it works on any host/port
const PROXY = '/api/sfl'

export async function fetchExchangeRates() {
  const res = await fetch(`${PROXY}/exchange`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Exchange proxy error: HTTP ${res.status}`)
  return res.json()
}

export async function fetchPrices() {
  const res = await fetch(`${PROXY}/prices`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Prices proxy error: HTTP ${res.status}`)
  return res.json()
}

export async function fetchNfts() {
  const res = await fetch(`${PROXY}/nfts`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`NFTs proxy error: HTTP ${res.status}`)
  return res.json()
}

// ── Formatters ────────────────────────────────────────────────────────────

export function formatSfl(value: number | undefined | null, decimals = 2): string {
  if (value == null) return '—'
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatUsd(value: number | undefined | null, decimals = 2): string {
  if (value == null) return '—'
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatPct(value: number | undefined | null): string {
  if (value == null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function pnlColor(value: number): string {
  if (value > 0) return 'text-pixel-green glow-green'
  if (value < 0) return 'text-pixel-red glow-red'
  return 'text-pixel-muted'
}

export const RARITY_COLORS: Record<string, string> = {
  common:    '#9ca3af',
  uncommon:  '#4ade80',
  rare:      '#60a5fa',
  epic:      '#c084fc',
  legendary: '#fbbf24',
  mythical:  '#f87171',
}

export const TX_TYPE_LABELS: Record<string, string> = {
  buy_sfl:      '▼ BUY SFL',
  sell_sfl:     '▲ SELL SFL',
  buy_nft:      '▼ BUY NFT',
  sell_nft:     '▲ SELL NFT',
  buy_gems:     '▼ BUY GEMS',
  spend_gems:   '◆ SPEND GEMS',
  earn_sfl:     '★ EARN SFL',
  spend_sfl:    '◆ SPEND SFL',
  swap:         '⇄ SWAP',
  transfer_in:  '→ IN',
  transfer_out: '← OUT',
  other:        '? OTHER',
}

export const TX_TYPE_COLORS: Record<string, string> = {
  buy_sfl:      'text-pixel-red',
  sell_sfl:     'text-pixel-green',
  buy_nft:      'text-pixel-red',
  sell_nft:     'text-pixel-green',
  buy_gems:     'text-pixel-red',
  spend_gems:   'text-pixel-muted',
  earn_sfl:     'text-pixel-gold',
  spend_sfl:    'text-pixel-muted',
  swap:         'text-pixel-blue',
  transfer_in:  'text-pixel-green',
  transfer_out: 'text-pixel-red',
  other:        'text-pixel-muted',
}
