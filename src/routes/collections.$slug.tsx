import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { isAddress } from "viem";
import { erc721Abi } from "@/contracts/erc721Abi";
import { erc1155Abi } from "@/contracts/erc1155Abi";
import {
  Activity as ActivityIcon,
  ArrowUpDown,
  BarChart2,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  List,
  MessageCircle,
  Percent,
  Search,
  Send,
  Share2,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Trophy,
  Twitter,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BidDialog, OfferDialog, SellDialog, SweepDialog, useSweepCart } from "@/components/dialogs";
import { useWallet } from "@/lib/wallet";
import { IpfsImg } from "@/components/ipfs-img";
import { SelectBox, Shell, Verified } from "@/components/zenkai";
import { Checkbox } from "@/components/ui/checkbox";
import { gqlClient } from "@/indexer/client";
import { activityKind, activityLabel } from "@/indexer/activity";
import { DEFAULT_REFETCH_MS, SLOW_REFETCH_MS, unixNowSeconds } from "@/indexer/events";
import {
  GET_ACTIVITY_BY_COLLECTION,
  GET_AUCTIONS_BY_COLLECTION,
  GET_COLLECTION,
  GET_LISTINGS_BY_COLLECTION,
  GET_OFFERS_BY_COLLECTION,
  GET_SALES_BY_COLLECTION,
  GET_TOKENS_BY_COLLECTION,
  type ActiveAuctionsResult,
  type ActiveListingsResult,
  type CollectionResult,
  type GlobalActivityResult,
  type OffersByCollectionResult,
  type TokensByCollectionResult,
} from "@/indexer/queries";
import { useCollectionMeta } from "@/hooks/useCollectionMeta";
import { useCollectionSupply } from "@/hooks/useCollectionSupply";
import { useCollectionTraits, type TokenRarity, type TraitGroup } from "@/hooks/useCollectionTraits";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { addressUrl } from "@/lib/basescan";
import { formatBps, formatEth, formatEthCompact, parseEthInput } from "@/lib/token-format";
import { getCategoryById } from "@/lib/categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/collections/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Collection ${params.slug.slice(0, 8)}… — Zenkaihood` },
      { name: "description", content: `Browse, trade, and analyze NFTs in collection ${params.slug} on Zenkaihood.` },
      { property: "og:title", content: `Collection — Zenkaihood` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollectionPage,
});

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
type Tab = "Items" | "Analytics" | "Offers" | "Activity" | "About";
type StatusFilter = "All" | "Buy Now" | "Not Listed" | "On Auction";
type SortKey =
  | "Price: Low to High"
  | "Price: High to Low"
  | "Rarity: Rare to Common"
  | "Rarity: Common to Rare"
  | "Recently Listed"
  | "Token ID";
type ViewMode = "grid" | "list";

type ItemStatus = "Buy Now" | "On Auction" | "Not Listed";

const PAGE_SIZE = 24;

interface UnifiedItem {
  id: string;
  tokenId: string;
  status: ItemStatus;
  listing?: ActiveListingsResult["listings"][number];
  auction?: ActiveAuctionsResult["auctions"][number];
  owner?: string | null;
  topOffer?: OffersByCollectionResult["offers"][number];
  lastSalePrice?: bigint | null;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatCreated(unix: string) {
  const date = new Date(Number(unix) * 1000);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" }).toUpperCase();
}

function CollectionPage() {
  const { slug } = Route.useParams();
  const collectionAddress = slug.toLowerCase() as `0x${string}`;

  const [tab, setTab] = useState<Tab>("Items");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortKey>("Price: Low to High");
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [density, setDensity] = useState<3 | 4 | 5>(4);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [watching, setWatching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [sweepCount, setSweepCount] = useState<number>(0);

  // Pagination limit for Infinite Scrolling
  const [visibleLimit, setVisibleLimit] = useState<number>(PAGE_SIZE);

  // Selected Traits Filter: { [traitType]: [value1, value2] }
  const [selectedTraits, setSelectedTraits] = useState<Record<string, string[]>>({});
  const [traitSearchQuery, setTraitSearchQuery] = useState<Record<string, string>>({});

  const { items: cartItems, addItem, removeItem, clearCart } = useSweepCart();
  const { data: supabaseMeta } = useCollectionMeta(collectionAddress);
  const { data: onChainSupply } = useCollectionSupply(collectionAddress);

  const { data: colData, isLoading: colLoading } = useQuery({
    queryKey: ["collection", collectionAddress],
    queryFn: () => gqlClient.request<CollectionResult>(GET_COLLECTION, { id: collectionAddress }),
    refetchInterval: SLOW_REFETCH_MS,
    staleTime: SLOW_REFETCH_MS,
  });

  const { data: tokensData } = useQuery({
    queryKey: ["collection-all-tokens", collectionAddress],
    queryFn: () =>
      gqlClient
        .request<TokensByCollectionResult>(GET_TOKENS_BY_COLLECTION, {
          collection: collectionAddress,
          first: 100,
          skip: 0,
        })
        .catch(() => ({ tokens: [] })),
    refetchInterval: SLOW_REFETCH_MS,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["collection-listings", collectionAddress],
    queryFn: () =>
      gqlClient.request<ActiveListingsResult>(GET_LISTINGS_BY_COLLECTION, {
        collection: collectionAddress,
        first: 100,
        skip: 0,
        now: unixNowSeconds(),
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const { data: auctionsData } = useQuery({
    queryKey: ["collection-auctions", collectionAddress],
    queryFn: () =>
      gqlClient.request<ActiveAuctionsResult>(GET_AUCTIONS_BY_COLLECTION, {
        collection: collectionAddress,
        first: 50,
        skip: 0,
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const { data: offersData } = useQuery({
    queryKey: ["collection-offers", collectionAddress],
    queryFn: () =>
      gqlClient.request<OffersByCollectionResult>(GET_OFFERS_BY_COLLECTION, {
        collection: collectionAddress,
        first: 50,
        skip: 0,
        now: unixNowSeconds(),
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const { data: salesData } = useQuery({
    queryKey: ["collection-sales", collectionAddress],
    queryFn: () =>
      gqlClient.request<{ sales: Array<{ id: string; price: string; paymentToken: string; timestamp?: string; tokenId?: string }> }>(
        GET_SALES_BY_COLLECTION,
        {
          collection: collectionAddress,
          first: 100,
        },
      ),
    refetchInterval: SLOW_REFETCH_MS,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["collection-activity", collectionAddress],
    queryFn: () =>
      gqlClient.request<GlobalActivityResult>(GET_ACTIVITY_BY_COLLECTION, {
        collection: collectionAddress,
        first: 50,
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
    enabled: tab === "Activity" || tab === "Analytics",
  });

  const col = colData?.collection;
  const listings = listingsData?.listings ?? [];
  const auctions = (auctionsData?.auctions ?? []).filter((a) => a.active);
  const offers = offersData?.offers ?? [];
  const sales = salesData?.sales ?? [];
  const indexedTokens = tokensData?.tokens ?? [];

  const ethListings = useMemo(() => {
    return listings
      .filter((l) => l.paymentToken === ETH_ADDRESS)
      .sort((a, b) => (BigInt(a.pricePerItem) < BigInt(b.pricePerItem) ? -1 : 1));
  }, [listings]);

  const floorWei = ethListings.length ? BigInt(ethListings[0].pricePerItem) : null;

  const topOfferWei = useMemo(() => {
    const ethOffers = offers.filter((o) => o.paymentToken === ETH_ADDRESS);
    if (!ethOffers.length) return null;
    return ethOffers.reduce((max, o) => {
      const amount = BigInt(o.amount);
      return amount > max ? amount : max;
    }, 0n);
  }, [offers]);

  const totalVolumeWei = useMemo(() => {
    return sales
      .filter((s) => s.paymentToken === ETH_ADDRESS)
      .reduce((sum, s) => sum + BigInt(s.price), 0n);
  }, [sales]);

  // Last sale lookup map by tokenId
  const lastSaleMap = useMemo(() => {
    const map = new Map<string, bigint>();
    for (const s of sales) {
      if (s.tokenId && s.paymentToken === ETH_ADDRESS && !map.has(s.tokenId)) {
        map.set(s.tokenId, BigInt(s.price));
      }
    }
    return map;
  }, [sales]);

  // 24h & 7d volume metrics
  const { volume24hWei, sales24hCount, volume7dWei, avgSalePriceWei } = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const dayAgoSec = nowSec - 86400;
    const weekAgoSec = nowSec - 7 * 86400;

    let v24 = 0n;
    let c24 = 0;
    let v7 = 0n;

    for (const s of sales) {
      if (s.paymentToken !== ETH_ADDRESS) continue;
      const ts = Number(s.timestamp || 0);
      const price = BigInt(s.price);
      if (ts >= dayAgoSec) {
        v24 += price;
        c24 += 1;
      }
      if (ts >= weekAgoSec) {
        v7 += price;
      }
    }

    const avg = sales.length > 0 && totalVolumeWei > 0n ? totalVolumeWei / BigInt(sales.length) : null;

    return {
      volume24hWei: v24,
      sales24hCount: c24,
      volume7dWei: v7,
      avgSalePriceWei: avg,
    };
  }, [sales, totalVolumeWei]);

  // Listing price lookup map for trait floor computation
  const listingPriceMap = useMemo(() => {
    const map = new Map<string, bigint>();
    for (const l of ethListings) {
      map.set(l.tokenId, BigInt(l.pricePerItem));
    }
    return map;
  }, [ethListings]);

  // ────────────────── Build Unified Item Pool (Listed + Not Listed + Auctions) ──────────────────
  const { allItems, allTokenIds, listedCount, notListedCount, auctionCount } = useMemo(() => {
    const listingMap = new Map<string, ActiveListingsResult["listings"][number]>();
    for (const l of listings) {
      listingMap.set(l.tokenId, l);
    }

    const auctionMap = new Map<string, ActiveAuctionsResult["auctions"][number]>();
    for (const a of auctions) {
      auctionMap.set(a.tokenId, a);
    }

    const topOfferMap = new Map<string, OffersByCollectionResult["offers"][number]>();
    for (const o of offers) {
      const existing = topOfferMap.get(o.tokenId);
      if (!existing || BigInt(o.amount) > BigInt(existing.amount)) {
        topOfferMap.set(o.tokenId, o);
      }
    }

    const tokenIdSet = new Set<string>();
    const ownerMap = new Map<string, string>();

    // 1. Add all tokens discovered by the indexer
    for (const t of indexedTokens) {
      tokenIdSet.add(t.tokenId);
      if (t.owner) ownerMap.set(t.tokenId, t.owner);
    }

    // 2. Add all token IDs from active listings, auctions, offers, and sales
    for (const l of listings) tokenIdSet.add(l.tokenId);
    for (const a of auctions) tokenIdSet.add(a.tokenId);
    for (const o of offers) tokenIdSet.add(o.tokenId);
    for (const s of sales) if (s.tokenId) tokenIdSet.add(s.tokenId);

    // 3. If on-chain supply exists and token count is small, probe sequential IDs 1..N
    if (onChainSupply && onChainSupply > 0n && onChainSupply <= 60n) {
      const supplyNum = Number(onChainSupply);
      for (let i = 1; i <= supplyNum; i++) {
        tokenIdSet.add(String(i));
      }
    }

    const items: UnifiedItem[] = [];
    const tokenIdsArr: string[] = [];
    let lCount = 0;
    let aCount = 0;
    let nlCount = 0;

    for (const tokenId of tokenIdSet) {
      tokenIdsArr.push(tokenId);
      const l = listingMap.get(tokenId);
      const a = auctionMap.get(tokenId);
      const topO = topOfferMap.get(tokenId);
      const lastSale = lastSaleMap.get(tokenId) ?? null;
      const owner = ownerMap.get(tokenId) ?? l?.seller ?? a?.seller ?? null;

      if (l) {
        items.push({
          id: `${collectionAddress}-${tokenId}`,
          tokenId,
          status: "Buy Now",
          listing: l,
          owner,
          topOffer: topO,
          lastSalePrice: lastSale,
        });
        lCount++;
      } else if (a) {
        items.push({
          id: `${collectionAddress}-${tokenId}`,
          tokenId,
          status: "On Auction",
          auction: a,
          owner,
          topOffer: topO,
          lastSalePrice: lastSale,
        });
        aCount++;
      } else {
        items.push({
          id: `${collectionAddress}-${tokenId}`,
          tokenId,
          status: "Not Listed",
          owner,
          topOffer: topO,
          lastSalePrice: lastSale,
        });
        nlCount++;
      }
    }

    return {
      allItems: items,
      allTokenIds: tokenIdsArr,
      listedCount: lCount,
      notListedCount: nlCount,
      auctionCount: aCount,
    };
  }, [listings, auctions, indexedTokens, offers, sales, onChainSupply, collectionAddress, lastSaleMap]);

  // Calculate Unique Owners and Unique Holders %
  const { uniqueOwnersCount, uniqueHoldersPercent } = useMemo(() => {
    const ownersSet = new Set<string>();
    for (const item of allItems) {
      if (item.owner) ownersSet.add(item.owner.toLowerCase());
    }
    const count = ownersSet.size > 0 ? ownersSet.size : Math.max(1, Math.round(allItems.length * 0.45));
    const total = onChainSupply && onChainSupply > 0n ? Number(onChainSupply) : Math.max(allItems.length, 1);
    const pct = Math.min(100, Math.max(1, Math.round((count / total) * 100)));
    return {
      uniqueOwnersCount: count,
      uniqueHoldersPercent: pct,
    };
  }, [allItems, onChainSupply]);

  // ────────────────── Fetch Trait Categories & Token Rarity ──────────────────
  const { data: traitsData } = useCollectionTraits(
    collectionAddress,
    allTokenIds,
    col?.metadataURI,
    listingPriceMap,
  );

  const traitGroups = traitsData?.traitGroups ?? [];
  const tokenTraitsMap = traitsData?.tokenTraitsMap;
  const tokenRarityMap = traitsData?.tokenRarityMap;

  // Toggle Trait Selection
  function handleToggleTrait(traitType: string, value: string) {
    setSelectedTraits((prev) => {
      const currentList = prev[traitType] ?? [];
      const exists = currentList.includes(value);
      const nextList = exists ? currentList.filter((v) => v !== value) : [...currentList, value];

      const next = { ...prev };
      if (nextList.length === 0) {
        delete next[traitType];
      } else {
        next[traitType] = nextList;
      }
      return next;
    });
  }

  function handleRemoveTrait(traitType: string, value: string) {
    setSelectedTraits((prev) => {
      const currentList = prev[traitType] ?? [];
      const nextList = currentList.filter((v) => v !== value);
      const next = { ...prev };
      if (nextList.length === 0) {
        delete next[traitType];
      } else {
        next[traitType] = nextList;
      }
      return next;
    });
  }

  // Count total active trait filters
  const activeTraitCount = useMemo(() => {
    return Object.values(selectedTraits).reduce((acc, list) => acc + list.length, 0);
  }, [selectedTraits]);

  // ────────────────── Filter & Sort Unified Items (Including Rarity) ──────────────────
  const filteredItems = useMemo(() => {
    let rows = [...allItems];

    // 1. Status filter
    if (status === "Buy Now") {
      rows = rows.filter((i) => i.status === "Buy Now");
    } else if (status === "On Auction") {
      rows = rows.filter((i) => i.status === "On Auction");
    } else if (status === "Not Listed") {
      rows = rows.filter((i) => i.status === "Not Listed");
    }

    // 2. Search query filter
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((i) => i.tokenId.toLowerCase().includes(q));
    }

    // 3. Min & Max Price filter
    if (minPrice || maxPrice) {
      const minWei = minPrice ? parseEthInput(minPrice) : 0n;
      const maxWei = maxPrice ? parseEthInput(maxPrice) : 0n;

      rows = rows.filter((i) => {
        if (i.status === "Buy Now" && i.listing) {
          const p = BigInt(i.listing.pricePerItem);
          if (minWei > 0n && p < minWei) return false;
          if (maxWei > 0n && p > maxWei) return false;
          return true;
        }
        if (i.status === "On Auction" && i.auction) {
          const p = BigInt(i.auction.highestBid || i.auction.reservePrice || "0");
          if (minWei > 0n && p < minWei) return false;
          if (maxWei > 0n && p > maxWei) return false;
          return true;
        }
        return false;
      });
    }

    // 4. OpenSea Trait Filtering
    if (activeTraitCount > 0 && tokenTraitsMap) {
      rows = rows.filter((i) => {
        const itemTraits = tokenTraitsMap.get(i.tokenId) ?? [];
        const itemTraitLookup = new Map<string, string>();
        for (const t of itemTraits) {
          itemTraitLookup.set(t.trait_type, t.value);
        }

        for (const [traitType, selectedValues] of Object.entries(selectedTraits)) {
          if (selectedValues.length === 0) continue;
          const itemVal = itemTraitLookup.get(traitType);
          if (!itemVal || !selectedValues.includes(itemVal)) {
            return false;
          }
        }
        return true;
      });
    }

    // 5. Sorting (Including Rarity)
    if (sort === "Price: Low to High") {
      rows.sort((a, b) => {
        const pA = a.listing ? BigInt(a.listing.pricePerItem) : a.auction ? BigInt(a.auction.highestBid || a.auction.reservePrice || "0") : 999999999999999999999n;
        const pB = b.listing ? BigInt(b.listing.pricePerItem) : b.auction ? BigInt(b.auction.highestBid || b.auction.reservePrice || "0") : 999999999999999999999n;
        if (pA === pB) return Number(a.tokenId) - Number(b.tokenId);
        return pA < pB ? -1 : 1;
      });
    } else if (sort === "Price: High to Low") {
      rows.sort((a, b) => {
        const pA = a.listing ? BigInt(a.listing.pricePerItem) : a.auction ? BigInt(a.auction.highestBid || a.auction.reservePrice || "0") : -1n;
        const pB = b.listing ? BigInt(b.listing.pricePerItem) : b.auction ? BigInt(b.auction.highestBid || b.auction.reservePrice || "0") : -1n;
        if (pA === pB) return Number(a.tokenId) - Number(b.tokenId);
        return pA > pB ? -1 : 1;
      });
    } else if (sort === "Rarity: Rare to Common") {
      rows.sort((a, b) => {
        const rA = tokenRarityMap?.get(a.tokenId)?.rank ?? 99999;
        const rB = tokenRarityMap?.get(b.tokenId)?.rank ?? 99999;
        return rA - rB;
      });
    } else if (sort === "Rarity: Common to Rare") {
      rows.sort((a, b) => {
        const rA = tokenRarityMap?.get(a.tokenId)?.rank ?? 0;
        const rB = tokenRarityMap?.get(b.tokenId)?.rank ?? 0;
        return rB - rA;
      });
    } else if (sort === "Token ID") {
      rows.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));
    } else {
      // Recently Listed
      rows.sort((a, b) => {
        const tA = a.listing ? Number(a.listing.createdAtTimestamp) : 0;
        const tB = b.listing ? Number(b.listing.createdAtTimestamp) : 0;
        if (tA === tB) return Number(a.tokenId) - Number(b.tokenId);
        return tB - tA;
      });
    }

    return rows;
  }, [allItems, status, query, minPrice, maxPrice, activeTraitCount, tokenTraitsMap, tokenRarityMap, selectedTraits, sort]);

  // Paginated visible items for high performance rendering
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(0, visibleLimit);
  }, [filteredItems, visibleLimit]);

  const hasMoreItems = visibleLimit < filteredItems.length;

  function handleLoadMore() {
    setVisibleLimit((prev) => prev + PAGE_SIZE);
  }

  // Bulk sweep selection handler
  function handleQuickSweep(count: number) {
    setSweepCount(count);
    clearCart();
    if (count <= 0) return;

    const available = ethListings
      .filter((listing) => !address || listing.seller.toLowerCase() !== address.toLowerCase())
      .slice(0, count);

    if (!available.length) {
      toast.error("No eligible listed items available to sweep.");
      return;
    }

    available.forEach((listing) => {
      addItem({
        listingId: BigInt(listing.id),
        quantity: BigInt(listing.quantity),
        paymentToken: listing.paymentToken,
        pricePerItem: BigInt(listing.pricePerItem),
      });
    });

    toast.success(`Selected ${available.length} floor items for sweep!`, { id: "sweep-quick" });
  }

  function handleAddToCart(listing: ActiveListingsResult["listings"][number]) {
    if (address && listing.seller.toLowerCase() === address.toLowerCase()) {
      toast.error("You cannot buy your own listing.");
      return;
    }
    if (listing.paymentToken !== ETH_ADDRESS) {
      toast.error("Sweep only supports ETH listings for now.");
      return;
    }
    addItem({
      listingId: BigInt(listing.id),
      quantity: BigInt(listing.quantity),
      paymentToken: listing.paymentToken,
      pricePerItem: BigInt(listing.pricePerItem),
    });
    toast.success(`Token #${listing.tokenId} added to cart.`, { id: `cart-${listing.id}` });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Collection link copied.");
    setTimeout(() => setCopied(false), 1500);
  }

  // Active filters total count
  const activeFiltersCount =
    (status !== "All" ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (query ? 1 : 0) + activeTraitCount;

  const clearAllFilters = () => {
    setStatus("All");
    setMinPrice("");
    setMaxPrice("");
    setQuery("");
    setSelectedTraits({});
  };

  if (colLoading) {
    return (
      <Shell>
        <div className="h-[240px] animate-pulse bg-muted" />
        <div className="page-section space-y-4">
          <div className="-mt-10 h-16 w-16 rounded-full bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  if (!col) {
    return (
      <Shell>
        <div className="page-section flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <p className="text-lg font-semibold">Collection not found</p>
          <p className="text-sm text-muted-foreground">
            No collection registered at address <code className="text-xs">{collectionAddress}</code>
          </p>
          <Button asChild variant="outline">
            <Link to="/explore" search={{ q: undefined }}>
              Browse collections
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const displayName = supabaseMeta?.name ?? `${collectionAddress.slice(0, 6)}…${collectionAddress.slice(-4)}`;
  const royaltyDisplay = col.royaltyBps != null ? formatBps(col.royaltyBps) : "—";
  const tokenStandard: "ERC-721" | "ERC-1155" = col.tokenStandard === "ERC1155" ? "ERC-1155" : "ERC-721";
  const logoSrc = supabaseMeta?.logo_url || null;
  const bannerSrc = supabaseMeta?.banner_url || null;
  const colDescription = supabaseMeta?.description ?? null;
  const totalSupplyDisplay = onChainSupply != null ? Number(onChainSupply).toLocaleString() : String(allItems.length);
  const itemCount = filteredItems.length;

  const gridClass =
    density === 3
      ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
      : density === 5
        ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        : "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4";

  // Data for Sales Analytics Charts
  const salesChartData = [...sales]
    .filter((s) => s.paymentToken === ETH_ADDRESS && s.timestamp)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .map((s) => ({
      date: new Date(Number(s.timestamp) * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      price: Number(formatEth(BigInt(s.price))),
      tokenId: s.tokenId ? `#${s.tokenId}` : "Item",
    }));

  const floorItem = ethListings[0];
  const { address } = useWallet();
  const isFloorItemOwner = Boolean(
    address && floorItem && floorItem.seller.toLowerCase() === address.toLowerCase()
  );

  return (
    <Shell>
      {/* ────────────────── Hero Banner & Collection Identity ────────────────── */}
      <section className="relative">
        <div className="relative h-[200px] overflow-hidden sm:h-[260px] lg:h-[320px]">
          {bannerSrc ? (
            <img src={bannerSrc} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-gradient-to-br from-muted via-card to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        </div>

        <div className="page-section pt-0">
          <div className="relative z-10 -mt-12 flex flex-col gap-4 sm:-mt-16 lg:flex-row lg:items-end lg:gap-6">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={displayName}
                className="size-[96px] rounded-2xl border-4 border-background object-cover shadow-xl sm:size-[112px]"
              />
            ) : (
              <div className="grid size-[96px] place-content-center rounded-2xl border-4 border-background bg-muted text-3xl font-display sm:size-[112px]">
                {displayName.slice(0, 1)}
              </div>
            )}

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{displayName}</h1>
                {col.verified && <Verified />}

                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {/* Quick Offer Button */}
                  {floorItem && !isFloorItemOwner && (
                    <OfferDialog
                      nftContract={collectionAddress}
                      tokenId={floorItem.tokenId}
                      tokenStandard={tokenStandard}
                      label="Make Offer"
                      variant="outline"
                      className="h-8 rounded-full text-xs font-semibold shadow-sm"
                    />
                  )}

                  <IconBtn label={watching ? "Unwatch" : "Watch"} onClick={() => setWatching(!watching)}>
                    <Star className={cn("size-4", watching && "fill-gold text-gold")} />
                  </IconBtn>
                  {supabaseMeta?.website_url && (
                    <IconBtn href={supabaseMeta.website_url} label="Website">
                      <Globe className="size-4" />
                    </IconBtn>
                  )}
                  {supabaseMeta?.twitter_handle && (
                    <IconBtn
                      href={`https://x.com/${supabaseMeta.twitter_handle.replace(/^@/, "")}`}
                      label="X / Twitter"
                    >
                      <Twitter className="size-4" />
                    </IconBtn>
                  )}
                  {supabaseMeta?.discord_url && (
                    <IconBtn
                      href={
                        supabaseMeta.discord_url.startsWith("http")
                          ? supabaseMeta.discord_url
                          : `https://${supabaseMeta.discord_url}`
                      }
                      label="Discord"
                    >
                      <MessageCircle className="size-4" />
                    </IconBtn>
                  )}
                  {supabaseMeta?.telegram_url && (
                    <IconBtn
                      href={
                        supabaseMeta.telegram_url.startsWith("http")
                          ? supabaseMeta.telegram_url
                          : `https://${supabaseMeta.telegram_url}`
                      }
                      label="Telegram"
                    >
                      <Send className="size-4" />
                    </IconBtn>
                  )}
                  <IconBtn label="Copy link" onClick={copyLink}>
                    {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                  </IconBtn>
                  <IconBtn label="Share" onClick={copyLink}>
                    <Share2 className="size-4" />
                  </IconBtn>
                  <IconBtn href={addressUrl(collectionAddress)} label="BaseScan Explorer">
                    <ExternalLink className="size-4" />
                  </IconBtn>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                <span>
                  Created by <span className="font-semibold text-foreground">{shortAddr(col.creator)}</span>
                </span>
                {totalSupplyDisplay && (
                  <>
                    <span className="text-border">·</span>
                    <span>{totalSupplyDisplay} total items</span>
                  </>
                )}
                <span className="text-border">·</span>
                <span>{listedCount.toLocaleString()} listed</span>
                <span className="text-border">·</span>
                <span>{notListedCount.toLocaleString()} unlisted</span>
                <span className="text-border">·</span>
                <span>
                  {uniqueOwnersCount.toLocaleString()} owners ({uniqueHoldersPercent}% unique)
                </span>
                <span className="text-border">·</span>
                <span>{formatCreated(col.registeredAt)}</span>
                <span className="text-border">·</span>
                <span>{royaltyDisplay} creator fee</span>
                <span className="text-border">·</span>
                <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                  {tokenStandard}
                </span>
              </div>

              {supabaseMeta?.categories && supabaseMeta.categories.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {supabaseMeta.categories.map((catId) => {
                    const cat = getCategoryById(catId);
                    const Icon = cat?.icon;
                    return (
                      <Link
                        key={catId}
                        to="/explore"
                        search={{ q: undefined, category: catId }}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:border-primary/50 hover:bg-muted"
                      >
                        {Icon && <Icon className="size-3 text-primary" />}
                        <span>{cat?.label ?? catId}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {colDescription && (
            <div className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              <p className={descOpen ? "" : "line-clamp-2"}>{colDescription}</p>
              {colDescription.length > 140 && (
                <button
                  type="button"
                  className="mt-1 flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
                  onClick={() => setDescOpen(!descOpen)}
                >
                  {descOpen ? "Show less" : "See more"}{" "}
                  <ChevronDown className={cn("size-3 transition duration-200", descOpen && "rotate-180")} />
                </button>
              )}
            </div>
          )}

          {/* ────────────────── OpenSea-style Metrics Ribbon ────────────────── */}
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card/60 p-4 sm:grid-cols-4 lg:grid-cols-8">
            <Metric
              label="Floor price"
              value={floorWei ? formatEthCompact(floorWei) : "—"}
              badge={floorWei ? "Live" : undefined}
            />
            <Metric label="Top offer" value={topOfferWei ? formatEthCompact(topOfferWei) : "—"} />
            <Metric label="24h Volume" value={volume24hWei > 0n ? formatEthCompact(volume24hWei) : "—"} />
            <Metric label="Total volume" value={totalVolumeWei > 0n ? formatEthCompact(totalVolumeWei) : "—"} />
            <Metric
              label="Listed"
              value={String(listedCount)}
              sub={
                allItems.length > 0
                  ? `(${Math.min(100, Math.round((listedCount / allItems.length) * 100))}%)`
                  : undefined
              }
            />
            <Metric
              label="Owners"
              value={uniqueOwnersCount.toLocaleString()}
              sub={`(${uniqueHoldersPercent}%)`}
            />
            <Metric
              label="Unique holders"
              value={`${uniqueHoldersPercent}%`}
            />
            <Metric label="Auctions" value={String(auctionCount)} />
          </div>

          {/* ────────────────── Tabbed Navigation ────────────────── */}
          <div className="mt-5 flex gap-6 overflow-x-auto border-b border-border">
            {(["Items", "Analytics", "Offers", "Activity", "About"] as const).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={cn(tab === name ? "tab-active" : "tab", "flex items-center gap-2 pb-3 text-sm font-semibold")}
              >
                {name === "Items" && <LayoutGrid className="size-4" />}
                {name === "Analytics" && <BarChart2 className="size-4" />}
                {name === "Offers" && <Tag className="size-4" />}
                {name === "Activity" && <ActivityIcon className="size-4" />}
                {name}
                {name === "Offers" && col.activeOfferCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {col.activeOfferCount}
                  </span>
                )}
                {name === "Items" && itemCount > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {itemCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── Tab Contents ────────────────── */}
      <main className="page-section pt-4 pb-28">
        {/* ────────────────── Tab 1: Items (With OpenSea Trait & Rarity Filters) ────────────────── */}
        {tab === "Items" && (
          <>
            {/* Top Filter & Sweeper Toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                variant={filtersOpen ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="h-9 gap-1.5 text-xs font-semibold"
                aria-label="Toggle Filters"
              >
                <SlidersHorizontal className="size-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="grid size-4 place-content-center rounded-full bg-background text-[10px] font-bold text-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              {/* Search Bar */}
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by token ID..."
                  className="h-9 bg-card pl-9 text-xs"
                />
              </div>

              {/* Sort Selector (Including OpenSea Rarity Sorting) */}
              <div className="w-52">
                <SelectBox
                  placeholder={sort}
                  items={[
                    "Price: Low to High",
                    "Price: High to Low",
                    "Rarity: Rare to Common",
                    "Rarity: Common to Rare",
                    "Recently Listed",
                    "Token ID",
                  ]}
                  onSelect={(value) => setSort(value as SortKey)}
                />
              </div>

              {/* View Mode Toggle: Grid vs List */}
              <div className="flex overflow-hidden rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "grid size-9 place-content-center transition",
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                  title="Grid View"
                >
                  <Grid2X2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "grid size-9 place-content-center transition",
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                  title="List View"
                >
                  <List className="size-4" />
                </button>
              </div>

              {/* Density Controls (if Grid mode) */}
              {viewMode === "grid" && (
                <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:flex">
                  {([3, 4, 5] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDensity(n)}
                      className={cn(
                        "grid size-9 place-content-center text-xs font-semibold transition",
                        density === n ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                      )}
                      aria-label={`${n} columns`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              <SweepDialog items={cartItems} onClear={clearCart} onRemove={removeItem} />
            </div>

            {/* Active Filter Chips / Pills (OpenSea Pattern) */}
            {activeFiltersCount > 0 && (
              <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
                {status !== "All" && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <span>Status: {status}</span>
                    <button type="button" onClick={() => setStatus("All")} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {(minPrice || maxPrice) && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <span>
                      Price: {minPrice || "0"} - {maxPrice || "∞"} ETH
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice("");
                        setMaxPrice("");
                      }}
                      className="hover:opacity-75"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {Object.entries(selectedTraits).map(([type, values]) =>
                  values.map((val) => (
                    <span
                      key={`${type}-${val}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm"
                    >
                      <span className="text-muted-foreground">{type}:</span>
                      <span>{val}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTrait(type, val)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )),
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="ml-1 text-xs font-bold text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Quick Sweep Preset Selector Bar */}
            {ethListings.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Zap className="size-3.5 text-amber-500" />
                    <span>Quick Sweep:</span>
                  </div>
                  {[1, 3, 5, 10, 20].map((num) => {
                    const isAvailable = ethListings.length >= num;
                    const isSelected = cartItems.length === num && sweepCount === num;
                    return (
                      <Button
                        key={num}
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        disabled={!isAvailable && ethListings.length < 1}
                        onClick={() => handleQuickSweep(Math.min(num, ethListings.length))}
                        className={cn(
                          "h-7 rounded-lg px-2.5 text-xs font-semibold",
                          isSelected && "shadow-sm",
                        )}
                      >
                        {num} {num === 1 ? "Item" : "Items"}
                      </Button>
                    );
                  })}
                  {ethListings.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleQuickSweep(ethListings.length)}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      All ({ethListings.length})
                    </Button>
                  )}
                </div>

                {cartItems.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Selected: <b className="text-foreground">{cartItems.length}</b>
                    </span>
                    <Button size="sm" variant="ghost" onClick={clearCart} className="h-7 px-2 text-xs text-muted-foreground">
                      Reset
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Main Content Layout with Filter Sidebar */}
            <div className={cn("grid gap-5", filtersOpen ? "lg:grid-cols-[260px_1fr]" : "")}>
              {filtersOpen && (
                <aside className="h-fit space-y-4 rounded-xl border border-border bg-card/70 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Filters</h2>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={clearAllFilters}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Status Filter (OpenSea Pattern: All, Buy Now, Not Listed, On Auction) */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                    <div className="space-y-1.5">
                      {(["All", "Buy Now", "Not Listed", "On Auction"] as const).map((label) => (
                        <label
                          key={label}
                          className="flex cursor-pointer items-center justify-between rounded-md p-1.5 text-xs transition hover:bg-muted"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox checked={status === label} onCheckedChange={() => setStatus(label)} />
                            <span>{label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {label === "All"
                              ? allItems.length
                              : label === "Buy Now"
                                ? listedCount
                                : label === "Not Listed"
                                  ? notListedCount
                                  : auctionCount}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Range Filter */}
                  <div className="border-t border-border pt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (ETH)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="h-8 bg-background text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="h-8 bg-background text-xs"
                      />
                    </div>
                  </div>

                  {/* ────────────────── OpenSea Trait / Attribute Filter Accordion ────────────────── */}
                  {traitGroups.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Traits</p>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {traitGroups.length}
                        </span>
                      </div>

                      <Accordion type="multiple" className="space-y-1">
                        {traitGroups.map((group) => {
                          const activeForType = selectedTraits[group.traitType] ?? [];
                          const search = traitSearchQuery[group.traitType]?.toLowerCase() ?? "";
                          const filteredValues = search
                            ? group.values.filter((v) => v.value.toLowerCase().includes(search))
                            : group.values;

                          return (
                            <AccordionItem
                              key={group.traitType}
                              value={group.traitType}
                              className="rounded-lg border border-border/70 bg-card/90 px-3 py-0"
                            >
                              <AccordionTrigger className="py-2.5 text-xs font-semibold hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <span>{group.traitType}</span>
                                  {activeForType.length > 0 && (
                                    <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                                      {activeForType.length}
                                    </span>
                                  )}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-3 pt-1">
                                {group.values.length > 4 && (
                                  <div className="mb-2">
                                    <Input
                                      placeholder={`Search ${group.traitType}...`}
                                      value={traitSearchQuery[group.traitType] ?? ""}
                                      onChange={(e) =>
                                        setTraitSearchQuery((prev) => ({
                                          ...prev,
                                          [group.traitType]: e.target.value,
                                        }))
                                      }
                                      className="h-7 bg-background text-[11px]"
                                    />
                                  </div>
                                )}

                                <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                                  {filteredValues.map((v) => {
                                    const isChecked = activeForType.includes(v.value);
                                    return (
                                      <label
                                        key={v.value}
                                        className="flex cursor-pointer items-center justify-between rounded p-1 text-xs transition hover:bg-muted/70"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={() => handleToggleTrait(group.traitType, v.value)}
                                          />
                                          <span className="truncate max-w-[120px] font-medium">{v.value}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                                          {v.floorPrice ? (
                                            <span className="text-primary">{formatEthCompact(v.floorPrice)}</span>
                                          ) : null}
                                          <span>{v.count}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  )}

                  {/* Collection Details Summary */}
                  <div className="border-t border-border pt-4 text-xs text-muted-foreground">
                    <p className="font-bold uppercase tracking-wider">Quick Info</p>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span>Total Items</span>
                        <span className="font-semibold text-foreground">{allItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Standard</span>
                        <span className="font-semibold text-foreground">{tokenStandard}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Royalty</span>
                        <span className="font-semibold text-foreground">{royaltyDisplay}</span>
                      </div>
                    </div>
                  </div>
                </aside>
              )}

              <div>
                <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>
                    Showing {Math.min(visibleLimit, itemCount)} of {itemCount.toLocaleString()}{" "}
                    {itemCount === 1 ? "item" : "items"}
                    {status !== "All" && ` · ${status}`}
                    {activeTraitCount > 0 && ` · ${activeTraitCount} trait filter${activeTraitCount > 1 ? "s" : ""}`}
                  </span>
                  {floorWei && (
                    <span>
                      Floor: <b className="text-foreground">{formatEthCompact(floorWei)}</b>
                    </span>
                  )}
                </div>

                {listingsLoading ? (
                  <div className={gridClass}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                ) : itemCount === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="text-sm font-semibold">No items match your selected filters.</p>
                    <p className="text-xs text-muted-foreground">Try clearing trait, price, or status filters to view all collection items.</p>
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      Clear Filters
                    </Button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="space-y-6">
                    <div className={gridClass}>
                      {paginatedItems.map((item, index) => {
                        const rarity = tokenRarityMap?.get(item.tokenId);
                        if (item.status === "Buy Now" && item.listing) {
                          return (
                            <ListingCard
                              key={item.id}
                              listing={item.listing}
                              collectionAddress={collectionAddress}
                              tokenStandard={tokenStandard}
                              floorWei={floorWei}
                              rarity={rarity}
                              lastSalePrice={item.lastSalePrice}
                              index={index}
                              inCart={cartItems.some((c) => c.listingId === BigInt(item.listing!.id))}
                              onAddToCart={() => handleAddToCart(item.listing!)}
                              onRemoveFromCart={() => removeItem(BigInt(item.listing!.id))}
                            />
                          );
                        }
                        if (item.status === "On Auction" && item.auction) {
                          return (
                            <AuctionCard
                              key={item.id}
                              auction={item.auction}
                              collectionAddress={collectionAddress}
                              rarity={rarity}
                              lastSalePrice={item.lastSalePrice}
                              index={index}
                            />
                          );
                        }
                        return (
                          <UnlistedCard
                            key={item.id}
                            collectionAddress={collectionAddress}
                            tokenId={item.tokenId}
                            owner={item.owner}
                            topOffer={item.topOffer}
                            rarity={rarity}
                            lastSalePrice={item.lastSalePrice}
                            tokenStandard={tokenStandard}
                            index={index}
                          />
                        );
                      })}
                    </div>

                    {/* Infinite Scroll / Paginated Batch Loading Trigger */}
                    {hasMoreItems && (
                      <div className="flex flex-col items-center justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          className="h-10 px-6 font-semibold shadow-sm hover:border-primary/50"
                        >
                          Load More Items ({itemCount - visibleLimit} remaining)
                        </Button>
                        <p className="text-[11px] text-muted-foreground">
                          Showing {visibleLimit} of {itemCount} items
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* List View Table Mode */
                  <div className="space-y-6">
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="p-3">Item</th>
                            <th className="p-3">Rarity</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Price / Top Offer</th>
                            <th className="p-3">Last Sale</th>
                            <th className="p-3">Owner / Seller</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedItems.map((item) => {
                            const rarity = tokenRarityMap?.get(item.tokenId);
                            if (item.status === "Buy Now" && item.listing) {
                              return (
                                <ListingTableRow
                                  key={item.id}
                                  listing={item.listing}
                                  collectionAddress={collectionAddress}
                                  floorWei={floorWei}
                                  rarity={rarity}
                                  lastSalePrice={item.lastSalePrice}
                                  inCart={cartItems.some((c) => c.listingId === BigInt(item.listing!.id))}
                                  onAddToCart={() => handleAddToCart(item.listing!)}
                                  onRemoveFromCart={() => removeItem(BigInt(item.listing!.id))}
                                />
                              );
                            }
                            if (item.status === "On Auction" && item.auction) {
                              return (
                                <AuctionTableRow
                                  key={item.id}
                                  auction={item.auction}
                                  collectionAddress={collectionAddress}
                                  rarity={rarity}
                                  lastSalePrice={item.lastSalePrice}
                                />
                              );
                            }
                            return (
                              <UnlistedTableRow
                                key={item.id}
                                collectionAddress={collectionAddress}
                                tokenId={item.tokenId}
                                owner={item.owner}
                                topOffer={item.topOffer}
                                rarity={rarity}
                                lastSalePrice={item.lastSalePrice}
                                tokenStandard={tokenStandard}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Load More Button for Table Mode */}
                    {hasMoreItems && (
                      <div className="flex flex-col items-center justify-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          className="h-9 px-6 font-semibold shadow-sm hover:border-primary/50"
                        >
                          Load More Items ({itemCount - visibleLimit} remaining)
                        </Button>
                        <p className="text-[11px] text-muted-foreground">
                          Showing {visibleLimit} of {itemCount} items
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ────────────────── Tab 2: OpenSea-style Analytics ────────────────── */}
        {tab === "Analytics" && (
          <div className="space-y-6">
            {/* KPI Cards Ribbon */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">Floor Price</p>
                <p className="mt-1 text-2xl font-bold">{floorWei ? formatEthCompact(floorWei) : "—"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Lowest active listing</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">24h Sales & Volume</p>
                <p className="mt-1 text-2xl font-bold">{volume24hWei > 0n ? formatEthCompact(volume24hWei) : "0 ETH"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{sales24hCount} transactions in last 24h</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">7d Volume</p>
                <p className="mt-1 text-2xl font-bold">{volume7dWei > 0n ? formatEthCompact(volume7dWei) : "0 ETH"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Past week total volume</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">Average Sale Price</p>
                <p className="mt-1 text-2xl font-bold">{avgSalePriceWei ? formatEthCompact(avgSalePriceWei) : "—"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">All-time average</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">Unique Holders</p>
                <p className="mt-1 text-2xl font-bold">{uniqueHoldersPercent}%</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{uniqueOwnersCount.toLocaleString()} total owners</p>
              </div>
            </div>

            {/* Sales Timeline Chart */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Price & Sales Activity</h3>
                  <p className="text-xs text-muted-foreground">Historical trade prices for this collection</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  {sales.length} Total Sales
                </span>
              </div>

              {salesChartData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary, #3b82f6)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--primary, #3b82f6)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} unit=" ETH" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-border bg-background/95 p-2.5 shadow-xl backdrop-blur">
                                <p className="text-xs font-semibold">{data.tokenId}</p>
                                <p className="text-sm font-bold text-primary">{data.price} ETH</p>
                                <p className="text-[10px] text-muted-foreground">{data.date}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="var(--primary, #3b82f6)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
                  <BarChart2 className="size-8 text-muted-foreground" />
                  <p className="text-sm font-semibold">No recorded sales data yet.</p>
                  <p className="text-xs text-muted-foreground">Sales charts will generate automatically as trades occur.</p>
                </div>
              )}
            </div>

            {/* Price Distribution Histogram */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold">Listing Price Distribution</h3>
                <p className="text-xs text-muted-foreground">Current distribution of active listings</p>
                <div className="mt-4 space-y-2">
                  <PriceBracketRow label="< 0.05 ETH" count={listings.filter((l) => BigInt(l.pricePerItem) < 50000000000000000n).length} total={listings.length} />
                  <PriceBracketRow label="0.05 - 0.2 ETH" count={listings.filter((l) => BigInt(l.pricePerItem) >= 50000000000000000n && BigInt(l.pricePerItem) < 200000000000000000n).length} total={listings.length} />
                  <PriceBracketRow label="0.2 - 0.5 ETH" count={listings.filter((l) => BigInt(l.pricePerItem) >= 200000000000000000n && BigInt(l.pricePerItem) < 500000000000000000n).length} total={listings.length} />
                  <PriceBracketRow label="> 0.5 ETH" count={listings.filter((l) => BigInt(l.pricePerItem) >= 500000000000000000n).length} total={listings.length} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold">Market Depth</h3>
                <p className="text-xs text-muted-foreground">Total Collection Inventory Breakdown</p>
                <div className="mt-6 flex items-center justify-around text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">{listedCount}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Listed for Sale</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div>
                    <p className="text-3xl font-bold text-muted-foreground">{notListedCount}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Not Listed</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div>
                    <p className="text-3xl font-bold text-amber-500">{offers.length}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Active Offers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────── Tab 3: Offers ────────────────── */}
        {tab === "Offers" && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-[1fr_120px_140px_120px] gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Item</span>
              <span>Price</span>
              <span>Offerer</span>
              <span>Expires</span>
            </div>
            {offers.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <p>No active offers on this collection right now.</p>
                <p className="mt-1 text-xs">Be the first to place an offer!</p>
              </div>
            ) : (
              offers.map((offer) => (
                <Link
                  key={offer.id}
                  to="/nfts/$id"
                  params={{ id: `${collectionAddress}-${offer.tokenId}` }}
                  className="grid grid-cols-[1fr_120px_140px_120px] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-muted/30"
                >
                  <span className="font-semibold text-foreground">Token #{offer.tokenId}</span>
                  <span className="font-bold text-primary">
                    {offer.paymentToken === ETH_ADDRESS ? formatEthCompact(BigInt(offer.amount)) : offer.amount}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{shortAddr(offer.offerer)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(Number(offer.expiration) * 1000).toLocaleDateString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}

        {/* ────────────────── Tab 4: Activity ────────────────── */}
        {tab === "Activity" && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {activityLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : (activityData?.activities ?? []).length === 0 ? (
              <p className="p-12 text-center text-sm text-muted-foreground">No recent activity for this collection.</p>
            ) : (
              activityData!.activities.map((row) => {
                const price = row.listing?.pricePerItem ?? row.offer?.amount ?? row.auction?.highestBid ?? null;
                const payToken = row.listing?.paymentToken ?? row.offer?.paymentToken ?? row.auction?.paymentToken ?? null;
                return (
                  <div
                    key={row.id}
                    className="grid items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-muted/20 sm:grid-cols-[160px_1fr_140px_auto]"
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{activityLabel(row.type)}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {row.tokenId ? `Token #${row.tokenId}` : activityKind(row.type)} by{" "}
                      <span className="font-mono text-foreground">{shortAddr(row.account)}</span>
                    </span>
                    <span className="font-bold text-foreground">
                      {price ? (payToken === ETH_ADDRESS ? formatEthCompact(BigInt(price)) : price) : "—"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(Number(row.timestamp) * 1000).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ────────────────── Tab 5: About & Details ────────────────── */}
        {tab === "About" && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">About {displayName}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {colDescription || "No detailed description has been added for this collection yet."}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-sm">
              <h2 className="font-display text-lg font-semibold">Contract Details</h2>
              <dl className="mt-4 space-y-3">
                <DetailRow label="Contract Address" value={shortAddr(collectionAddress)} href={addressUrl(collectionAddress)} />
                <DetailRow label="Network" value="Base Sepolia" />
                <DetailRow label="Token Standard" value={tokenStandard} />
                <DetailRow label="Total Supply" value={totalSupplyDisplay ?? "—"} />
                <DetailRow label="Creator Royalties" value={royaltyDisplay} />
                <DetailRow label="Verified Collection" value={col.verified ? "Yes" : "No"} />
                <DetailRow label="Registration Date" value={formatCreated(col.registeredAt)} />
              </dl>
            </div>
          </div>
        )}
      </main>

      {/* ────────────────── Sticky Sweeper Floating Bottom Bar ────────────────── */}
      {tab === "Items" && floorWei && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur shadow-2xl">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 lg:px-14">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Floor: <b className="text-sm text-foreground">{formatEthCompact(floorWei)}</b>
              </span>
              {topOfferWei && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  · Top Bid: <b className="text-foreground">{formatEthCompact(topOfferWei)}</b>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <SweepDialog items={cartItems} onClear={clearCart} onRemove={removeItem} />
              {ethListings[0] && cartItems.length === 0 && (
                <Button
                  className="gap-1.5 font-semibold shadow-md"
                  onClick={() => {
                    const cheapest = ethListings[0];
                    if (cheapest) handleAddToCart(cheapest);
                  }}
                >
                  <ShoppingCart className="size-4" /> Buy Floor ({formatEthCompact(floorWei)})
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function IconBtn({
  children,
  label,
  href,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "grid size-8 place-content-center rounded-full border border-border bg-card/60 text-muted-foreground transition hover:border-primary/50 hover:bg-muted hover:text-foreground";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} title={label} aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={className} title={label} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  sub,
  badge,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  badge?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {badge && (
          <span className="inline-block rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-500">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-lg font-bold leading-none">
        {value}
        {sub && <small className="ml-1 text-[11px] font-normal text-muted-foreground">{sub}</small>}
      </p>
    </div>
  );
}

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            {value} <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="font-semibold">{value}</span>
        )}
      </dd>
    </div>
  );
}

function PriceBracketRow({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-semibold text-muted-foreground">
          {count} ({percent}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function RarityPill({ rarity }: { rarity?: TokenRarity }) {
  if (!rarity) return null;

  const isUltra = rarity.percentile <= 1;
  const isHigh = rarity.percentile <= 5;
  const isMed = rarity.percentile <= 10;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold shadow-sm backdrop-blur",
        isUltra
          ? "bg-purple-600/90 text-white"
          : isHigh
            ? "bg-amber-500/90 text-white"
            : isMed
              ? "bg-blue-600/90 text-white"
              : "bg-muted/80 text-muted-foreground",
      )}
    >
      <Trophy className="size-2.5" />
      <span>{rarity.label}</span>
    </span>
  );
}

function ListingCard({
  listing,
  collectionAddress,
  tokenStandard,
  floorWei,
  rarity,
  lastSalePrice,
  index,
  inCart,
  onAddToCart,
  onRemoveFromCart,
}: {
  listing: ActiveListingsResult["listings"][number];
  collectionAddress: string;
  tokenStandard: "ERC-721" | "ERC-1155";
  floorWei: bigint | null;
  rarity?: TokenRarity;
  lastSalePrice?: bigint | null;
  index: number;
  inCart: boolean;
  onAddToCart: () => void;
  onRemoveFromCart: () => void;
}) {
  const { imageUri, name } = useTokenMetadata(collectionAddress as `0x${string}`, listing.tokenId);
  const { address } = useWallet();
  const isEth = listing.paymentToken === ETH_ADDRESS;
  const price = isEth ? formatEthCompact(BigInt(listing.pricePerItem)) : listing.pricePerItem;

  const isFloor = floorWei && isEth && BigInt(listing.pricePerItem) === floorWei;
  const isSeller = Boolean(
    address && listing.seller && listing.seller.toLowerCase() === address.toLowerCase()
  );

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
      style={{ animationDelay: `${(index % 24) * 0.03}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${listing.tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg uri={imageUri} alt={name} className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <div className="size-full bg-muted" />
          )}

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {isFloor && (
              <span className="rounded-md bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                Floor
              </span>
            )}
            <RarityPill rarity={rarity} />
          </div>

          <div className="pointer-events-none absolute inset-x-2 bottom-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
            {isSeller ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full bg-background/90 font-semibold backdrop-blur shadow-md"
                asChild
              >
                <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${listing.tokenId}` }}>
                  Manage Listing
                </Link>
              </Button>
            ) : inCart ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full bg-background/90 font-semibold backdrop-blur"
                onClick={(e) => {
                  e.preventDefault();
                  onRemoveFromCart();
                }}
              >
                Remove from Cart
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full font-semibold shadow-lg"
                onClick={(e) => {
                  e.preventDefault();
                  onAddToCart();
                }}
              >
                <ShoppingCart className="size-3.5" /> Buy now
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1 p-3">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-foreground">{name || `#${listing.tokenId}`}</p>
            <span className="text-[10px] font-medium text-muted-foreground">#{listing.tokenId}</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-primary">{price}</p>
            {lastSalePrice ? (
              <span className="text-[10px] text-muted-foreground">Last: {formatEthCompact(lastSalePrice)}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">{isSeller ? "You" : shortAddr(listing.seller)}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

function AuctionCard({
  auction,
  collectionAddress,
  rarity,
  lastSalePrice,
  index,
}: {
  auction: ActiveAuctionsResult["auctions"][number];
  collectionAddress: string;
  rarity?: TokenRarity;
  lastSalePrice?: bigint | null;
  index: number;
}) {
  const { imageUri, name } = useTokenMetadata(collectionAddress as `0x${string}`, auction.tokenId);
  const { address } = useWallet();
  const endsAt = BigInt(auction.endTime);
  const endsInMin = Math.max(0, Math.floor((Number(endsAt) * 1000 - Date.now()) / 60000));
  const reserve = BigInt(auction.reservePrice || "0");
  const bid = BigInt(auction.highestBid || "0");
  const highBid = bid > 0n ? bid : reserve;
  const minBid = ((highBid > 0n ? highBid : 10n ** 15n) * 105n) / 100n;
  const isSeller = Boolean(
    address && auction.seller && auction.seller.toLowerCase() === address.toLowerCase()
  );

  return (
    <div
      className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
      style={{ animationDelay: `${(index % 24) * 0.03}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${auction.tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg uri={imageUri} alt={name} className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <div className="size-full bg-muted" />
          )}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <span className="rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              {endsInMin < 5 ? "Ending soon" : "Live Auction"}
            </span>
            <RarityPill rarity={rarity} />
          </div>
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate text-sm font-semibold">{name || `#${auction.tokenId}`}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{bid > 0n ? "Current bid" : "Reserve price"}</p>
            {lastSalePrice && (
              <span className="text-[10px] text-muted-foreground">Last: {formatEthCompact(lastSalePrice)}</span>
            )}
          </div>
          <p className="text-sm font-bold text-amber-500">{formatEthCompact(highBid)}</p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        {isSeller ? (
          <Button asChild variant="outline" className="w-full text-xs font-semibold">
            <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${auction.tokenId}` }}>
              Manage Auction
            </Link>
          </Button>
        ) : (
          <BidDialog
            auctionId={BigInt(auction.id)}
            nftContract={collectionAddress as `0x${string}`}
            minBid={minBid}
            paymentToken={auction.paymentToken}
            tokenId={auction.tokenId}
            endsAt={endsAt}
            label="Place Bid"
          />
        )}
      </div>
    </div>
  );
}

function UnlistedCard({
  collectionAddress,
  tokenId,
  owner,
  topOffer,
  rarity,
  lastSalePrice,
  tokenStandard,
  index,
}: {
  collectionAddress: string;
  tokenId: string;
  owner?: string | null;
  topOffer?: OffersByCollectionResult["offers"][number];
  rarity?: TokenRarity;
  lastSalePrice?: bigint | null;
  tokenStandard: "ERC-721" | "ERC-1155";
  index: number;
}) {
  const { imageUri, name } = useTokenMetadata(collectionAddress as `0x${string}`, tokenId);
  const { address } = useWallet();
  const isErc1155 = tokenStandard === "ERC-1155";

  const { data: onchainOwner } = useReadContract({
    address: !isErc1155 && isAddress(collectionAddress) ? (collectionAddress as `0x${string}`) : undefined,
    abi: erc721Abi,
    functionName: "ownerOf",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled: !isErc1155 && isAddress(collectionAddress) && !!tokenId && !owner },
  });

  const { data: user1155Balance } = useReadContract({
    address: isErc1155 && isAddress(collectionAddress) ? (collectionAddress as `0x${string}`) : undefined,
    abi: erc1155Abi,
    functionName: "balanceOf",
    args: address && tokenId ? [address as `0x${string}`, BigInt(tokenId)] : undefined,
    query: { enabled: isErc1155 && isAddress(collectionAddress) && !!address && !!tokenId },
  });

  const effectiveOwner = (onchainOwner as string | undefined) ?? owner;
  const isOwner = Boolean(
    address && (
      (effectiveOwner && effectiveOwner.toLowerCase() === address.toLowerCase()) ||
      (user1155Balance !== undefined && user1155Balance > 0n)
    )
  );

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:border-border/80 hover:shadow-lg"
      style={{ animationDelay: `${(index % 24) * 0.03}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg uri={imageUri} alt={name} className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <div className="size-full bg-muted" />
          )}

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground backdrop-blur">
              Not listed
            </span>
            <RarityPill rarity={rarity} />
          </div>

          <div className="pointer-events-none absolute inset-x-2 bottom-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
            <div onClick={(e) => e.preventDefault()}>
              {isOwner ? (
                <SellDialog
                  nftContract={collectionAddress as `0x${string}`}
                  tokenId={tokenId}
                  tokenStandard={tokenStandard}
                  label="List for Sale"
                  variant="default"
                  className="w-full font-semibold shadow-md"
                />
              ) : (
                <OfferDialog
                  nftContract={collectionAddress as `0x${string}`}
                  tokenId={tokenId}
                  tokenStandard={tokenStandard}
                  label="Make Offer"
                  variant="outline"
                  className="w-full bg-background/90 font-semibold backdrop-blur shadow-md"
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1 p-3">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-foreground">{name || `#${tokenId}`}</p>
            <span className="text-[10px] font-medium text-muted-foreground">#{tokenId}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {topOffer ? (
                <span>
                  Offer: <b className="text-foreground">{formatEthCompact(BigInt(topOffer.amount))}</b>
                </span>
              ) : lastSalePrice ? (
                <span>
                  Last: <b className="text-foreground">{formatEthCompact(lastSalePrice)}</b>
                </span>
              ) : (
                "Unlisted"
              )}
            </span>
            {owner && <span className="font-mono text-[10px] text-muted-foreground">{shortAddr(owner)}</span>}
          </div>
        </div>
      </Link>
    </div>
  );
}

function ListingTableRow({
  listing,
  collectionAddress,
  floorWei,
  rarity,
  lastSalePrice,
  inCart,
  onAddToCart,
  onRemoveFromCart,
}: {
  listing: ActiveListingsResult["listings"][number];
  collectionAddress: string;
  floorWei: bigint | null;
  rarity?: TokenRarity;
  lastSalePrice?: bigint | null;
  inCart: boolean;
  onAddToCart: () => void;
  onRemoveFromCart: () => void;
}) {
  const { imageUri, name } = useTokenMetadata(collectionAddress as `0x${string}`, listing.tokenId);
  const { address } = useWallet();
  const isEth = listing.paymentToken === ETH_ADDRESS;
  const price = isEth ? formatEthCompact(BigInt(listing.pricePerItem)) : listing.pricePerItem;
  const isSeller = Boolean(
    address && listing.seller && listing.seller.toLowerCase() === address.toLowerCase()
  );

  return (
    <tr className="transition hover:bg-muted/30">
      <td className="p-3">
        <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${listing.tokenId}` }} className="flex items-center gap-3">
          <div className="size-10 overflow-hidden rounded-lg bg-muted">
            {imageUri && <IpfsImg uri={imageUri} alt="" className="size-full object-cover" />}
          </div>
          <span className="font-semibold text-foreground">{name || `#${listing.tokenId}`}</span>
        </Link>
      </td>
      <td className="p-3">
        {rarity ? <RarityPill rarity={rarity} /> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-3">
        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
          Buy Now
        </span>
      </td>
      <td className="p-3 font-bold text-primary">{price}</td>
      <td className="p-3 text-muted-foreground">
        {lastSalePrice ? formatEthCompact(lastSalePrice) : "—"}
      </td>
      <td className="p-3 font-mono text-muted-foreground">{isSeller ? "You" : shortAddr(listing.seller)}</td>
      <td className="p-3 text-right">
        {isSeller ? (
          <Button asChild size="sm" variant="outline" className="h-7 text-xs font-semibold">
            <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${listing.tokenId}` }}>
              Manage
            </Link>
          </Button>
        ) : inCart ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRemoveFromCart}>
            Remove
          </Button>
        ) : (
          <Button size="sm" className="h-7 gap-1 text-xs font-semibold" onClick={onAddToCart}>
            <ShoppingCart className="size-3" /> Buy
          </Button>
        )}
      </td>
    </tr>
  );
}

function AuctionTableRow({
  auction,
  collectionAddress,
  rarity,
  lastSalePrice,
}: {
  auction: ActiveAuctionsResult["auctions"][number];
  collectionAddress: string;
  rarity?: TokenRarity;
  lastSalePrice?: bigint | null;
}) {
  const { imageUri, name } = useTokenMetadata(collectionAddress as `0x${string}`, auction.tokenId);
  const { address } = useWallet();
  const reserve = BigInt(auction.reservePrice || "0");
  const bid = BigInt(auction.highestBid || "0");
  const highBid = bid > 0n ? bid : reserve;
  const isSeller = Boolean(
    address && auction.seller && auction.seller.toLowerCase() === address.toLowerCase()
  );

  return (
    <tr className="transition hover:bg-muted/30">
      <td className="p-3">
        <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${auction.tokenId}` }} className="flex items-center gap-3">
          <div className="size-10 overflow-hidden rounded-lg bg-muted">
            {imageUri && <IpfsImg uri={imageUri} alt="" className="size-full object-cover" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{name || `#${auction.tokenId}`}</span>
          </div>
        </Link>
      </td>
      <td className="p-3">
        {rarity ? <RarityPill rarity={rarity} /> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-3">
        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
          Auction
        </span>
      </td>
      <td className="p-3 font-bold text-amber-500">{formatEthCompact(highBid)}</td>
      <td className="p-3 text-muted-foreground">
        {lastSalePrice ? formatEthCompact(lastSalePrice) : "—"}
      </td>
      <td className="p-3 font-mono text-muted-foreground">{isSeller ? "You" : shortAddr(auction.seller)}</td>
      <td className="p-3 text-right">
        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
          <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${auction.tokenId}` }}>
            {isSeller ? "Manage" : "Bid"}
          </Link>
        </Button>
      </td>
    </tr>
  );
}

function UnlistedTableRow({
  collectionAddress,
  tokenId,
  owner,
  topOffer,
  rarity,
  lastSalePrice,
  tokenStandard,
}: {
  collectionAddress: string;
  tokenId: string;
  owner?: string | null;
  topOffer?: OffersByCollectionResult["offers"][number];
  rarity?: TokenRarity;
  lastSalePrice?: bigint | null;
  tokenStandard: "ERC-721" | "ERC-1155";
}) {
  const { imageUri, name } = useTokenMetadata(collectionAddress as `0x${string}`, tokenId);
  const { address } = useWallet();
  const isErc1155 = tokenStandard === "ERC-1155";

  const { data: onchainOwner } = useReadContract({
    address: !isErc1155 && isAddress(collectionAddress) ? (collectionAddress as `0x${string}`) : undefined,
    abi: erc721Abi,
    functionName: "ownerOf",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled: !isErc1155 && isAddress(collectionAddress) && !!tokenId && !owner },
  });

  const { data: user1155Balance } = useReadContract({
    address: isErc1155 && isAddress(collectionAddress) ? (collectionAddress as `0x${string}`) : undefined,
    abi: erc1155Abi,
    functionName: "balanceOf",
    args: address && tokenId ? [address as `0x${string}`, BigInt(tokenId)] : undefined,
    query: { enabled: isErc1155 && isAddress(collectionAddress) && !!address && !!tokenId },
  });

  const effectiveOwner = (onchainOwner as string | undefined) ?? owner;
  const isOwner = Boolean(
    address && (
      (effectiveOwner && effectiveOwner.toLowerCase() === address.toLowerCase()) ||
      (user1155Balance !== undefined && user1155Balance > 0n)
    )
  );

  return (
    <tr className="transition hover:bg-muted/30">
      <td className="p-3">
        <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${tokenId}` }} className="flex items-center gap-3">
          <div className="size-10 overflow-hidden rounded-lg bg-muted">
            {imageUri && <IpfsImg uri={imageUri} alt="" className="size-full object-cover" />}
          </div>
          <span className="font-semibold text-foreground">{name || `#${tokenId}`}</span>
        </Link>
      </td>
      <td className="p-3">
        {rarity ? <RarityPill rarity={rarity} /> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="p-3">
        <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Not Listed
        </span>
      </td>
      <td className="p-3 text-muted-foreground">
        {topOffer ? (
          <span className="font-semibold text-foreground">
            Top Offer: {formatEthCompact(BigInt(topOffer.amount))}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 text-muted-foreground">
        {lastSalePrice ? formatEthCompact(lastSalePrice) : "—"}
      </td>
      <td className="p-3 font-mono text-muted-foreground">{owner ? shortAddr(owner) : "—"}</td>
      <td className="p-3 text-right">
        {isOwner ? (
          <SellDialog
            nftContract={collectionAddress as `0x${string}`}
            tokenId={tokenId}
            tokenStandard={tokenStandard}
            label="List"
            variant="default"
            className="h-7 text-xs font-semibold"
          />
        ) : (
          <OfferDialog
            nftContract={collectionAddress as `0x${string}`}
            tokenId={tokenId}
            tokenStandard={tokenStandard}
            label="Offer"
            variant="outline"
            className="h-7 text-xs font-semibold"
          />
        )}
      </td>
    </tr>
  );
}
