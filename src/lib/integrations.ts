/**
 * Integration helpers:
 * When a Transaction is saved → auto-create CashFlow + trigger portfolio refresh
 */

import pb from '@/lib/pb'
import { col } from '@/lib/pb'
import type { Transaction } from '@/types'

// Map transaction_type → cash_flow direction + category
const TX_TO_CF: Record<string, { direction: 'inflow' | 'outflow'; category: string } | null> = {
  buy_sfl:      { direction: 'outflow', category: 'token_purchase' },
  sell_sfl:     { direction: 'inflow',  category: 'token_sale'     },
  buy_nft:      { direction: 'outflow', category: 'nft_purchase'   },
  sell_nft:     { direction: 'inflow',  category: 'nft_sale'       },
  buy_gems:     { direction: 'outflow', category: 'gem_purchase'   },
  spend_gems:   { direction: 'outflow', category: 'gem_spend'      },
  earn_sfl:     { direction: 'inflow',  category: 'farming_reward' },
  spend_sfl:    { direction: 'outflow', category: 'other'          },
  swap:         null, // skip — no clear in/out
  transfer_in:  { direction: 'inflow',  category: 'other'          },
  transfer_out: { direction: 'outflow', category: 'other'          },
  other:        null,
}

export async function createCashFlowFromTx(tx: {
  id: string
  transaction_type: string
  asset_name?: string
  total_amount_usd?: number | null
  total_amount_sfl?: number | null
  gas_fee_usd?: number | null
  transaction_date: string
  farm_id?: string | null
  user_id?: string
}) {
  const mapping = TX_TO_CF[tx.transaction_type]
  if (!mapping) return   // skip types we don't auto-map

  const totalUsd = tx.total_amount_usd ?? 0
  if (totalUsd <= 0 && !tx.total_amount_sfl) return  // nothing to record

  const d = new Date(tx.transaction_date)

  // Main cash flow entry
  await col('cash_flows').create({
    direction:    mapping.direction,
    category:     mapping.category,
    description:  tx.asset_name || tx.transaction_type,
    amount_usd:   totalUsd,
    amount_sfl:   tx.total_amount_sfl ?? null,
    flow_date:    tx.transaction_date,
    period_year:  d.getFullYear(),
    period_month: d.getMonth() + 1,
    user_id:      tx.user_id ?? pb.authStore.model?.id,
    farm_id:      tx.farm_id ?? null,
    notes:        `Auto from TX #${tx.id}`,
  })

  // Gas fee as separate outflow
  if (tx.gas_fee_usd && tx.gas_fee_usd > 0) {
    await col('cash_flows').create({
      direction:    'outflow',
      category:     'gas_fee',
      description:  `Gas for ${tx.asset_name || tx.transaction_type}`,
      amount_usd:   tx.gas_fee_usd,
      flow_date:    tx.transaction_date,
      period_year:  d.getFullYear(),
      period_month: d.getMonth() + 1,
      user_id:      tx.user_id ?? pb.authStore.model?.id,
      farm_id:      tx.farm_id ?? null,
      notes:        `Auto gas from TX #${tx.id}`,
    })
  }
}
