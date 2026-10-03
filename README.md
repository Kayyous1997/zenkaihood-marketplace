# Zenkaihood NFT Marketplace

A fully on-chain NFT marketplace built on **Base Sepolia** and **Robinhood Chain Testnet**, supporting ERC-721 and ERC-1155 collections with fixed-price listings, English auctions, collection offers, and multi-item sweep purchasing.

🌐 **Live App** — deployed on Vercel via the `main` branch  
🚀 **Launchpad** — [launchpad.zenkaihood.xyz](https://launchpad.zenkaihood.xyz/)  
📄 **Whitepaper** — [`docs/WHITEPAPER.md`](./docs/WHITEPAPER.md)  
📚 **Technical Docs** — [`docs/MARKETPLACE_DOCUMENTATION.md`](./docs/MARKETPLACE_DOCUMENTATION.md)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Smart Contracts](#smart-contracts)
- [Features](#features)
- [Project Structure](#project-structure)
- [Routes](#routes)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Contributing](#contributing)

---

## Overview

Zenkaihood is a permissionless NFT marketplace where anyone can register an ERC-721 or ERC-1155 collection and immediately start trading. The frontend is a **TanStack Start** SSR application with a file-based router, connecting to four on-chain contracts and a hosted **The Graph** subgraph for real-time activity indexing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR, Nitro, Vite) |
| Language | TypeScript 5 / React 19 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Wallet | [RainbowKit](https://rainbowkit.com/) + [Wagmi](https://wagmi.sh/) v2 |
| Onchain reads | [Viem](https://viem.sh/) v2 |
| Data fetching | TanStack Query v5 |
| Subgraph / Indexer | [The Graph](https://thegraph.com/) — `graphql-request` |
| Auth | [Supabase](https://supabase.com/) (Sign-In With Ethereum / SIWE) |
| Payments | x402 EVM payment channel (`@x402/evm`) |
| Analytics | Vercel Analytics |
| Charts | Recharts |
| Deployment | [Vercel](https://vercel.com/) |

---

## Smart Contracts

All contracts are deployed at **identical addresses** on both supported chains.

| Contract | Address | Purpose |
|---|---|---|
| `CollectionRegistry` | `0xABCB5db96fcB6a9743Da56F4d4870B3505eBAD85` | Permissionless collection registration |
| `Marketplace` | `0x1E4b93C28B1Cc2135894521a3b1b4d58cc21da5d` | Fixed listings, auctions, offers, sweep |
| `MarketplaceViews` | `0x4CA91348E44481C2dc923FfC69f8017Ac4731FcD` | Paginated read-only enumeration |
| `CollectionTokenViews` | `0x8118a477450cf4d7581cdf0dc973ed22cdcc4f24` | Token supply & enumeration |

**Supported chains:**

| Chain | Chain ID |
|---|---|
| Base Sepolia | 84532 |
| Robinhood Chain Testnet | 46630 |

The subgraph endpoint:  
`https://api.studio.thegraph.com/query/1760437/zenkaihood-1/0.0.1`

> Override with `VITE_SUBGRAPH_URL` in your `.env`.

---

## Features

### 🏠 Homepage
- Live sales ticker (CSS marquee) showing the latest marketplace activity
- Notable Collections carousel with arrow navigation
- Browse by Category carousel
- Global protocol stats ribbon (total volume, listings, users)
- Trending collections leaderboard with 24 h % change badges
- Active auction cards with countdown clocks
- Ecosystem & "Why Zenkaihood" section

### 🖼️ Collections
- Collection detail page with floor price, volume, supply, unique holders
- NFT grid with tabbed views: Listed · Auctions · All Items
- Price history chart (Recharts)
- Trait / rarity filter panel
- Sales & transfer activity feed with subgraph pagination

### 🔍 Explore & Search
- Browse all marketplace listings with sorting and filtering
- Instant search autocomplete for collections and tokens
- Category-based filtering

### 💰 Trading
- **Fixed-price listings** — list any owned ERC-721/1155 token
- **English auctions** — time-bounded bidding with anti-sniping extension
- **Collection offers** — bid on any token in a collection
- **Sweep** — buy multiple floor items in a single transaction
- **Listing quotes** — see exact cost with protocol fees before confirming

### 👤 Profile & Portfolio
- Wallet-connected profile with owned NFT gallery
- Personal activity feed (sales, purchases, bids)
- Collection management (edit metadata, logo, banner)

### 🚀 Launchpad (external)
- Direct nav link to [launchpad.zenkaihood.xyz](https://launchpad.zenkaihood.xyz/) for minting new collections

### 🔐 Authentication
- Sign-In With Ethereum (SIWE) — no email required
- Deterministic wallet-derived Supabase session
- Collection image upload to Supabase Storage CDN (`collection-images` bucket)

### ⚙️ Admin
- Admin panel for marketplace configuration (fee recipient, fee BPS, etc.)

---

## Project Structure

```
├── src/
│   ├── assets/                # Static images (landscape, NFT art thumbnails)
│   ├── components/
│   │   ├── ui/                # shadcn/ui component library (40+ primitives)
│   │   ├── zenkai.tsx         # Global Shell, Header (nav + Launchpad), Footer
│   │   ├── dialogs.tsx        # Buy / List / Bid / Offer modal dialogs
│   │   ├── nft-listing-tile.tsx
│   │   ├── collection-preview-card.tsx
│   │   ├── ipfs-img.tsx       # IPFS → HTTP gateway image wrapper
│   │   ├── chain-icons.tsx
│   │   └── wallet-provider.tsx # RainbowKit + Wagmi config
│   ├── contracts/
│   │   ├── addresses.ts       # All deployed contract addresses per chain
│   │   ├── marketplaceAbi.ts
│   │   ├── collectionRegistryAbi.ts
│   │   ├── collectionTokenViewsAbi.ts
│   │   ├── erc721Abi.ts
│   │   ├── erc1155Abi.ts
│   │   └── erc20Abi.ts
│   ├── hooks/
│   │   ├── useMarketplace.ts      # Core buy / list / cancel actions
│   │   ├── useAuction.ts          # Bid, settle, cancel auction
│   │   ├── useListing.ts          # Create & manage listings
│   │   ├── useOffer.ts            # Collection offers
│   │   ├── useSweep.ts            # Multi-item sweep purchase
│   │   ├── usePurchase.ts         # Single-item purchase flow
│   │   ├── useRegistry.ts         # Collection registration
│   │   ├── useAdmin.ts            # Admin config reads/writes
│   │   ├── useCollectionMeta.ts   # Single collection metadata
│   │   ├── useCollectionsMeta.ts  # All collections metadata
│   │   ├── useCollectionTraits.ts # Trait rarity + floor prices
│   │   ├── useCollectionSupply.ts # Total / minted supply
│   │   ├── useCategories.ts       # Category taxonomy
│   │   ├── useListingQuote.ts     # Pre-purchase fee breakdown
│   │   ├── useMarketplaceConfig.ts
│   │   └── launchpad/             # Launchpad-specific hooks
│   ├── indexer/
│   │   └── client.ts          # Shared GraphQL client (The Graph)
│   ├── lib/
│   │   ├── supabase.ts        # SIWE auth + image upload helpers
│   │   ├── chains.ts          # Custom chain definitions
│   │   └── utils.ts           # Tailwind `cn()` and shared helpers
│   ├── routes/
│   │   ├── __root.tsx         # Root layout (providers, analytics)
│   │   ├── index.tsx          # Homepage
│   │   ├── explore.tsx        # Explore all listings
│   │   ├── listings.tsx       # My active listings
│   │   ├── collections.$slug.tsx  # Collection detail page
│   │   ├── nfts.$id.tsx       # Individual NFT detail
│   │   ├── my-nfts.tsx        # Owned NFTs portfolio
│   │   ├── my-activity.tsx    # Personal activity feed
│   │   ├── activity.tsx       # Global marketplace activity
│   │   ├── create.tsx         # Create / register collection
│   │   ├── edit-collection.tsx # Edit collection metadata
│   │   ├── profile.tsx        # User profile page
│   │   ├── admin.tsx          # Admin panel
│   │   └── api/               # SSR API routes (Nitro)
│   ├── router.tsx             # TanStack Router configuration
│   ├── routeTree.gen.ts       # Auto-generated route tree
│   ├── server.ts              # Nitro server entry
│   ├── start.ts               # App entry point
│   └── styles.css             # Global styles + Tailwind + marquee keyframes
├── docs/
│   ├── MARKETPLACE_DOCUMENTATION.md  # Full technical reference
│   └── WHITEPAPER.md                 # Protocol whitepaper v1.0
├── public/                    # Static assets served at /
├── supabase/                  # Supabase project config
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Routes

| Route | Page | Auth Required |
|---|---|---|
| `/` | Homepage | No |
| `/explore` | Browse all listings | No |
| `/activity` | Global marketplace activity | No |
| `/collections/:slug` | Collection detail (listings, auctions, traits) | No |
| `/nfts/:id` | Individual NFT detail & trading | No |
| `/listings` | My active listings | Yes (wallet) |
| `/my-nfts` | My owned NFTs | Yes (wallet) |
| `/my-activity` | My transaction history | Yes (wallet) |
| `/profile` | My profile | Yes (wallet) |
| `/create` | Register a new collection | Yes (wallet) |
| `/edit-collection` | Edit collection metadata | Yes (wallet + owner) |
| `/admin` | Marketplace admin panel | Yes (admin wallet) |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# The Graph subgraph endpoint (Base Sepolia)
VITE_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1760437/zenkaihood-1/0.0.1

# Supabase — for SIWE auth and collection image uploads
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# WalletConnect project ID (required by RainbowKit)
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
```

> **Note:** The app functions without Supabase (auth and image uploads will be disabled). The subgraph and contract addresses have working defaults for Base Sepolia.

---

## Getting Started

**Prerequisites:** Node.js 20+ and npm

```sh
# Clone the repository
git clone https://github.com/Kayyous1997/zenkaihood-marketplace.git
cd zenkaihood-marketplace

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server (HMR) |
| `npm run build` | Production build (SSR + Nitro) |
| `npm run build:dev` | Development mode build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier formatter |

---

## Contributing

1. Fork the repository and create a feature branch from `main`
2. Make your changes and run `npm run build` to verify nothing is broken
3. Open a pull request — the `main` branch is connected to Vercel and deploys automatically
4. **Do not force-push, rebase, squash, or amend commits already pushed to `main`** 

---

## License

All rights reserved © Zenkaihood. This codebase is proprietary.
