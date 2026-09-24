import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CollectionPreviewCard, CollectionPreviewRow, collectionDisplayName } from "@/components/collection-preview-card";
import { SelectBox, Shell } from "@/components/zenkai";
import { useCollectionsMeta } from "@/hooks/useCollectionsMeta";
import { gqlClient } from "@/indexer/client";
import { GET_COLLECTIONS, GET_VERIFIED_COLLECTIONS, type CollectionsResult } from "@/indexer/queries";
import { SLOW_REFETCH_MS } from "@/indexer/events";
import { cn } from "@/lib/utils";

import { COLLECTION_CATEGORIES, getCategoryById } from "@/lib/categories";

type SortKey = "Trending" | "Newest" | "Most listed";

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    category: typeof search["category"] === "string" ? search["category"] : undefined,
  }),
  head: () => ({ meta: [
    { title: "Explore Collections — Zenkaihood" },
    { name: "description", content: "Browse every collection and digital work listed on the Zenkaihood marketplace." },
    { property: "og:title", content: "Explore Collections — Zenkaihood" },
    { property: "og:description", content: "Discover collections and digital works from across the marketplace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ExploreBrowsePage,
});

const PAGE_SIZE = 12;
const CHIPS = ["All", "Trending", "New", "Top"] as const;

function ExploreBrowsePage() {
  const { q: qFromUrl, category: categoryFromUrl } = Route.useSearch();
  const [query, setQuery] = useState(qFromUrl ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryFromUrl);
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("All");
  const [sort, setSort] = useState<SortKey>("Trending");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["explore-collections", page, onlyVerified],
    queryFn: () =>
      gqlClient.request<CollectionsResult>(onlyVerified ? GET_VERIFIED_COLLECTIONS : GET_COLLECTIONS, {
        first: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      }),
    refetchInterval: SLOW_REFETCH_MS,
    staleTime: SLOW_REFETCH_MS,
  });

  const collections = data?.collections ?? [];
  const { data: metaMap } = useCollectionsMeta(collections.map((col) => col.id));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = collections.filter((col) => {
      if (q) {
        const name = collectionDisplayName(col, metaMap?.[col.id]).toLowerCase();
        const matchesQuery = name.includes(q) || col.id.toLowerCase().includes(q) || col.creator.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      if (selectedCategory && selectedCategory !== "all") {
        const colMeta = metaMap?.[col.id];
        const categories = colMeta?.categories ?? [];
        if (!categories.map(c => c.toLowerCase()).includes(selectedCategory.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
    const mode = chip === "All" ? sort : chip;
    if (mode === "Trending") {
      rows = [...rows].sort((a, b) => b.activeListingCount - a.activeListingCount);
    } else if (mode === "New" || mode === "Newest") {
      rows = [...rows].sort((a, b) => Number(b.registeredAt) - Number(a.registeredAt));
    } else if (mode === "Top" || mode === "Most listed") {
      rows = [...rows].sort((a, b) => b.listingCount - a.listingCount);
    }
    return rows;
  }, [collections, metaMap, query, selectedCategory, chip, sort]);

  return (
    <Shell>
      <section className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
        <div className="page-section pb-6 pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Explore</p>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Collections</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Discover collections on Zenkaihood — search, filter, and open any contract to buy, bid, or make an offer.
          </p>
        </div>
      </section>

      <div className="page-section pt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setFiltersOpen(!filtersOpen)} aria-label="Filters">
            <SlidersHorizontal />
          </Button>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by collection or creator"
              className="h-9 bg-surface pl-9 text-xs"
            />
          </div>
          {CHIPS.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={chip === item ? "default" : "ghost"}
              className="h-8 rounded-full px-4 text-xs"
              onClick={() => setChip(item)}
            >
              {item}
            </Button>
          ))}
          <div className="w-40">
            <SelectBox
              placeholder={sort}
              items={["Trending", "Newest", "Most listed"]}
              onSelect={(value) => setSort(value as SortKey)}
            />
          </div>
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              className={cn("grid size-9 place-content-center", view === "grid" ? "bg-muted" : "text-muted-foreground")}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              className={cn("grid size-9 place-content-center", view === "list" ? "bg-muted" : "text-muted-foreground")}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>

        <div className={cn("grid gap-5", filtersOpen ? "lg:grid-cols-[220px_1fr]" : "")}>
          {filtersOpen && (
            <aside className="h-fit rounded-xl border border-border bg-surface/90 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Filters</h2>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setOnlyVerified(false); setChip("All"); setQuery(""); setSelectedCategory(undefined); }}
                >
                  Clear
                </button>
              </div>
              <p className="mb-2 text-xs font-semibold">Chain</p>
              <p className="mb-4 text-xs text-muted-foreground">Base Sepolia</p>
              
              <div className="mb-4 border-t border-border pt-3">
                <label className="flex items-center justify-between text-xs">
                  Verified only
                  <Checkbox checked={onlyVerified} onCheckedChange={(v) => { setOnlyVerified(Boolean(v)); setPage(0); }} />
                </label>
              </div>

              <div className="border-t border-border pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold">Category</p>
                  {selectedCategory && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(undefined)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      All
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {COLLECTION_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory?.toLowerCase() === cat.id.toLowerCase();
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(isSelected ? undefined : cat.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="size-3.5" />
                          <span>{cat.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}

          <div>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[1.3] animate-pulse rounded-xl bg-muted" />)}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex min-h-60 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
                <p className="text-sm text-muted-foreground">No collections match these filters.</p>
                <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="size-3" /> Refresh</Button>
              </div>
            ) : view === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((col, index) => (
                  <CollectionPreviewCard key={col.id} col={col} meta={metaMap?.[col.id]} index={index} />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="hidden grid-cols-[1fr_80px_80px_80px] gap-3 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                  <span>Collection</span><span className="text-right">Listed</span><span className="text-right">Auctions</span><span className="text-right">Offers</span>
                </div>
                {visible.map((col) => (
                  <CollectionPreviewRow key={col.id} col={col} meta={metaMap?.[col.id]} />
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-1">
              <Button size="icon" variant="outline" className="size-8 text-xs" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>←</Button>
              <Button size="icon" variant="default" className="size-8 text-xs">{page + 1}</Button>
              <Button size="icon" variant="outline" className="size-8 text-xs" onClick={() => setPage(page + 1)} disabled={collections.length < PAGE_SIZE}>→</Button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
