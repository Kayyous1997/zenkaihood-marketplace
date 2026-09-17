import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Grid2X2, List, RefreshCw, Share2, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FilterPanel, InkHero, NftCard, SelectBox, Shell, Stat, Verified } from "@/components/zenkai";
import { gqlClient } from "@/indexer/client";
import {
  GET_COLLECTION,
  GET_LISTINGS_BY_COLLECTION,
  type CollectionResult,
  type ActiveListingsResult,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS, SLOW_REFETCH_MS } from "@/indexer/events";
import { resolveImageUri, fetchMetadata } from "@/lib/metadata";
import { formatEthCompact, formatBps } from "@/lib/token-format";
import { createFileRoute as cfr } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

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
  // slug is the collection contract address (lowercase)
  const collectionAddress = slug.toLowerCase();

  const [tab, setTab] = useState("Items");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colName, setColName] = useState<string | null>(null);

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

  const col = colData?.collection;
  const listings = listingsData?.listings ?? [];

  // Resolve collection name from metadataURI
  useEffect(() => {
    if (col?.metadataURI) {
      fetchMetadata(col.metadataURI).then((meta) => {
        if (meta?.name) setColName(meta.name);
      });
    }
  }, [col?.metadataURI]);

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
                {col.tokenStandard === "ERC721" ? "ERC-721" : "ERC-1155"} · Royalty {royaltyDisplay}
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
              <Button variant="outline"><Share2 />Share</Button>
              <Button asChild variant="outline">
                <a href={`https://sepolia.basescan.org/address/${collectionAddress}`} target="_blank" rel="noreferrer">
                  View on Explorer <ExternalLink />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </InkHero>

      <main className="page-section pt-0">
        <div className="mb-3 flex gap-8 border-b border-border">
          {["Items", "Activity", "About"].map((name) => (
            <Button key={name} variant="ghost" onClick={() => setTab(name)} className={tab === name ? "tab-active" : "tab"}>{name}</Button>
          ))}
        </div>

        {tab !== "Items" ? (
          <div className="grid min-h-80 place-content-center text-center">
            <p className="font-display text-2xl">{tab}</p>
            <p className="mt-2 text-sm text-muted-foreground">Collection {tab.toLowerCase()} coming soon.</p>
          </div>
        ) : (
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
                    <Link
                      key={listing.id}
                      to="/nfts/$id"
                      params={{ id: `${collectionAddress}-${listing.tokenId}` }}
                      className="card-hover animate-fade-in-up overflow-hidden rounded-md border border-border bg-surface/90"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="aspect-square bg-muted" />
                      <div className="p-2">
                        <p className="truncate font-display text-xs font-semibold">Token #{listing.tokenId}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-primary">
                          {listing.paymentToken === ETH_ADDRESS
                            ? formatEthCompact(BigInt(listing.pricePerItem))
                            : `${listing.pricePerItem}`}
                        </p>
                        {listing.verified && <span className="text-[10px] text-primary">✓ Verified</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </Shell>
  );
}
