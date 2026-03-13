# 🌻 SFL Portfolio

**Sunflower Land Portfolio Tracker** — Full-stack Next.js app dengan pixel art UI untuk mencatat transaksi, cash flow, dan analitik NFT.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database & Auth**: PocketBase v0.36.4
- **Charts**: Recharts
- **State**: Zustand
- **Font**: Press Start 2P (pixel headers) + VT323 (body) + Share Tech Mono
- **Market Data**: [sfl.world API](https://sfl.world)

## Features

| Halaman | Fitur |
|---------|-------|
| **Dashboard** | Stats kartu, grafik portfolio value, cash flow bar chart, recent transactions |
| **Transactions** | CRUD lengkap · filter by type/asset · pagination · harga otomatis dari rate SFL |
| **Cash Flow** | Inflow/outflow per bulan · 6-month chart · kategori lengkap |
| **Portfolio** | Snapshot balance · chart nilai over time · P&L bulanan |
| **My NFTs** | Grid kartu NFT · avg cost · floor price P2P & Sequence · unrealized P&L |
| **Watchlist** | Monitor NFT · live floor price dari sfl.world API · price alert target |

## Quick Start

### 1. Setup PocketBase

```bash
# Download PocketBase 0.36.4
# https://github.com/pocketbase/pocketbase/releases/tag/v0.36.4

./pocketbase serve
# Buka http://127.0.0.1:8090/_/
```

Import schema:
- Buka PocketBase Admin → Settings → Import collections
- Upload file `sfl_portfolio_pb_schema.json`

### 2. Setup Next.js

```bash
cd sfl-portfolio
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_PB_URL jika PocketBase bukan di localhost:8090

npm install
npm run dev
```

Buka http://localhost:3000

## SFL World API Endpoints

| Endpoint | Data |
|----------|------|
| `GET /api/v1.1/exchange` | Harga SFL, POL (Matic), Gems, Coins dalam USD |
| `GET /api/v1/prices` | Floor prices NFT: `p2p` (Plaza) & `seq` (Sequence Market) |
| `GET /api/v1/nfts` | Data NFT: harga & supply |

## Project Structure

```
src/
├── app/
│   ├── auth/           # Login & Register page
│   ├── dashboard/      # Overview & charts
│   ├── transactions/   # Transaction CRUD
│   ├── cashflow/       # Cash flow tracking
│   ├── portfolio/      # Portfolio snapshots
│   ├── nfts/           # NFT holdings
│   └── watchlist/      # NFT watchlist
├── components/
│   ├── layout/         # Sidebar, TopBar, AppShell
│   └── ui/             # Pixel UI components
├── lib/
│   ├── pb.ts           # PocketBase client
│   ├── api.ts          # SFL World API + helpers
│   └── store.ts        # Zustand state
└── types/              # TypeScript types
```

## Pixel Art Design System

Semua UI component menggunakan aesthetic **pixel art / retro game**:
- Sharp borders dengan drop shadow `4px 4px 0 #000`
- CRT scanline overlay
- Animasi step-based (tidak smooth)
- Glow effects pada angka penting
- Color palette: dark navy background, gold accent, green/red P&L
- Font: Press Start 2P untuk heading, VT323 untuk body
