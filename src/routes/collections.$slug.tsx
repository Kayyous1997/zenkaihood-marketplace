import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  MessageCircle,
  Search,
  Send,
  Share2,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Twitter,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BidDialog, SweepDialog, useSweepCart } from "@/components/dialogs";
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
  type ActiveAuctionsResult,
  type ActiveListingsResult,
  type CollectionResult,
  type GlobalActivityResult,
  type OffersByCollectionResult,
} from "@/indexer/queries";
import { useCollectionMeta } from "@/hooks/useCollectionMeta";
import { useCollectionSupply } from "@/hooks/useCollectionSupply";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { addressUrl } from "@/lib/basescan";
import { formatBps, formatEthCompact } from "@/lib/token-format";
import { getCategoryById } from "@/lib/categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/collections/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Collection ${params.slug.slice(0, 8)}… — Zenkaihood` },
      { name: "description", content: `Browse NFTs in collection ${params.slug} on Zenkaihood.` },
      { property: "og:title", content: `Collection — Zenkaihood` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollectionPage,
});

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
type Tab = "Items" | "Offers" | "Activity" | "About";
type StatusFilter = "All" | "Buy Now" | "On Auction";
type SortKey = "Recently Listed" | "Price: Low to High" | "Price: High to Low";

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
  const collectionAddress = slug.toLowerCase();

  const [tab, setTab] = useState<Tab>("Items");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortKey>("Recently Listed");
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<3 | 4 | 5>(4);
  const [watching, setWatching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  const { items: cartItems, addItem, removeItem, clearCart } = useSweepCart();
  const { data: supabaseMeta } = useCollectionMeta(collectionAddress);
  const { data: onChainSupply } = useCollectionSupply(collectionAddress);

  const { data: colData, isLoading: colLoading } = useQuery({
    queryKey: ["collection", collectionAddress],
    queryFn: () => gqlClient.request<CollectionResult>(GET_COLLECTION, { id: collectionAddress }),
    refetchInterval: SLOW_REFETCH_MS,
    staleTime: SLOW_REFETCH_MS,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["collection-listings", collectionAddress],
    queryFn: () =>
      gqlClient.request<ActiveListingsResult>(GET_LISTINGS_BY_COLLECTION, {
        collection: collectionAddress,
        first: 50,
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
        first: 40,
        skip: 0,
        now: unixNowSeconds(),
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const { data: salesData } = useQuery({
    queryKey: ["collection-sales", collectionAddress],
    queryFn: () =>
      gqlClient.request<{ sales: Array<{ price: string; paymentToken: string }> }>(GET_SALES_BY_COLLECTION, {
        collection: collectionAddress,
        first: 100,
      }),
    refetchInterval: SLOW_REFETCH_MS,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["collection-activity", collectionAddress],
    queryFn: () =>
      gqlClient.request<GlobalActivityResult>(GET_ACTIVITY_BY_COLLECTION, {
        collection: collectionAddress,
        first: 40,
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
    enabled: tab === "Activity",
  });

  const col = colData?.collection;
  const listings = listingsData?.listings ?? [];
  const auctions = (auctionsData?.auctions ?? []).filter((a) => a.active);
  const offers = offersData?.offers ?? [];
  const sales = salesData?.sales ?? [];

  const ethListings = listings.filter((l) => l.paymentToken === ETH_ADDRESS);
  const floorWei = ethListings.length
    ? ethListings.reduce((min, l) => {
        const price = BigInt(l.pricePerItem);
        return price < min ? price : min;
      }, BigInt(ethListings[0]!.pricePerItem))
    : null;

  const topOfferWei = (() => {
    const ethOffers = offers.filter((o) => o.paymentToken === ETH_ADDRESS);
    if (!ethOffers.length) return null;
    return ethOffers.reduce((max, o) => {
      const amount = BigInt(o.amount);
      return amount > max ? amount : max;
    }, 0n);
  })();

  const totalVolumeWei = sales
    .filter((s) => s.paymentToken === ETH_ADDRESS)
    .reduce((sum, s) => sum + BigInt(s.price), 0n);

  const sortedListings = useMemo(() => {
    const rows = [...listings];
    if (sort === "Price: Low to High") {
      rows.sort((a, b) => (BigInt(a.pricePerItem) < BigInt(b.pricePerItem) ? -1 : 1));
    } else if (sort === "Price: High to Low") {
      rows.sort((a, b) => (BigInt(a.pricePerItem) > BigInt(b.pricePerItem) ? -1 : 1));
    } else {
      rows.sort((a, b) => Number(b.createdAtTimestamp) - Number(a.createdAtTimestamp));
    }
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((l) => l.tokenId.toLowerCase().includes(q));
  }, [listings, sort, query]);

  const visibleAuctions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? auctions.filter((a) => a.tokenId.toLowerCase().includes(q)) : auctions;
  }, [auctions, query]);

  function handleAddToCart(listing: ActiveListingsResult["listings"][number]) {
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

  if (colLoading) {
    return (
      <Shell>
        <div className="h-[240px] animate-pulse bg-muted" />
        <div className="page-section space-y-4">
          <div className="h-16 w-16 -mt-10 rounded-full bg-muted" />
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
          <Button asChild variant="outline"><Link to="/explore" search={{ q: undefined }}>Browse collections</Link></Button>
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
  const listedCount = listings.length + auctions.length;
  const totalSupplyDisplay = onChainSupply != null ? Number(onChainSupply).toLocaleString() : null;
  const showListings = status !== "On Auction";
  const showAuctions = status !== "Buy Now";
  const itemCount = (showListings ? sortedListings.length : 0) + (showAuctions ? visibleAuctions.length : 0);

  const gridClass =
    density === 3
      ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
      : density === 5
        ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        : "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4";

  return (
    <Shell>
      <section className="relative">
        <div className="relative h-[200px] overflow-hidden sm:h-[260px] lg:h-[300px]">
          {bannerSrc ? (
            <img src={bannerSrc} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-gradient-to-br from-muted via-card to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10" />
        </div>

        <div className="page-section pt-0">
          <div className="relative z-10 -mt-12 flex flex-col gap-4 sm:-mt-14 lg:flex-row lg:items-end lg:gap-6">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={displayName}
                className="size-[88px] rounded-full border-4 border-background object-cover shadow-lg sm:size-[104px]"
              />
            ) : (
              <div className="grid size-[88px] place-content-center rounded-full border-4 border-background bg-muted text-2xl font-display sm:size-[104px]">
                {displayName.slice(0, 1)}
              </div>
            )}

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{displayName}</h1>
                {col.verified && <Verified />}
                <div className="ml-auto flex items-center gap-1">
                  <IconBtn
                    label={watching ? "Unwatch" : "Watch"}
                    onClick={() => setWatching(!watching)}
                  >
                    <Star className={cn("size-4", watching && "fill-gold text-gold")} />
                  </IconBtn>
                  {supabaseMeta?.website_url && (
                    <IconBtn href={supabaseMeta.website_url} label="Website"><Globe className="size-4" /></IconBtn>
                  )}
                  {supabaseMeta?.twitter_handle && (
                    <IconBtn href={`https://x.com/${supabaseMeta.twitter_handle.replace(/^@/, "")}`} label="X">
                      <Twitter className="size-4" />
                    </IconBtn>
                  )}
                  {supabaseMeta?.discord_url && (
                    <IconBtn
                      href={supabaseMeta.discord_url.startsWith("http") ? supabaseMeta.discord_url : `https://${supabaseMeta.discord_url}`}
                      label="Discord"
                    >
                      <MessageCircle className="size-4" />
                    </IconBtn>
                  )}
                  {supabaseMeta?.telegram_url && (
                    <IconBtn
                      href={supabaseMeta.telegram_url.startsWith("http") ? supabaseMeta.telegram_url : `https://${supabaseMeta.telegram_url}`}
                      label="Telegram"
                    >
                      <Send className="size-4" />
                    </IconBtn>
                  )}
                  <IconBtn label="Copy link" onClick={copyLink}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </IconBtn>
                  <IconBtn label="Share" onClick={copyLink}><Share2 className="size-4" /></IconBtn>
                  <IconBtn href={addressUrl(collectionAddress)} label="Explorer">
                    <ExternalLink className="size-4" />
                  </IconBtn>
                </div>
              </div>

              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>
                  By <span className="text-foreground">{shortAddr(col.creator)}</span>
                </span>
                {totalSupplyDisplay && (
                  <>
                    <span className="text-border">·</span>
                    <span>{totalSupplyDisplay} items</span>
                  </>
                )}
                <span className="text-border">·</span>
                <span>{listedCount.toLocaleString()} listed</span>
                <span className="text-border">·</span>
                <span>{formatCreated(col.registeredAt)}</span>
                <span className="text-border">·</span>
                <span>{royaltyDisplay} creator fee</span>
              </p>

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
            <div className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              <p className={descOpen ? "" : "line-clamp-2"}>{colDescription}</p>
              {colDescription.length > 140 && (
                <button type="button" className="mt-1 text-xs font-semibold text-foreground" onClick={() => setDescOpen(!descOpen)}>
                  {descOpen ? "Show less" : "See more"} <ChevronDown className={cn("inline size-3 transition", descOpen && "rotate-180")} />
                </button>
              )}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-4 sm:grid-cols-3 lg:grid-cols-7">
            <Metric label="Total supply" value={totalSupplyDisplay ?? "—"} />
            <Metric label="Floor price" value={floorWei ? formatEthCompact(floorWei) : "—"} />
            <Metric label="Top offer" value={topOfferWei ? formatEthCompact(topOfferWei) : "—"} />
            <Metric label="Total volume" value={totalVolumeWei > 0n ? formatEthCompact(totalVolumeWei) : "—"} />
            <Metric
              label="Listed"
              value={String(col.activeListingCount)}
              sub={
                onChainSupply && onChainSupply > 0n
                  ? `(${Math.min(100, Math.round((Number(col.activeListingCount) / Number(onChainSupply)) * 100))}%)`
                  : listedCount
                    ? `(${Math.min(100, Math.round((col.activeListingCount / Math.max(listedCount, 1)) * 100))}%)`
                    : undefined
              }
            />
            <Metric label="Active auctions" value={String(col.activeAuctionCount)} />
            <Metric label="Active offers" value={String(col.activeOfferCount)} />
          </div>

          <div className="mt-1 flex gap-5 overflow-x-auto border-b border-border">
            {(["Items", "Offers", "Activity", "About"] as const).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={tab === name ? "tab-active" : "tab"}
              >
                {name}
                {name === "Offers" && col.activeOfferCount > 0 && (
                  <small className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{col.activeOfferCount}</small>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="page-section pt-4 pb-28">
        {tab === "Items" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setFiltersOpen(!filtersOpen)} aria-label="Filters">
                <SlidersHorizontal />
              </Button>
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by item"
                  className="h-9 bg-surface pl-9 text-xs"
                />
              </div>
              <div className="w-44">
                <SelectBox
                  placeholder={sort}
                  items={["Recently Listed", "Price: Low to High", "Price: High to Low"]}
                  onSelect={(value) => setSort(value as SortKey)}
                />
              </div>
              <div className="flex overflow-hidden rounded-md border border-border">
                {([3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDensity(n)}
                    className={cn("grid size-9 place-content-center", density === n ? "bg-muted text-foreground" : "text-muted-foreground")}
                    aria-label={`${n} columns`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <SweepDialog items={cartItems} onClear={clearCart} onRemove={removeItem} />
            </div>

            <div className={cn("grid gap-5", filtersOpen ? "lg:grid-cols-[220px_1fr]" : "")}>
              {filtersOpen && (
                <aside className="h-fit rounded-xl border border-border bg-surface/90 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Filters</h2>
                    <button type="button" className="text-xs text-muted-foreground" onClick={() => setStatus("All")}>
                      Clear
                    </button>
                  </div>
                  <p className="mb-2 text-xs font-semibold">Status</p>
                  {(["All", "Buy Now", "On Auction"] as const).map((label) => (
                    <label key={label} className="flex items-center gap-2 py-1.5 text-xs">
                      <Checkbox checked={status === label} onCheckedChange={() => setStatus(label)} />
                      {label}
                    </label>
                  ))}
                </aside>
              )}

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {itemCount.toLocaleString()} items
                </p>
                {listingsLoading ? (
                  <div className={gridClass}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                ) : itemCount === 0 ? (
                  <div className="flex min-h-60 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
                    <p className="text-sm text-muted-foreground">No items match these filters.</p>
                  </div>
                ) : (
                  <div className={gridClass}>
                    {showListings &&
                      sortedListings.map((listing, index) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          collectionAddress={collectionAddress}
                          index={index}
                          inCart={cartItems.some((c) => c.listingId === BigInt(listing.id))}
                          onAddToCart={() => handleAddToCart(listing)}
                          onRemoveFromCart={() => removeItem(BigInt(listing.id))}
                        />
                      ))}
                    {showAuctions &&
                      visibleAuctions.map((auction, index) => (
                        <AuctionCard
                          key={auction.id}
                          auction={auction}
                          collectionAddress={collectionAddress}
                          index={index}
                        />
                      ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "Offers" && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1fr_120px_140px_100px] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Item</span><span>Price</span><span>From</span><span>Expires</span>
            </div>
            {offers.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No active offers on this collection.</p>
            ) : (
              offers.map((offer) => (
                <Link
                  key={offer.id}
                  to="/nfts/$id"
                  params={{ id: `${collectionAddress}-${offer.tokenId}` }}
                  className="grid grid-cols-[1fr_120px_140px_100px] gap-3 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-muted/30"
                >
                  <span className="font-medium">#{offer.tokenId}</span>
                  <span className="font-semibold">
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

        {tab === "Activity" && (
          <div className="overflow-hidden rounded-xl border border-border">
            {activityLoading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
            ) : (activityData?.activities ?? []).length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No activity for this collection yet.</p>
            ) : (
              activityData!.activities.map((row) => {
                const price = row.listing?.pricePerItem ?? row.offer?.amount ?? row.auction?.highestBid ?? null;
                const payToken = row.listing?.paymentToken ?? row.offer?.paymentToken ?? row.auction?.paymentToken ?? null;
                return (
                  <div key={row.id} className="grid items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[160px_1fr_140px_auto]">
                    <b className="text-xs">{activityLabel(row.type)}</b>
                    <span className="text-sm text-muted-foreground">
                      {row.tokenId ? `#${row.tokenId}` : activityKind(row.type)} · {shortAddr(row.account)}
                    </span>
                    <span className="text-sm font-semibold">
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

        {tab === "About" && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-border bg-surface/90 p-5">
              <h2 className="font-display text-lg font-semibold">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {colDescription || "No description has been added for this collection."}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface/90 p-5 text-sm">
              <h2 className="font-display text-lg font-semibold">Details</h2>
              <dl className="mt-4 space-y-3">
                <DetailRow label="Contract" value={shortAddr(collectionAddress)} href={addressUrl(collectionAddress)} />
                <DetailRow label="Chain" value="Base Sepolia" />
                <DetailRow label="Token standard" value={tokenStandard} />
                <DetailRow label="Total supply" value={totalSupplyDisplay ?? "—"} />
                <DetailRow label="Creator earnings" value={royaltyDisplay} />
                <DetailRow label="Created" value={formatCreated(col.registeredAt)} />
              </dl>
            </div>
          </div>
        )}
      </main>

      {tab === "Items" && floorWei && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-end gap-3 lg:px-14">
            <span className="mr-auto text-xs text-muted-foreground">
              Floor <b className="text-foreground">{formatEthCompact(floorWei)}</b>
            </span>
            <SweepDialog items={cartItems} onClear={clearCart} onRemove={removeItem} />
            {ethListings[0] && cartItems.length === 0 && (
              <Button
                className="press"
                onClick={() => {
                  const cheapest = [...ethListings].sort((a, b) => (BigInt(a.pricePerItem) < BigInt(b.pricePerItem) ? -1 : 1))[0];
                  if (cheapest) handleAddToCart(cheapest);
                }}
              >
                Buy Floor
              </Button>
            )}
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
  const className = "grid size-8 place-content-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground";
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

function Metric({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-none">
        {value}
        {sub && <small className="ml-1 text-[11px] font-medium text-muted-foreground">{sub}</small>}
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
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
            {value} <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="font-medium">{value}</span>
        )}
      </dd>
    </div>
  );
}

function ListingCard({
  listing,
  collectionAddress,
  index,
  inCart,
  onAddToCart,
  onRemoveFromCart,
}: {
  listing: ActiveListingsResult["listings"][number];
  collectionAddress: string;
  index: number;
  inCart: boolean;
  onAddToCart: () => void;
  onRemoveFromCart: () => void;
}) {
  const { imageUri, name } = useTokenMetadata(collectionAddress as `0x${string}`, listing.tokenId);
  const price =
    listing.paymentToken === ETH_ADDRESS ? formatEthCompact(BigInt(listing.pricePerItem)) : listing.pricePerItem;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${listing.tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg uri={imageUri} alt={name} className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <div className="size-full bg-muted" />
          )}
          {(listing as any).verified && (
            <span className="absolute left-2 top-2 grid size-5 place-content-center rounded-full bg-background/90 shadow-sm">
              <Verified className="size-3.5" />
            </span>
          )}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
            {inCart ? (
              <Button size="sm" variant="outline" className="w-full" onClick={(e) => { e.preventDefault(); onRemoveFromCart(); }}>
                Remove
              </Button>
            ) : (
              <Button size="sm" className="w-full" onClick={(e) => { e.preventDefault(); onAddToCart(); }}>
                <ShoppingCart className="size-3.5" /> Buy now
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate text-sm font-semibold">{name || `#${listing.tokenId}`}</p>
          <p className="text-sm font-semibold">{price}</p>
        </div>
      </Link>
    </div>
  );
}

function AuctionCard({
  auction,
  collectionAddress,
  index,
}: {
  auction: ActiveAuctionsResult["auctions"][number];
  collectionAddress: string;
  index: number;
}) {
  const { imageUri, name } = useTokenMetadata(collectionAddress as `0x${string}`, auction.tokenId);
  const endsAt = BigInt(auction.endTime);
  const endsInMin = Math.max(0, Math.floor((Number(endsAt) * 1000 - Date.now()) / 60000));
  const reserve = BigInt(auction.reservePrice || "0");
  const bid = BigInt(auction.highestBid || "0");
  const highBid = bid > 0n ? bid : reserve;
  const minBid = ((highBid > 0n ? highBid : 10n ** 15n) * 105n) / 100n;

  return (
    <div
      className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${auction.tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg uri={imageUri} alt={name} className="size-full object-cover" />
          ) : (
            <div className="size-full bg-muted" />
          )}
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold">
            {endsInMin < 5 ? "Ending soon" : "Auction"}
          </span>
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate text-sm font-semibold">{name || `#${auction.tokenId}`}</p>
          <p className="text-xs text-muted-foreground">{bid > 0n ? "Current bid" : "Reserve"}</p>
          <p className="text-sm font-semibold">{formatEthCompact(highBid)}</p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <BidDialog
          auctionId={BigInt(auction.id)}
          nftContract={collectionAddress as `0x${string}`}
          minBid={minBid}
          paymentToken={auction.paymentToken}
          tokenId={auction.tokenId}
          endsAt={endsAt}
          label="Bid"
        />
      </div>
    </div>
  );
}
