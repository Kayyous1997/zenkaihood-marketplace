import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gavel,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
  Palette,
  Gamepad2,
  Camera,
  Crown,
  Music,
  Layers,
  ExternalLink,
  ShieldCheck,
  Tag,
  Activity,
  Zap,
  Coins,
  Radio,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollectionPreviewCard } from "@/components/collection-preview-card";
import { NftListingTile } from "@/components/nft-listing-tile";
import { BidDialog } from "@/components/dialogs";
import { IpfsImg } from "@/components/ipfs-img";
import { Shell, Verified } from "@/components/zenkai";
import { useCollectionsMeta } from "@/hooks/useCollectionsMeta";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { gqlClient } from "@/indexer/client";
import {
  GET_ACTIVE_LISTINGS,
  GET_ACTIVE_AUCTIONS,
  GET_COLLECTIONS,
  GET_SALES,
  type ActiveListingsResult,
  type ActiveAuctionsResult,
  type CollectionsResult,
  type SalesResult,
  type CollectionFragment,
  type AuctionFragment,
  type SaleFragment,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS, SLOW_REFETCH_MS, unixNowSeconds } from "@/indexer/events";
import { COLLECTION_CATEGORIES, getCategoryById, formatCategoryLabel, type CategoryOption } from "@/lib/categories";
import { formatEthCompact } from "@/lib/token-format";
import { cn } from "@/lib/utils";
import { useMarketplaceConfig } from "@/hooks/useMarketplaceConfig";

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

function shortAddr(addr?: string | null): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatRelativeTime(timestampSec: number): string {
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000 - timestampSec));
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zenkaihood — NFT Marketplace on Base Sepolia" },
      { name: "description", content: "Discover, collect, and trade remarkable digital art and NFTs on Base Sepolia with Zenkaihood." },
      { property: "og:title", content: "Zenkaihood NFT Marketplace" },
      { property: "og:description", content: "Explore trending collections, live auctions, and top digital art." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const QUICK_FILTER_CATEGORIES = [
  { id: "all", label: "All", desc: "All categories", icon: Layers },
  ...COLLECTION_CATEGORIES,
] as const;

const TIMEFRAMES = ["1h", "6h", "24h", "7d", "All"] as const;

function HomePage() {
  const navigate = useNavigate();
  const { platformFeePercent } = useMarketplaceConfig();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [leaderboardTab, setLeaderboardTab] = useState<"trending" | "top">("trending");
  const [selectedTimeframe, setSelectedTimeframe] = useState<typeof TIMEFRAMES[number]>("24h");
  const [heroSlide, setHeroSlide] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Query 1: Collections
  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ["home-collections"],
    queryFn: () => gqlClient.request<CollectionsResult>(GET_COLLECTIONS, { first: 30, skip: 0 }),
    refetchInterval: SLOW_REFETCH_MS,
    staleTime: SLOW_REFETCH_MS,
  });

  // Query 2: Active Listings
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["home-listings"],
    queryFn: () => gqlClient.request<ActiveListingsResult>(GET_ACTIVE_LISTINGS, { first: 12, skip: 0, now: unixNowSeconds() }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Query 3: Live Auctions
  const { data: auctionsData, isLoading: auctionsLoading } = useQuery({
    queryKey: ["home-auctions"],
    queryFn: () => gqlClient.request<ActiveAuctionsResult>(GET_ACTIVE_AUCTIONS, { first: 6, skip: 0 }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Query 4: Recent Marketplace Sales (for volume and momentum metrics)
  const { data: salesData } = useQuery({
    queryKey: ["home-sales"],
    queryFn: () => gqlClient.request<SalesResult>(GET_SALES, { first: 100, skip: 0 }),
    refetchInterval: DEFAULT_REFETCH_MS,
    staleTime: DEFAULT_REFETCH_MS,
  });

  const collections = collectionsData?.collections ?? [];
  const listings = listingsData?.listings ?? [];
  const auctions = auctionsData?.auctions ?? [];
  const sales = salesData?.sales ?? [];
  const { data: metaMap } = useCollectionsMeta(collections.map((col) => col.id));

  // Compute Global Marketplace Totals for Stats Ribbon
  const { totalMarketplaceVolumeWei, volume24hWei, sales24hCount, totalSalesCount } = useMemo(() => {
    let totalVol = 0n;
    let vol24 = 0n;
    let count24 = 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const dayAgo = nowSec - 86400;

    for (const sale of sales) {
      if (sale.paymentToken !== ETH_ADDRESS) continue;
      const p = BigInt(sale.price);
      totalVol += p;
      const ts = Number(sale.timestamp || "0");
      if (ts >= dayAgo) {
        vol24 += p;
        count24 += 1;
      }
    }

    return {
      totalMarketplaceVolumeWei: totalVol,
      volume24hWei: vol24,
      sales24hCount: count24,
      totalSalesCount: sales.length,
    };
  }, [sales]);

  // Compute Timeframe Cutoffs for Leaderboard Calculations
  const { timeframeCutoffSec, prevTimeframeCutoffSec } = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    let durationSec = 86400; // default 24h
    if (selectedTimeframe === "1h") durationSec = 3600;
    else if (selectedTimeframe === "6h") durationSec = 21600;
    else if (selectedTimeframe === "24h") durationSec = 86400;
    else if (selectedTimeframe === "7d") durationSec = 604800;
    else if (selectedTimeframe === "All") durationSec = 0;

    const cutoff = durationSec > 0 ? nowSec - durationSec : 0;
    const prevCutoff = durationSec > 0 ? nowSec - durationSec * 2 : 0;
    return { timeframeCutoffSec: cutoff, prevTimeframeCutoffSec: prevCutoff };
  }, [selectedTimeframe]);

  // Compute Live Floor Price, Timeframe Volume & % Changes per collection
  const collectionStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        floorWei: bigint | null;
        totalVolumeWei: bigint;
        timeframeVolumeWei: bigint;
        prevTimeframeVolumeWei: bigint;
        timeframeSalesCount: number;
        volumeChangePercent: number | null;
        prevFloorWei: bigint | null;
        floorChangePercent: number | null;
      }
    > = {};

    // 1. Calculate floor from active listings
    for (const listing of listings) {
      const colId = listing.collection?.id?.toLowerCase();
      if (!colId || listing.paymentToken !== ETH_ADDRESS) continue;
      const price = BigInt(listing.pricePerItem);
      if (!map[colId]) {
        map[colId] = {
          floorWei: price,
          totalVolumeWei: 0n,
          timeframeVolumeWei: 0n,
          prevTimeframeVolumeWei: 0n,
          timeframeSalesCount: 0,
          volumeChangePercent: null,
          prevFloorWei: null,
          floorChangePercent: null,
        };
      } else if (map[colId].floorWei === null || price < map[colId].floorWei!) {
        map[colId].floorWei = price;
      }
    }

    // 2. Calculate volume and timeframe metrics from completed sales
    for (const sale of sales) {
      const colId = sale.collection?.id?.toLowerCase();
      if (!colId || sale.paymentToken !== ETH_ADDRESS) continue;
      const price = BigInt(sale.price);
      const saleTs = Number(sale.timestamp || "0");

      if (!map[colId]) {
        map[colId] = {
          floorWei: null,
          totalVolumeWei: price,
          timeframeVolumeWei: 0n,
          prevTimeframeVolumeWei: 0n,
          timeframeSalesCount: 0,
          volumeChangePercent: null,
          prevFloorWei: null,
          floorChangePercent: null,
        };
      } else {
        map[colId].totalVolumeWei += price;
      }

      // Check timeframe window
      if (saleTs >= timeframeCutoffSec) {
        map[colId].timeframeVolumeWei += price;
        map[colId].timeframeSalesCount += 1;
      } else if (timeframeCutoffSec > 0 && saleTs >= prevTimeframeCutoffSec) {
        map[colId].prevTimeframeVolumeWei += price;
        if (map[colId].prevFloorWei === null || price < map[colId].prevFloorWei!) {
          map[colId].prevFloorWei = price;
        }
      }
    }

    // 3. Compute volume percentage changes and floor price % changes
    for (const colId of Object.keys(map)) {
      const s = map[colId];
      if (timeframeCutoffSec === 0) {
        s.timeframeVolumeWei = s.totalVolumeWei;
        s.volumeChangePercent = null;
      } else if (s.prevTimeframeVolumeWei > 0n) {
        const curr = Number(s.timeframeVolumeWei);
        const prev = Number(s.prevTimeframeVolumeWei);
        s.volumeChangePercent = Math.round(((curr - prev) / prev) * 100);
      } else if (s.timeframeVolumeWei > 0n) {
        s.volumeChangePercent = 100;
      } else {
        s.volumeChangePercent = 0;
      }
      // Floor price % change: current floor vs prev timeframe min sale price
      if (s.floorWei !== null && s.prevFloorWei !== null && s.prevFloorWei > 0n) {
        const currFloor = Number(s.floorWei);
        const prevFloor = Number(s.prevFloorWei);
        s.floorChangePercent = Math.round(((currFloor - prevFloor) / prevFloor) * 100);
      }
    }

    return map;
  }, [listings, sales, timeframeCutoffSec, prevTimeframeCutoffSec]);

  // Filter collections based on active quick filter category
  const filteredCollections = useMemo(() => {
    if (selectedCategory === "all") return collections;
    return collections.filter((col) => {
      const meta = metaMap?.[col.id];
      const cats: string[] = meta?.categories || [];
      return cats.includes(selectedCategory);
    });
  }, [collections, metaMap, selectedCategory]);

  // Categorized collections (collections that have registered categories)
  const categorizedCollections = useMemo(() => {
    const withCategories = collections.filter((col) => {
      const cats = metaMap?.[col.id]?.categories;
      return Array.isArray(cats) && cats.length > 0;
    });
    return withCategories.length > 0 ? withCategories : collections;
  }, [collections, metaMap]);

  // Spotlight featured collections for Hero carousel
  const featuredCollections = collections.slice(0, 4);
  const heroCount = Math.max(featuredCollections.length, 1);

  useEffect(() => {
    if (heroCount <= 1) return;
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroCount]);

  // Autocomplete matching collections
  const autocompleteCollections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return collections
      .filter((col) => {
        const meta = metaMap?.[col.id];
        const name = (meta?.name || col.id).toLowerCase();
        return name.includes(q) || col.id.toLowerCase().includes(q);
      })
      .slice(0, 5);
  }, [search, collections, metaMap]);

  // Click outside to close search autocomplete
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goSearch(event: FormEvent) {
    event.preventDefault();
    const q = search.trim();
    setSearchFocused(false);
    void navigate({ to: "/explore", search: q ? { q } : { q: undefined } });
  }

  // Split leaderboard into Left (1-5) and Right (6-10) columns
  const sortedCollections = useMemo(() => {
    return [...filteredCollections].sort((a, b) => {
      const aStats = collectionStatsMap[a.id.toLowerCase()];
      const bStats = collectionStatsMap[b.id.toLowerCase()];
      if (leaderboardTab === "trending") {
        return (b.activeListingCount + b.activeAuctionCount) - (a.activeListingCount + a.activeAuctionCount);
      }
      const aVol = aStats?.timeframeVolumeWei ?? 0n;
      const bVol = bStats?.timeframeVolumeWei ?? 0n;
      if (bVol !== aVol) {
        return bVol > aVol ? 1 : -1;
      }
      return (b.listingCount + b.offerCount) - (a.listingCount + a.offerCount);
    });
  }, [filteredCollections, collectionStatsMap, leaderboardTab]);

  const leftRankings = sortedCollections.slice(0, 5);
  const rightRankings = sortedCollections.slice(5, 10);

  const currentHeroCol = featuredCollections[heroSlide] || collections[0];
  const currentHeroMeta = currentHeroCol ? metaMap?.[currentHeroCol.id] : null;
  const currentHeroBanner = currentHeroMeta?.banner_url || (currentHeroMeta as any)?.bannerURI || currentHeroMeta?.logo_url || (currentHeroMeta as any)?.logoURI || null;
  const currentHeroLogo = currentHeroMeta?.logo_url || (currentHeroMeta as any)?.logoURI || null;
  const currentHeroStats = currentHeroCol ? collectionStatsMap[currentHeroCol.id.toLowerCase()] : null;

  return (
    <Shell>
      <main className="min-h-screen bg-background">
        {/* ─── 0. GLOBAL MARKETPLACE STATS RIBBON ───────────────────────────── */}
        <section className="border-b border-border bg-card/70 py-2 text-xs backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 sm:px-8 lg:px-14">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-foreground">Base Sepolia</span>
              </div>
              <span className="text-border">|</span>
              <div>
                Total Volume: <b className="text-foreground">{formatEthCompact(totalMarketplaceVolumeWei)}</b>
              </div>
              <span className="hidden text-border sm:inline">|</span>
              <div className="hidden sm:block">
                24h Volume: <b className="text-foreground">{formatEthCompact(volume24hWei)}</b>
              </div>
              <span className="hidden text-border md:inline">|</span>
              <div className="hidden md:block">
                Sales (24h): <b className="text-foreground">{sales24hCount}</b>
              </div>
              <span className="hidden text-border lg:inline">|</span>
              <div className="hidden lg:block">
                Collections: <b className="text-foreground">{collections.length}</b>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {platformFeePercent === "0%" ? "0% Fee Marketplace" : `${platformFeePercent} Marketplace Fee`}
              </span>
            </div>
          </div>
        </section>

        {/* ─── LIVE SALES TICKER (CSS Marquee) ─────────────────────────────── */}
        {sales.length > 0 && (() => {
          const tickerItems = sales.slice(0, 10).map((sale) => {
            const meta = sale.collection?.id ? metaMap?.[sale.collection.id] : null;
            const colName = meta?.name || shortAddr(sale.collection?.id);
            const price = formatEthCompact(BigInt(sale.price));
            return (
              <Link
                key={sale.id}
                to="/nfts/$id"
                params={{ id: `${sale.collection?.id}-${sale.tokenId}` }}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1 mx-2 text-muted-foreground transition hover:border-primary/50 hover:bg-card hover:text-foreground"
              >
                <span className="font-semibold text-foreground">{colName} #{sale.tokenId}</span>
                <span className="font-bold text-primary">{price}</span>
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(Number(sale.timestamp || "0"))}</span>
              </Link>
            );
          });
          return (
            <section className="border-b border-border/80 bg-background/50 overflow-hidden py-2 text-xs">
              <div className="flex items-center gap-3">
                {/* Pinned label */}
                <div className="flex shrink-0 items-center gap-1.5 font-bold uppercase tracking-wider text-primary text-[10px] pl-4 sm:pl-8 lg:pl-14">
                  <Activity className="size-3.5 animate-pulse" /> Live
                </div>
                {/* Seamless marquee track — items duplicated for infinite loop */}
                <div className="flex-1 overflow-hidden">
                  <div className="ticker-track items-center gap-0 py-0.5">
                    {tickerItems}
                    {/* Duplicate for seamless loop */}
                    {tickerItems.map((item, i) =>
                      <span key={`dup-${i}`}>{item}</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })()}


        {/* ─── 1. SPOTLIGHT HERO DROP CAROUSEL ──────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border bg-card/40">
          {/* Ambient Glow & Backdrop */}
          <div className="absolute inset-0 z-0">
            {currentHeroBanner || currentHeroLogo ? (
              <IpfsImg
                uri={currentHeroBanner || currentHeroLogo || ""}
                alt="Hero backdrop"
                className="size-full object-cover opacity-20 blur-2xl scale-110 transition-all duration-1000"
              />
            ) : (
              <div className="size-full bg-gradient-to-br from-primary/20 via-background to-card opacity-50 blur-2xl scale-110" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-14 lg:px-14">
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Left Hero Narrative */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                  <Sparkles className="size-3.5" /> Spotlight Collection Drop
                </div>

                <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.08]">
                  Discover, Collect <br />
                  <span className="bg-gradient-to-r from-primary via-gold to-accent bg-clip-text text-transparent">
                    &amp; Trade NFTs
                  </span>
                </h1>

                <p className="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-muted-foreground">
                  The premier decentralized NFT marketplace built on Base Sepolia. Explore verified drops, participate in live anti-sniping auctions, and trade with {platformFeePercent === "0%" ? "0%" : platformFeePercent} marketplace fees.
                </p>

                {/* Hero Search Box with Autocomplete */}
                <div ref={searchContainerRef} className="relative mt-6 max-w-xl">
                  <form onSubmit={goSearch} className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      placeholder="Search collections, items, or creators..."
                      className="h-12 rounded-xl border-border bg-card/80 backdrop-blur pl-10 pr-24 text-sm shadow-md transition-all focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg text-xs"
                    >
                      Search
                    </Button>
                  </form>

                  {/* Autocomplete Dropdown */}
                  {searchFocused && autocompleteCollections.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Matching Collections
                      </div>
                      <div className="divide-y divide-border/60">
                        {autocompleteCollections.map((col) => {
                          const meta = metaMap?.[col.id];
                          const name = meta?.name || `Collection ${shortAddr(col.id)}`;
                          const logo = meta?.logo_url || null;
                          const stats = collectionStatsMap[col.id.toLowerCase()];
                          return (
                            <Link
                              key={col.id}
                              to="/collections/$slug"
                              params={{ slug: col.id }}
                              onClick={() => setSearchFocused(false)}
                              className="flex items-center justify-between gap-3 p-2 rounded-lg transition hover:bg-muted"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-8 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                                  {logo ? (
                                    <IpfsImg uri={logo} alt="" className="size-full object-cover" />
                                  ) : (
                                    <div className="size-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                      {name.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-foreground flex items-center gap-1">
                                    {name} {col.verified && <Verified />}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground">{col.activeListingCount} listed</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-muted-foreground block">Floor</span>
                                <span className="font-mono text-xs font-bold text-primary">
                                  {stats?.floorWei ? formatEthCompact(stats.floorWei) : "—"}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action CTAs */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
                    <Link to="/explore">
                      Explore Marketplace <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="gap-2">
                    <Link to="/create">
                      <Plus className="size-4" /> Create Collection
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Hero Spotlight Card */}
              <div className="relative">
                {currentHeroCol ? (
                  <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-500 hover:border-primary/40">
                    {/* Spotlight Collection Banner */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted flex items-center justify-center">
                      {currentHeroBanner ? (
                        <IpfsImg
                          uri={currentHeroBanner}
                          alt={currentHeroMeta?.name || "Featured Collection"}
                          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="size-full bg-gradient-to-br from-primary/30 via-card to-background flex flex-col items-center justify-center p-6 text-center">
                          <span className="font-display text-4xl font-extrabold text-primary mb-1">
                            {currentHeroCol.id.slice(2, 6).toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {currentHeroCol.id.slice(0, 10)}…
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

                      {/* Live Badge */}
                      <span className="absolute top-3 left-3 rounded-full bg-background/80 backdrop-blur border border-border px-3 py-1 text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-sm">
                        <span className="size-2 rounded-full bg-success animate-pulse" />
                        Featured Drop
                      </span>
                    </div>

                    {/* Spotlight Collection Logo & Meta Info */}
                    <div className="relative -mt-10 p-5 pt-0">
                      <div className="flex items-end justify-between gap-4">
                        <div className="flex items-end gap-3">
                          <div className="relative size-16 sm:size-20 rounded-xl border-4 border-card bg-muted shadow-md overflow-hidden shrink-0">
                            {currentHeroLogo ? (
                              <IpfsImg
                                uri={currentHeroLogo}
                                alt="Collection Logo"
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="size-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary text-xl">
                                {(currentHeroMeta?.name || currentHeroCol.id.slice(2, 4)).slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="mb-1 min-w-0">
                            <h3 className="font-display text-lg sm:text-xl font-bold flex items-center gap-1.5 truncate">
                              {currentHeroMeta?.name || `Collection ${currentHeroCol.id.slice(0, 6)}…`}
                              {currentHeroCol.verified && <Verified />}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              By {currentHeroCol.creator?.slice(0, 6)}…{currentHeroCol.creator?.slice(-4)}
                            </p>
                          </div>
                        </div>

                        <Button asChild size="sm" className="mb-1 gap-1.5 shrink-0">
                          <Link to="/collections/$slug" params={{ slug: currentHeroCol.id }}>
                            View Drop <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                      </div>

                      {/* Spotlight Stats Row (Actual Floor & Volume) */}
                      <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-background/60 border border-border/80 p-3 text-center">
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground">Floor Price</p>
                          <p className="mt-0.5 font-display text-xs font-bold text-foreground">
                            {currentHeroStats?.floorWei ? formatEthCompact(currentHeroStats.floorWei) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Volume</p>
                          <p className="mt-0.5 font-display text-xs font-bold text-foreground">
                            {currentHeroStats?.totalVolumeWei && currentHeroStats.totalVolumeWei > 0n ? formatEthCompact(currentHeroStats.totalVolumeWei) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground">Listed</p>
                          <p className="mt-0.5 font-display text-xs font-bold">{currentHeroCol.activeListingCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground">Live Auctions</p>
                          <p className="mt-0.5 font-display text-xs font-bold text-primary">{currentHeroCol.activeAuctionCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[16/10] rounded-2xl bg-muted animate-pulse border border-border" />
                )}

                {/* Carousel Controls */}
                {featuredCollections.length > 1 && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {featuredCollections.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setHeroSlide(i)}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            heroSlide === i ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/40"
                          )}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-full"
                        onClick={() => setHeroSlide((prev) => (prev - 1 + heroCount) % heroCount)}
                      >
                        <ChevronLeft className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7 rounded-full"
                        onClick={() => setHeroSlide((prev) => (prev + 1) % heroCount)}
                      >
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. CATEGORY QUICK-FILTER BAR ─────────────────────────────────── */}
        <section className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14 overflow-x-auto no-scrollbar py-3">
            <div className="flex items-center gap-2">
              {QUICK_FILTER_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all border",
                      isSelected
                        ? "bg-foreground text-background border-foreground shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 3. OPENSEA SIGNATURE TRENDING & TOP LEADERBOARD ──────────────── */}
        <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8 sm:py-14 lg:px-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-6">
            {/* Toggle Tabs: Trending vs Top */}
            <div className="flex items-center gap-2">
              <Button
                variant={leaderboardTab === "trending" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLeaderboardTab("trending")}
                className="gap-1.5 font-display text-sm font-bold"
              >
                <Flame className="size-4 text-amber-500" />
                Trending
              </Button>
              <Button
                variant={leaderboardTab === "top" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLeaderboardTab("top")}
                className="gap-1.5 font-display text-sm font-bold"
              >
                <Trophy className="size-4 text-gold" />
                Top
              </Button>
            </div>

            {/* Timeframe Selector & View All */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setSelectedTimeframe(tf)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                      selectedTimeframe === tf
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
                <Link to="/explore">
                  View All <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          </div>

          {/* 2-Column Split Ranking Table */}
          {collectionsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, colIdx) => (
                <div key={colIdx} className="space-y-3">
                  {Array.from({ length: 5 }).map((_, rowIdx) => (
                    <div key={rowIdx} className="h-14 rounded-xl bg-muted/60 animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          ) : sortedCollections.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No collection data found.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
              {/* Left Column (Ranks 1 to 5) */}
              <div className="space-y-1">
                <div className="grid grid-cols-[32px_1fr_90px_110px] items-center px-3 py-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  <span>#</span>
                  <span>Collection</span>
                  <span className="text-right">Floor Price</span>
                  <span className="text-right">Volume ({selectedTimeframe})</span>
                </div>
                {leftRankings.map((col, idx) => (
                  <LeaderboardRow
                    key={col.id}
                    rank={idx + 1}
                    col={col}
                    meta={metaMap?.[col.id]}
                    stats={collectionStatsMap[col.id.toLowerCase()]}
                  />
                ))}
              </div>

              {/* Right Column (Ranks 6 to 10) */}
              <div className="space-y-1">
                <div className="grid grid-cols-[32px_1fr_90px_110px] items-center px-3 py-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  <span>#</span>
                  <span>Collection</span>
                  <span className="text-right">Floor Price</span>
                  <span className="text-right">Volume ({selectedTimeframe})</span>
                </div>
                {rightRankings.map((col, idx) => (
                  <LeaderboardRow
                    key={col.id}
                    rank={idx + 6}
                    col={col}
                    meta={metaMap?.[col.id]}
                    stats={collectionStatsMap[col.id.toLowerCase()]}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ─── 4. NOTABLE COLLECTIONS SHOWCASE (Carousel) ───────────────────── */}
        <section className="border-t border-border bg-card/20 py-12 sm:py-16">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" /> Notable Collections
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Explore top community registered collections on Base Sepolia
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="icon"
                  className="size-8 rounded-full"
                  onClick={() => {
                    document.getElementById("notable-carousel")?.scrollBy({ left: -320, behavior: "smooth" });
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline" size="icon"
                  className="size-8 rounded-full"
                  onClick={() => {
                    document.getElementById("notable-carousel")?.scrollBy({ left: 320, behavior: "smooth" });
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-primary">
                  <Link to="/explore">
                    Explore all <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Carousel track */}
            <div className="relative">
              {/* Fade edges */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-card/80 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-card/80 to-transparent" />

              <div
                id="notable-carousel"
                className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
              >
                {collectionsLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-64 shrink-0 aspect-[1.3] animate-pulse rounded-2xl bg-muted" />
                    ))
                  : filteredCollections.slice(0, 12).map((col, index) => (
                      <div key={col.id} className="w-64 shrink-0">
                        <CollectionPreviewCard
                          col={col}
                          meta={metaMap?.[col.id]}
                          index={index}
                        />
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </section>


        {/* ─── 5. TRENDING ITEMS / FEATURED LISTINGS ────────────────────────── */}
        <section className="border-t border-border bg-card/10 py-12 sm:py-16">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Tag className="size-5 text-primary" /> Trending Items
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recently listed NFTs ready for instant buy
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-primary">
                <Link to="/listings">
                  View all listings <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {listingsLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
                  ))
                : listings.slice(0, 12).map((listing, index) => (
                    <NftListingTile
                      key={listing.id}
                      collectionId={listing.collection.id}
                      tokenId={listing.tokenId}
                      pricePerItem={listing.pricePerItem}
                      paymentToken={listing.paymentToken}
                      index={index}
                    />
                  ))}
            </div>
          </div>
        </section>

        {/* ─── 6. LIVE AUCTIONS SECTION (WITH TICKING SECONDS) ──────────────── */}
        {auctions.length > 0 && (
          <section className="border-t border-border py-12 sm:py-16 bg-background">
            <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Gavel className="size-5 text-primary" /> Live Auctions
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Active anti-sniping auctions ending soon — bid now to win
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-primary">
                  <Link to="/explore">
                    View all auctions <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {auctions.map((auction, i) => (
                  <HomeAuctionTile key={auction.id} auction={auction} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 7. BROWSE BY CATEGORY / REGISTERED COLLECTIONS (Carousel) ────── */}
        <section className="border-t border-border py-12 sm:py-16 bg-background">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Palette className="size-5 text-primary" /> Browse by Category
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Explore registered collections curated with creator categories on Base Sepolia
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline" size="icon"
                  className="size-8 rounded-full"
                  onClick={() => {
                    document.getElementById("category-carousel")?.scrollBy({ left: -320, behavior: "smooth" });
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline" size="icon"
                  className="size-8 rounded-full"
                  onClick={() => {
                    document.getElementById("category-carousel")?.scrollBy({ left: 320, behavior: "smooth" });
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-primary">
                  <Link to="/explore">
                    Explore all <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Carousel track */}
            {collectionsLoading ? (
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-64 shrink-0 aspect-[1.3] animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : categorizedCollections.length > 0 ? (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />

                <div
                  id="category-carousel"
                  className="flex gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-2"
                >
                  {categorizedCollections.map((col, index) => (
                    <div key={col.id} className="w-64 shrink-0">
                      <CollectionPreviewCard
                        col={col}
                        meta={metaMap?.[col.id]}
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
                <div className="grid size-12 place-content-center rounded-full bg-primary/10 text-primary mb-4">
                  <Palette className="size-6" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  No Categorized Collections Registered Yet
                </h3>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Be the first creator to deploy and register a collection with custom categories on Zenkaihood.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to="/create">
                      <Plus className="size-3.5" /> Create Collection
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/explore">Explore All</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── 8. WHY ZENKAIHOOD: TRUST & ECOSYSTEM ADVANTAGES ──────────────── */}
        <section className="border-t border-border bg-card/30 py-16 sm:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" /> Next-Gen Marketplace Architecture
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Engineered for Fair, Safe &amp; Low-Cost Trading
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Zenkaihood combines battle-tested smart contract infrastructure with modern Layer-2 scalability on Base Sepolia.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Feature 1 */}
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4">
                  <Gavel className="size-6" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Anti-Sniping Live Auctions
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Smart contracts automatically extend auctions by 5 minutes whenever a bid lands in the final 5 minutes, stopping MEV bots and guaranteeing fair discovery.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
                  <span>+5m Auto Extension</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
                  <Zap className="size-6" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Sub-Cent Gas on Base L2
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Built natively on Base Sepolia Ethereum L2. Execute listings, bulk cart sweeps, and instant offer executions with sub-second finality and near-zero gas costs.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-blue-400">
                  <span>Sub-second Finality</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                  <Coins className="size-6" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Non-Custodial Escrow
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  All offer and auction bids are secured in audited on-chain escrow contracts. Cancel active offers or reclaim outbid funds at any time with 1-click self-custody refunds.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                  <span>100% Self-Custodial</span>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                <div className="flex size-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                  <Crown className="size-6" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Enforced Creator Royalties
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Protocol-level support for EIP-2981 royalty standards across both ERC-721 and ERC-1155 tokens. Creators receive instant split payouts on every secondary sale.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-purple-400">
                  <span>EIP-2981 Multi-Standard</span>
                </div>
              </div>
            </div>

            {/* Protocol Security & Trust Badges Strip */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-border/80 bg-background/60 p-4 text-xs font-medium text-muted-foreground backdrop-blur">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Verified Bytecode on BaseScan</span>
              </div>
              <span className="hidden sm:inline text-border">·</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Zero Custodial Risk</span>
              </div>
              <span className="hidden sm:inline text-border">·</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Decentralized GraphQL Subgraph</span>
              </div>
              <span className="hidden sm:inline text-border">·</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>{platformFeePercent === "0%" ? "0% Platform Trading Fees" : `${platformFeePercent} Low Platform Fee`}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 9. CREATOR LAUNCHPAD CTA BANNER ─────────────────────────────── */}
        <section className="border-t border-border bg-gradient-to-b from-card/60 to-background py-16">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14">
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-12 shadow-xl">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/20 px-3 py-0.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="size-3.5" /> Zenkaihood Creator Studio
                </span>
                <h3 className="mt-4 font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Launch Your Collection on Base Sepolia
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Join our creator ecosystem. Deploy ERC-721 or ERC-1155 smart contracts, configure custom royalty splits, and start selling with {platformFeePercent === "0%" ? "zero" : platformFeePercent} marketplace fees.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button asChild size="default" className="gap-2 shadow-md">
                    <Link to="/create">
                      <Plus className="size-4" /> Create Collection
                    </Link>
                  </Button>
                  <Button asChild size="default" variant="outline" className="gap-2">
                    <Link to="/my-nfts">
                      List an NFT <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Decorative Watermark */}
              <div className="absolute right-4 -bottom-6 select-none opacity-5 text-9xl font-extrabold text-foreground pointer-events-none font-display">
                ZENKAI
              </div>
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}

// ─── Leaderboard Row Component (OpenSea Style with % Change) ─────────────────

function LeaderboardRow({
  rank,
  col,
  meta,
  stats,
}: {
  rank: number;
  col: CollectionFragment;
  meta: any;
  stats?: {
    floorWei: bigint | null;
    totalVolumeWei: bigint;
    timeframeVolumeWei: bigint;
    timeframeSalesCount: number;
    volumeChangePercent: number | null;
    floorChangePercent: number | null;
  };
}) {
  const name = meta?.name?.trim() || `Collection ${col.id.slice(0, 6)}…`;
  const logoSrc = meta?.logo_url || meta?.logoURI || null;
  const floorWei = stats?.floorWei;
  const volumeWei = stats?.timeframeVolumeWei ?? stats?.totalVolumeWei;
  const changePct = stats?.volumeChangePercent;
  const floorChangePct = stats?.floorChangePercent;

  return (
    <Link
      to="/collections/$slug"
      params={{ slug: col.id }}
      className="grid grid-cols-[32px_1fr_90px_110px] items-center rounded-xl p-2.5 transition-colors hover:bg-card/80 border border-transparent hover:border-border"
    >
      {/* Rank */}
      <span className="font-display text-xs font-bold text-muted-foreground">{rank}</span>

      {/* Collection Logo & Title */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="relative size-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
          {logoSrc ? (
            <IpfsImg uri={logoSrc} alt={name} className="size-full object-cover" />
          ) : (
            <div className="size-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
              {(meta?.name || col.id.slice(2, 4)).slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xs font-semibold text-foreground flex items-center gap-1">
            {name}
            {col.verified && <Verified />}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{col.activeListingCount} listed</span>
            {stats && stats.timeframeSalesCount > 0 && (
              <>
                <span>·</span>
                <span className="text-emerald-500 font-medium">{stats.timeframeSalesCount} sales</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floor Price */}
      <div className="text-right">
        <span className="font-mono text-xs font-semibold text-foreground block">
          {floorWei ? formatEthCompact(floorWei) : "—"}
        </span>
        {floorChangePct !== undefined && floorChangePct !== null && floorChangePct !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-bold font-mono",
              floorChangePct > 0 ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {floorChangePct > 0 ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
            {floorChangePct > 0 ? `+${floorChangePct}%` : `${floorChangePct}%`}
          </span>
        )}
      </div>

      {/* Volume & % Change */}
      <div className="text-right">
        <span className="font-mono text-xs font-semibold text-foreground block">
          {volumeWei && volumeWei > 0n ? formatEthCompact(volumeWei) : "—"}
        </span>
        {changePct !== undefined && changePct !== null && changePct !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-bold font-mono",
              changePct > 0 ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {changePct > 0 ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
            {changePct > 0 ? `+${changePct}%` : `${changePct}%`}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Home Auction Tile Component with Live Seconds Countdown ─────────────────

function HomeAuctionTile({
  auction,
  index,
}: {
  auction: AuctionFragment;
  index: number;
}) {
  const collectionAddress = (auction.collection?.id || "") as `0x${string}`;
  const tokenId = auction.tokenId || "";
  const { imageUri, name } = useTokenMetadata(collectionAddress, tokenId);
  const endTimeStr = auction.endTime || "0";
  const endTimeNum = Number(endTimeStr);
  const highestBidVal = BigInt(auction.highestBid || "0");
  const reservePriceVal = BigInt(auction.reservePrice || "0");
  const hasBids = highestBidVal > 0n;

  // Live ticking countdown
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = Math.max(0, endTimeNum * 1000 - Date.now());
    return {
      ms: diff,
      isEnded: diff <= 0,
      isEndingSoon: diff > 0 && diff < 5 * 60 * 1000,
    };
  });

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, endTimeNum * 1000 - Date.now());
      setTimeLeft({
        ms: diff,
        isEnded: diff <= 0,
        isEndingSoon: diff > 0 && diff < 5 * 60 * 1000,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTimeNum]);

  const formattedTimer = useMemo(() => {
    if (timeLeft.ms <= 0) return "Auction Ended";
    const totalSec = Math.floor(timeLeft.ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m left`;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [timeLeft.ms]);

  return (
    <div
      className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 flex flex-col justify-between"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg
              uri={imageUri}
              alt={name || `Token #${tokenId}`}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="size-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono">
              #{tokenId}
            </div>
          )}

          {/* Auction Pill Badge */}
          <span className="absolute top-2 left-2 rounded-full bg-background/90 backdrop-blur px-2 py-0.5 text-[9px] font-semibold text-primary border border-border shadow-sm flex items-center gap-1">
            <Gavel className="size-2.5" /> Live Auction
          </span>

          <span
            className={cn(
              "absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-mono font-medium backdrop-blur shadow-sm flex items-center gap-1",
              timeLeft.isEndingSoon
                ? "bg-rose-500/90 text-white animate-pulse"
                : "bg-background/80 text-muted-foreground"
            )}
          >
            <Clock className="size-2.5" />
            {formattedTimer}
          </span>
        </div>

        <div className="p-3">
          <p className="truncate font-display text-xs font-semibold group-hover:text-primary transition-colors">
            {name || `Token #${tokenId}`}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-[10px] text-muted-foreground">
              {hasBids ? "Highest Bid" : "Reserve"}
            </span>
            <span className="font-semibold text-foreground font-mono">
              {formatEthCompact(hasBids ? highestBidVal : reservePriceVal)}
            </span>
          </div>
        </div>
      </Link>

      <div className="p-2 border-t border-border bg-card/60">
        <BidDialog
          auctionId={BigInt(auction.id || "0")}
          nftContract={collectionAddress}
          tokenId={tokenId}
          paymentToken={auction.paymentToken || "0x0000000000000000000000000000000000000000"}
          minBid={((highestBidVal || 10n ** 15n) * 105n) / 100n}
          endsAt={BigInt(endTimeStr)}
          label="Place Bid"
          className="w-full text-[10px] h-7 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        />
      </div>
    </div>
  );
}
