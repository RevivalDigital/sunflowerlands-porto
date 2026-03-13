// ─── PocketBase Record types ───────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  wallet_address?: string
  farm_id?: number
  preferred_currency?: 'USD' | 'IDR' | 'EUR' | 'SGD' | 'MYR'
  avatar?: string
  created: string
  updated: string
}

export interface Farm {
  id: string
  user_id: string
  farm_nft_id: number
  name?: string
  wallet_address?: string
  is_active: boolean
  notes?: string
  created: string
  updated: string
}

export type TransactionType =
  | 'buy_sfl' | 'sell_sfl'
  | 'buy_nft' | 'sell_nft'
  | 'buy_gems' | 'spend_gems'
  | 'earn_sfl' | 'spend_sfl'
  | 'swap' | 'transfer_in' | 'transfer_out' | 'other'

export type AssetType = 'SFL' | 'POL' | 'USDC' | 'GEMS' | 'COINS' | 'NFT' | 'ITEM' | 'OTHER'

export type MarketSource = 'plaza_p2p' | 'sequence_market' | 'opensea' | 'direct' | 'in_game' | 'other'

export interface Transaction {
  id: string
  user_id: string
  farm_id?: string
  transaction_type: TransactionType
  asset_type: AssetType
  asset_name?: string
  quantity: number
  unit_price_sfl?: number
  unit_price_usd?: number
  total_amount_sfl?: number
  total_amount_usd?: number
  gas_fee_pol?: number
  gas_fee_usd?: number
  market_fee?:    number
  market_source?: MarketSource
  tx_hash?: string
  sfl_price_usd_at_tx?: number
  pol_price_usd_at_tx?: number
  transaction_date: string
  notes?: string
  created: string
  updated: string
  // expanded relations
  expand?: {
    farm_id?: Farm
  }
}

export type CashFlowDirection = 'inflow' | 'outflow'
export type CashFlowCategory =
  | 'farming_reward' | 'nft_sale' | 'nft_purchase'
  | 'token_purchase' | 'token_sale' | 'gem_purchase' | 'gem_spend'
  | 'gas_fee' | 'platform_fee' | 'bonus' | 'airdrop' | 'other'

export interface CashFlow {
  id: string
  user_id: string
  farm_id?: string
  transaction_id?: string
  direction: CashFlowDirection
  category: CashFlowCategory
  description?: string
  amount_sfl?: number
  amount_pol?: number
  amount_usd: number
  amount_gems?: number
  amount_coins?: number
  flow_date: string
  period_year?: number
  period_month?: number
  notes?: string
  created: string
  updated: string
}

export interface Portfolio {
  id: string
  user_id: string
  farm_id?: string
  sfl_balance: number
  pol_balance: number
  gems_balance: number
  coins_balance: number
  total_nft_value_sfl: number
  total_value_usd: number
  snapshot_date: string
  notes?: string
  created: string
  updated: string
}

export type NftRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical'
export type NftStatus = 'holding' | 'listed' | 'sold' | 'burned'

export interface NftHolding {
  id: string
  user_id: string
  farm_id?: string
  nft_name: string
  collection?: string
  token_id?: number
  quantity: number
  avg_cost_sfl?: number
  avg_cost_usd?: number
  floor_price_p2p_sfl?: number
  floor_price_seq_sfl?: number
  total_supply?: number
  rarity?: NftRarity
  status?: NftStatus
  acquired_date?: string
  price_last_updated?: string
  notes?: string
  created: string
  updated: string
}

export interface PriceSnapshot {
  id: string
  sfl_price_usd: number
  pol_price_usd: number
  gems_price_usd?: number
  coins_price_usd?: number
  sfl_price_pol?: number
  source?: 'sfl_world_exchange' | 'sfl_world_prices' | 'manual'
  raw_api_response?: Record<string, unknown>
  snapshot_at: string
  created: string
  updated: string
}

export interface NftMarketPrice {
  id: string
  nft_name: string
  collection?: string
  token_id?: number
  floor_price_p2p_sfl?: number
  floor_price_seq_sfl?: number
  total_supply?: number
  rarity?: NftRarity
  raw_api_data?: Record<string, unknown>
  fetched_at: string
  created: string
  updated: string
}

export interface PnlSummary {
  id: string
  user_id: string
  farm_id?: string
  period_year: number
  period_month?: number
  total_inflow_usd: number
  total_outflow_usd: number
  net_pnl_usd: number
  roi_percentage: number
  farming_income_usd: number
  nft_trading_pnl_usd: number
  total_gas_fees_usd: number
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'all_time'
  notes?: string
  created: string
  updated: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  nft_name: string
  collection?: string
  target_buy_price_sfl?: number
  price_alert_enabled: boolean
  notes?: string
  created: string
  updated: string
}

// ─── SFL World API types ───────────────────────────────────────────────────

export interface ExchangeRates {
  sfl: { usd: number; change24h?: number }
  pol: { usd: number; change24h?: number }
  gems: { usd: number }
  coins: { usd: number }
}

export interface ItemPrice {
  p2p?: number   // Plaza P2P floor in SFL
  seq?: number   // Sequence Market floor in SFL
}

export interface NftApiData {
  name: string
  supply: number
  price?: number
  collection?: string
}

// ─── UI State types ────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  timestamp: number
}

export interface DashboardStats {
  totalValueUsd: number
  sflBalance: number
  polBalance: number
  gemsBalance: number
  coinsBalance: number
  totalNftCount: number
  totalNftValueUsd: number
  monthlyPnl: number
  monthlyPnlPercent: number
  allTimePnl: number
}
