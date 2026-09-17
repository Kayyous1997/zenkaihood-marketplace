import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Grid2X2, List, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHead, SelectBox, Shell } from "@/components/zenkai";
import { gqlClient } from "@/indexer/client";
import { GET_COLLECTIONS, type CollectionsResult } from "@/indexer/queries";
import { SLOW_REFETCH_MS } from "@/indexer/events";
import { resolveImageUri } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [
    { title: "Explore Collections — Zenkaihood" },
    { name: "description", content: "Browse every Japanese-inspired collection and digital work listed on the Zenkaihood marketplace." },
    { property: "og:title", content: "Explore Collections — Zenkaihood" },
    { property: "og:description", content: "Discover collections and digital works from across the marketplace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ExploreBrowsePage,
});

const CHIPS = ["All", "Trending", "New", "Top Collections", "Art", "Anime", "Gaming", "Collectibles"];
const PAGE_SIZE = 12;

function ExploreBrowsePage() {
  const [chip, setChip] = useState("All");
  const [chain, setChain] = useState("All Chains");
  const [status, setStatus] = useState("All");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["explore-collections", page, onlyVerified],
    queryFn: () =>
      gqlClient.request<CollectionsResult>(GET_COLLECTIONS, {
        first: PAGE_SIZE,
        skip: page * PAGE_SIZE,
        onlyVerified: onlyVerified ? true : null,
      }),
    refetchInterval: SLOW_REFETCH_MS,
    staleTime: SLOW_REFETCH_MS,
  });

  const collections = data?.collections ?? [];

  return (
    <Shell>
      <PageHead eyebrow="Explore" title="Explore" description="Discover collections and digital works from across the marketplace." />
      <div className="page-section grid gap-5 xl:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-muted-foreground">
            <Search className="size-4" />
            <input className="w-full bg-transparent text-xs outline-none" placeholder="Search collections, creators, or keywords..." aria-label="Search collections" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {CHIPS.map((item) => (
              <Button key={item} size="sm" onClick={() => setChip(item)} variant={chip === item ? "default" : "ghost"} className="h-8 rounded-full px-4 text-xs">{item}</Button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <div className="w-40">
                <SelectBox placeholder="Sort by: Popular" items={["Sort by: Popular", "Recently Added", "Top Volume"]} />
              </div>
              <Button variant="outline" size="icon" aria-label="Grid view"><Grid2X2 /></Button>
              <Button variant="outline" size="icon" aria-label="List view"><List /></Button>
            </div>
          </div>

          {/* Collections grid */}
          {isLoading ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-md border border-border bg-surface/90">
                  <div className="aspect-[2] w-full bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-32 rounded bg-muted" />
                    <div className="h-2 w-20 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="mt-10 text-center">
              <p className="text-sm text-muted-foreground">No collections found.</p>
              <Button variant="ghost" className="mt-3 gap-2 text-xs" onClick={() => refetch()}><RefreshCw className="size-3" />Refresh</Button>
            </div>
          ) : (
            <>
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">All Collections</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {collections.map((col, index) => (
                    <Link
                      key={col.id}
                      to="/collections/$slug"
                      params={{ slug: col.id }}
                      className="card-hover animate-fade-in-up overflow-hidden rounded-md border border-border bg-surface/90"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {col.metadataURI ? (
                        <img
                          src={resolveImageUri(col.metadataURI) ?? ""}
                          alt={col.id}
                          className="aspect-[2] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="aspect-[2] w-full bg-muted" />
                      )}
                      <div className="flex items-center gap-3 p-3">
                        <div className="size-9 rounded-full border-2 border-surface bg-muted" />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-sm font-semibold">
                            {col.id.slice(0, 6)}…{col.id.slice(-4)}
                            {col.verified && <span className="ml-1 text-[10px] text-primary">✓</span>}
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            {col.creator.slice(0, 6)}…{col.creator.slice(-4)}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                      <div className="grid grid-cols-3 border-t border-border px-3 py-2 text-[11px]">
                        <span><b className="block">{col.activeListingCount}</b><small className="text-muted-foreground">Listings</small></span>
                        <span><b className="block">{col.auctionCount}</b><small className="text-muted-foreground">Auctions</small></span>
                        <span>
                          <b className="block">{col.royaltyBps != null ? `${(col.royaltyBps / 100).toFixed(1)}%` : "—"}</b>
                          <small className="text-muted-foreground">Royalty</small>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-center gap-1">
                <Button size="icon" variant="outline" className="size-8 text-xs" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>←</Button>
                <Button size="icon" variant="default" className="size-8 text-xs">{page + 1}</Button>
                <Button size="icon" variant="outline" className="size-8 text-xs" onClick={() => setPage(page + 1)} disabled={collections.length < PAGE_SIZE}>→</Button>
              </div>
            </>
          )}
        </div>

        {/* Filters sidebar */}
        <aside className="rounded-md border border-border bg-surface/90 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Filters</h2>
            <Button variant="link" size="sm" className="h-auto gap-1 p-0 text-[11px] text-muted-foreground" onClick={() => { setOnlyVerified(false); setChain("All Chains"); setStatus("All"); }}>
              <RefreshCw className="size-3" />Reset
            </Button>
          </div>
          <label className="field-label">Chain</label>
          {["All Chains", "Base Sepolia"].map((item) => (
            <button key={item} type="button" onClick={() => setChain(item)} className="flex w-full items-center gap-2 py-1.5 text-left text-xs">
              <span className={cn("grid size-4 place-content-center rounded-full border border-border", chain === item && "border-primary")}>
                {chain === item && <span className="size-2 rounded-full bg-primary" />}
              </span>{item}
            </button>
          ))}
          <label className="field-label">Status</label>
          {["All", "Active"].map((item) => (
            <button key={item} type="button" onClick={() => setStatus(item)} className="flex w-full items-center gap-2 py-1.5 text-left text-xs">
              <span className={cn("grid size-4 place-content-center rounded-full border border-border", status === item && "border-primary")}>
                {status === item && <span className="size-2 rounded-full bg-primary" />}
              </span>{item}
            </button>
          ))}
          <label className="field-label">Verified Collections</label>
          <label className="flex items-center justify-between text-xs text-muted-foreground">
            Only show verified
            <Checkbox checked={onlyVerified} onCheckedChange={(v) => setOnlyVerified(Boolean(v))} />
          </label>
        </aside>
      </div>
    </Shell>
  );
}
