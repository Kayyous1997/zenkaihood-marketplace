import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gem, ShieldCheck, Users } from "lucide-react";

import ronin from "@/assets/ronin.jpg";
import sakura from "@/assets/sakura.jpg";
import moon from "@/assets/moon.jpg";
import { Button } from "@/components/ui/button";
import { InkHero, SectionTitle, Shell } from "@/components/zenkai";
import { gqlClient } from "@/indexer/client";
import {
  GET_COLLECTIONS,
  GET_ACTIVE_LISTINGS,
  type CollectionsResult,
  type ActiveListingsResult,
} from "@/indexer/queries";
import { SLOW_REFETCH_MS, DEFAULT_REFETCH_MS } from "@/indexer/events";
import { resolveImageUri } from "@/lib/metadata";
import { formatEthCompact } from "@/lib/token-format";

export const Route = createFileRoute("/")(({
  head: () => ({ meta: [
    { title: "Zenkaihood — Discover, Collect & Trade Digital Art" },
    { name: "description", content: "Explore premium Japanese-inspired digital art and NFT collections on Zenkaihood." },
    { property: "og:title", content: "Zenkaihood Digital Art Marketplace" },
    { property: "og:description", content: "Discover, collect and trade remarkable digital art." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ExplorePage,
}) as ReturnType<typeof createFileRoute>);

/** Skeleton placeholder for loading states */
function CardSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function ExplorePage() {
  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ["home-collections"],
    queryFn: () => gqlClient.request<CollectionsResult>(GET_COLLECTIONS, { first: 5, skip: 0, onlyVerified: null }),
    refetchInterval: SLOW_REFETCH_MS,
    staleTime: SLOW_REFETCH_MS,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["home-listings"],
    queryFn: () => gqlClient.request<ActiveListingsResult>(GET_ACTIVE_LISTINGS, { first: 10, skip: 0 }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const collections = collectionsData?.collections ?? [];
  const listings = listingsData?.listings ?? [];

  return (
    <Shell>
      <main>
        <InkHero>
          <div className="relative mx-auto grid max-w-[1440px] items-center px-4 py-12 sm:px-8 lg:min-h-[390px] lg:grid-cols-[1fr_1.08fr] lg:px-14">
            <div className="relative z-10 max-w-xl">
              <p className="eyebrow"><span />The Zenkaihood Marketplace</p>
              <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.96] sm:text-6xl">
                Discover, Collect <em className="font-normal text-primary">&</em> Trade Digital Art
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                A premium NFT marketplace for creators, collectors, and dreamers. Own unique digital assets, support visionary artists, and be part of something bigger.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link to="/explore">Explore NFTs <ArrowRight /></Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/create">Register Collection</Link></Button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-2"><Gem className="size-4 text-gold" />Unique Collections</span>
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" />Secure Transactions</span>
                <span className="flex items-center gap-2"><Users className="size-4 text-gold" />Global Community</span>
              </div>
            </div>
            <div className="relative hidden h-[320px] lg:block">
              <div className="absolute left-[19%] top-8 h-[270px] w-[215px] rotate-[-7deg] rounded-md border-[7px] border-surface bg-surface p-1 shadow-art"><img src={sakura} alt="Sakura collection art" className="size-full rounded-sm object-cover" /></div>
              <div className="absolute left-[39%] top-0 z-10 h-[310px] w-[245px] rotate-[2deg] rounded-md border-[8px] border-surface bg-surface p-1 shadow-art"><img src={ronin} alt="The Ronin collection art" className="size-full rounded-sm object-cover" /></div>
              <div className="absolute right-[3%] top-16 h-[245px] w-[190px] rotate-[10deg] rounded-md border-[7px] border-surface bg-surface p-1 shadow-art"><img src={moon} alt="Void Samurai collection art" className="size-full rounded-sm object-cover" /></div>
            </div>
          </div>
        </InkHero>

        {/* Featured Collections */}
        <section className="page-section">
          <SectionTitle action={<Link to="/explore" className="section-link">View all collections <ArrowRight /></Link>}>
            Featured Collections
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {collectionsLoading
              ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} className="h-40" />)
              : collections.length === 0
              ? <p className="col-span-5 text-center text-sm text-muted-foreground py-8">No collections registered yet.</p>
              : collections.map((col) => (
                  <Link
                    key={col.id}
                    to="/collections/$slug"
                    params={{ slug: col.id }}
                    className="card-hover overflow-hidden rounded-md border border-border bg-surface/90"
                  >
                    {col.metadataURI ? (
                      <img
                        src={resolveImageUri(col.metadataURI) ?? ""}
                        alt={col.id}
                        className="aspect-[2] w-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="aspect-[2] w-full bg-muted" />
                    )}
                    <div className="p-3">
                      <p className="truncate font-display text-sm font-semibold">
                        {col.id.slice(0, 6)}…{col.id.slice(-4)}
                        {col.verified && <span className="ml-1 text-[10px] text-primary">✓</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{col.activeListingCount} active listings</p>
                    </div>
                  </Link>
                ))}
          </div>
        </section>

        {/* Trending NFTs + Recently Listed */}
        <section className="page-section grid gap-10 xl:grid-cols-[1.75fr_1fr]">
          <div>
            <SectionTitle action={<Link to="/explore" className="section-link">View all <ArrowRight /></Link>}>Trending NFTs</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {listingsLoading
                ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} className="aspect-square" />)
                : listings.slice(0, 5).map((listing, index) => (
                    <Link
                      key={listing.id}
                      to="/nfts/$id"
                      params={{ id: `${listing.collection.id}-${listing.tokenId}` }}
                      className="card-hover animate-fade-in-up overflow-hidden rounded-md border border-border bg-surface/90"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="aspect-square bg-muted" />
                      <div className="p-2">
                        <p className="truncate font-display text-xs font-semibold">Token #{listing.tokenId}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-primary">
                          {listing.paymentToken === "0x0000000000000000000000000000000000000000"
                            ? formatEthCompact(BigInt(listing.pricePerItem))
                            : `${listing.pricePerItem} tokens`}
                        </p>
                      </div>
                    </Link>
                  ))}
            </div>
          </div>

          <div>
            <SectionTitle>Recently Listed</SectionTitle>
            <div className="rounded-md border border-border bg-surface/80">
              {listingsLoading
                ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3 border-b border-border p-2.5 last:border-0"><div className="size-10 animate-pulse rounded bg-muted" /><div className="flex-1 space-y-1"><div className="h-3 w-28 animate-pulse rounded bg-muted" /><div className="h-2 w-20 animate-pulse rounded bg-muted" /></div></div>)
                : listings.slice(0, 5).map((listing, index) => (
                    <Link
                      key={listing.id}
                      to="/nfts/$id"
                      params={{ id: `${listing.collection.id}-${listing.tokenId}` }}
                      className="flex animate-fade-in-up items-center gap-3 border-b border-border p-2.5 last:border-0 hover:bg-muted/30"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="size-10 rounded bg-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-semibold">Token #{listing.tokenId}</p>
                        <p className="text-[10px] text-muted-foreground">{listing.collection.id.slice(0, 10)}…</p>
                      </div>
                      <div className="text-right text-xs">
                        <b>{listing.paymentToken === "0x0000000000000000000000000000000000000000"
                          ? formatEthCompact(BigInt(listing.pricePerItem))
                          : `${listing.pricePerItem} tkns`}</b>
                        <small className="block text-muted-foreground">
                          {new Date(Number(listing.createdAtTimestamp) * 1000).toLocaleDateString()}
                        </small>
                      </div>
                      <ArrowRight className="size-3.5 text-gold" />
                    </Link>
                  ))}
              {!listingsLoading && listings.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No active listings yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}