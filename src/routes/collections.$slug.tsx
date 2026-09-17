import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Gavel, Grid2X2, List, RefreshCw, Share2, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FilterPanel, InkHero, SelectBox, Shell, Stat, Verified } from "@/components/zenkai";
import { BidDialog, SweepDialog, useSweepCart } from "@/components/dialogs";
import { gqlClient } from "@/indexer/client";
import {
  GET_COLLECTION,
  GET_LISTINGS_BY_COLLECTION,
  GET_AUCTIONS_BY_COLLECTION,
  type CollectionResult,
  type ActiveListingsResult,
  type ActiveAuctionsResult,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS, SLOW_REFETCH_MS } from "@/indexer/events";
import { resolveImageUri, fetchMetadata } from "@/lib/metadata";
import { formatEthCompact, formatBps } from "@/lib/token-format";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/hooks/useSweep";
import { MAX_SWEEP_ITEMS } from "@/hooks/useSweep";

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

function CollectionPage() {
  const { slug } = Route.useParams();
  const collectionAddress = slug.toLowerCase();

  const [tab, setTab] = useState<"Items" | "Auctions" | "Activity" | "About">("Items");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colName, setColName] = useState<string | null>(null);

  const { items: cartItems, addItem, removeItem, clearCart } = useSweepCart();

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
        onlyActive: true,
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Auctions for this collection
  const { data: auctionsData, isLoading: auctionsLoading } = useQuery({
    queryKey: ["collection-auctions", collectionAddress],
    queryFn: () =>
      gqlClient.request<ActiveAuctionsResult>(GET_AUCTIONS_BY_COLLECTION, {
        collection: collectionAddress,
        first: 50,
        skip: 0,
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
    enabled: tab === "Auctions",
  });

  const col = colData?.collection;
  const listings = listingsData?.listings ?? [];
  const auctions = (auctionsData?.auctions ?? []).filter((a) => a.active);

  useEffect(() => {
    if (col?.metadataURI) {
      fetchMetadata(col.metadataURI).then((meta) => {
        if (meta?.name) setColName(meta.name);
      });
    }
  }, [col?.metadataURI]);

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

  if (colLoading) {
    return (
      <Shell>
        <div className="page-section space-y-4">
          <div className="h-48 animate-pulse rounded-md bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />)}
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
          <p className="text-sm text-muted-foreground">No collection registered at address <code className="text-xs">{collectionAddress}</code></p>
          <Button asChild variant="outline"><Link to="/explore">Browse collections</Link></Button>
        </div>
      </Shell>
    );
  }

  const displayName = colName ?? `${collectionAddress.slice(0, 6)}…${collectionAddress.slice(-4)}`;
  const royaltyDisplay = col.royaltyBps != null ? formatBps(col.royaltyBps) : "—";
  const tokenStandard: "ERC-721" | "ERC-1155" = col.tokenStandard === "ERC1155" ? "ERC-1155" : "ERC-721";

  return (
    <Shell>
      <InkHero compact>
        <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            {col.metadataURI ? (
              <img
                src={resolveImageUri(col.metadataURI) ?? ""}
                alt={displayName}
                className="size-32 rounded-md border-[6px] border-surface object-cover shadow-art"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="size-32 rounded-md border-[6px] border-surface bg-muted shadow-art" />
            )}
            <div className="max-w-lg">
              <h1 className="font-display text-4xl font-semibold">
                {displayName} {col.verified && <Verified />}
              </h1>
              <p className="mt-1 text-sm">
                by <span className="font-mono text-xs">{col.creator.slice(0, 8)}…{col.creator.slice(-6)}</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tokenStandard} · Royalty {royaltyDisplay}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-between gap-4 border-t border-border pt-3 lg:flex-row lg:items-center">
            <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-5">
              <Stat label="Active Listings" value={String(col.activeListingCount)} />
              <Stat label="Total Listings" value={String(col.listingCount)} />
              <Stat label="Active Auctions" value={String(col.activeAuctionCount)} />
              <Stat label="Active Offers" value={String(col.activeOfferCount)} />
              <Stat label="Royalty" value={royaltyDisplay} />
            </div>
            <div className="flex gap-3">
              {/* Sweep cart button */}
              <SweepDialog items={cartItems} onClear={clearCart} onRemove={removeItem} />
              <Button variant="outline"><Share2 />Share</Button>
              <Button asChild variant="outline">
                <a href={`https://sepolia.basescan.org/address/${collectionAddress}`} target="_blank" rel="noreferrer">
                  Explorer <ExternalLink />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </InkHero>

      <main className="page-section pt-0">
        <div className="mb-3 flex gap-8 border-b border-border">
          {(["Items", "Auctions", "Activity", "About"] as const).map((name) => (
            <Button key={name} variant="ghost" onClick={() => setTab(name)} className={tab === name ? "tab-active" : "tab"}>
              {name}
              {name === "Auctions" && col.activeAuctionCount > 0 && (
                <small className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{col.activeAuctionCount}</small>
              )}
            </Button>
          ))}
        </div>

        {/* ─── Items tab ─── */}
        {tab === "Items" && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">{listings.length} active listing{listings.length !== 1 ? "s" : ""}</h2>
              <div className="flex gap-2">
                <Button className="lg:hidden" variant="outline" size="icon" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /></Button>
                <div className="w-44"><SelectBox placeholder="Recently Listed" items={["Recently Listed", "Price: Low to High", "Price: High to Low"]} /></div>
                <Button variant="outline" size="icon" aria-label="Grid view"><Grid2X2 /></Button>
                <Button variant="outline" size="icon" aria-label="List view"><List /></Button>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
              <div className={filtersOpen ? "block" : "hidden lg:block"}><FilterPanel /></div>
              {listingsLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />)}
                </div>
              ) : listings.length === 0 ? (
                <div className="flex min-h-60 flex-col items-center justify-center gap-3">
                  <p className="text-sm text-muted-foreground">No active listings in this collection yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  {listings.map((listing, index) => (
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
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── Auctions tab ─── */}
        {tab === "Auctions" && (
          <>
            <h2 className="mb-4 font-display text-lg font-semibold">{auctions.length} active auction{auctions.length !== 1 ? "s" : ""}</h2>
            {auctionsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />)}
              </div>
            ) : auctions.length === 0 ? (
              <div className="flex min-h-60 flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground">No active auctions in this collection.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {auctions.map((auction, index) => {
                  const endsAt = BigInt(auction.endTime);
                  const endsInMs = Number(endsAt) * 1000 - Date.now();
                  const endsInMin = Math.max(0, Math.floor(endsInMs / 60000));
                  const endsInHr = Math.floor(endsInMin / 60);
                  const timeLeft = endsInMin < 60 ? `${endsInMin}m` : endsInHr < 24 ? `${endsInHr}h ${endsInMin % 60}m` : `${Math.floor(endsInHr / 24)}d`;
                  const highBid = auction.highestBid ? BigInt(auction.highestBid) : BigInt(auction.reservePrice);
                  const minBid = (highBid * 105n) / 100n; // 5% increment

                  return (
                    <div key={auction.id} className="animate-fade-in-up overflow-hidden rounded-md border border-border bg-surface/90" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="aspect-square bg-muted" />
                      <div className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-sm font-semibold">Token #{auction.tokenId}</p>
                            <p className="text-[10px] text-muted-foreground">Ends in {timeLeft}</p>
                          </div>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px]", endsInMin < 5 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")}>
                            {endsInMin < 5 ? "⚡ Ending soon" : "Live"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Current bid</span>
                          <b className="font-display">{formatEthCompact(highBid)}</b>
                        </div>
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
                            <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${auction.tokenId}` }}>View</Link>
                          </Button>
                          <BidDialog
                            auctionId={BigInt(auction.id)}
                            minBid={minBid}
                            paymentToken={auction.paymentToken}
                            tokenId={auction.tokenId}
                            endsAt={endsAt}
                            label="Bid"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── Placeholder tabs ─── */}
        {(tab === "Activity" || tab === "About") && (
          <div className="grid min-h-80 place-content-center text-center">
            <p className="font-display text-2xl">{tab}</p>
            <p className="mt-2 text-sm text-muted-foreground">Collection {tab.toLowerCase()} coming soon.</p>
          </div>
        )}
      </main>
    </Shell>
  );
}

// ─── Listing card with Add-to-Cart ────────────────────────────────────────────

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
  const { imageUri } = useTokenMetadata(
    collectionAddress as `0x${string}`,
    listing.tokenId,
  );
  const resolvedImage = imageUri ? resolveImageUri(imageUri) : null;

  return (
    <div
      className="card-hover animate-fade-in-up group relative overflow-hidden rounded-md border border-border bg-surface/90"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${listing.tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {resolvedImage ? (
            <img
              src={resolvedImage}
              alt={`Token #${listing.tokenId}`}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="size-full bg-muted" />
          )}
          {inCart && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
              <ShoppingCart className="size-6 text-primary" />
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="truncate font-display text-xs font-semibold">Token #{listing.tokenId}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-primary">
            {listing.paymentToken === ETH_ADDRESS
              ? formatEthCompact(BigInt(listing.pricePerItem))
              : `${listing.pricePerItem}`}
          </p>
          {listing.verified && <span className="text-[10px] text-info">✓ Verified</span>}
        </div>
      </Link>
      {/* Cart toggle — slides up on hover */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full p-1.5 transition-transform duration-200 group-hover:translate-y-0">
        {inCart ? (
          <Button size="sm" variant="outline" className="w-full text-[10px]" onClick={(e) => { e.preventDefault(); onRemoveFromCart(); }}>
            Remove from Cart
          </Button>
        ) : (
          <Button size="sm" className="w-full text-[10px]" onClick={(e) => { e.preventDefault(); onAddToCart(); }}>
            <ShoppingCart className="size-3" /> Add to Cart
          </Button>
        )}
      </div>
    </div>
  );
}
