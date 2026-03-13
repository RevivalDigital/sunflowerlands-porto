/**
 * Proxy route: /api/sfl/[...path]
 *
 * Forwards requests to sfl.world server-side (no CORS issue).
 * Supports:
 *   GET /api/sfl/exchange  → https://sfl.world/api/v1.1/exchange
 *   GET /api/sfl/prices    → https://sfl.world/api/v1/prices
 *   GET /api/sfl/nfts      → https://sfl.world/api/v1/nfts
 */

import { NextRequest, NextResponse } from 'next/server'

const SFL_ROUTE_MAP: Record<string, string> = {
  exchange: 'https://sfl.world/api/v1.1/exchange',
  prices:   'https://sfl.world/api/v1/prices',
  nfts:     'https://sfl.world/api/v1/nfts',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const key = params.path?.[0]
  const upstream = SFL_ROUTE_MAP[key]

  if (!upstream) {
    return NextResponse.json(
      { error: `Unknown SFL endpoint: "${key}". Valid: ${Object.keys(SFL_ROUTE_MAP).join(', ')}` },
      { status: 404 }
    )
  }

  try {
    const res = await fetch(upstream, {
      headers: { 'Accept': 'application/json' },
      // Server-side fetch — no CORS restriction
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned HTTP ${res.status}`, upstream },
        { status: res.status }
      )
    }

    const data = await res.json()

    return NextResponse.json(data, {
      headers: {
        // Allow our own frontend to call this proxy
        'Access-Control-Allow-Origin': '*',
        // Cache briefly so rapid sync clicks don't hammer sfl.world
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Proxy fetch failed', upstream },
      { status: 502 }
    )
  }
}
