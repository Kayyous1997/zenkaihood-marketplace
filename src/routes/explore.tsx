import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Grid2X2, List, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHead, SelectBox, Shell, Verified, collections } from "@/components/zenkai";
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

const grid = [...collections, ...collections, ...collections].slice(0, 12);
const chips = ["All", "Trending", "New", "Top Collections", "Art", "Anime", "Gaming", "Collectibles"];

function ExploreBrowsePage() {
  const [chip, setChip] = useState("All");
  const [chain, setChain] = useState("All Chains");
  const [status, setStatus] = useState("All");
  return (
    <Shell>
      <PageHead eyebrow="Explore" title="Explore" description="Discover collections and digital works from across the marketplace." />
      <div className="page-section grid gap-5 xl:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-muted-foreground">
            <Search className="size-4" /><input className="w-full bg-transparent text-xs outline-none" placeholder="Search collections, creators, or keywords..." aria-label="Search collections" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {chips.map((item) => (
              <Button key={item} size="sm" onClick={() => setChip(item)} variant={chip === item ? "default" : "ghost"} className="h-8 rounded-full px-4 text-xs">{item}</Button>
            ))}
            <div className="ml-auto flex items-center gap-2"><div className="w-40"><SelectBox placeholder="Sort by: Popular" items={["Sort by: Popular", "Recently Added", "Top Volume"]} /></div><Button variant="outline" size="icon"><Grid2X2 /></Button><Button variant="outline" size="icon"><List /></Button></div>
          </div>

          <CollectionGrid title="Featured Collections" items={grid.slice(0, 4)} offset={0} />
          <CollectionGrid title="All Collections" items={grid.slice(4, 12)} offset={4} />

          <div className="mt-6 flex items-center justify-center gap-1">
            {["1", "2", "3", "4", "5", "...", "10"].map((page) => <Button key={page} size="icon" variant={page === "1" ? "default" : "outline"} className="size-8 text-xs">{page}</Button>)}
          </div>
        </div>

        <aside className="rounded-md border border-border bg-surface/90 p-4">
          <div className="flex items-center justify-between"><h2 className="font-display text-base font-semibold">Filters</h2><Button variant="link" size="sm" className="h-auto gap-1 p-0 text-[11px] text-muted-foreground"><RefreshCw className="size-3" />Reset</Button></div>
          <label className="field-label">Price Range</label>
          <div className="flex items-center gap-2"><input className="control w-full" placeholder="Min" aria-label="Minimum price" /><span className="text-xs">→</span><input className="control w-full" placeholder="Max" aria-label="Maximum price" /></div>
          <div className="mt-2 flex flex-wrap gap-2">{["0.1 - 1", "1 - 5", "5 - 10", "10+"].map((range) => <Button key={range} variant="outline" size="sm" className="h-7 text-[11px]">{range}</Button>)}</div>
          <label className="field-label">Chain</label>
          {["All Chains", "Ethereum", "Base", "Arbitrum", "Polygon"].map((item) => (
            <button key={item} type="button" onClick={() => setChain(item)} className="flex w-full items-center gap-2 py-1.5 text-left text-xs">
              <span className={cn("grid size-4 place-content-center rounded-full border border-border", chain === item && "border-primary")}>{chain === item && <span className="size-2 rounded-full bg-primary" />}</span>{item}
            </button>
          ))}
          <label className="field-label">Status</label>
          {["All", "Live", "Upcoming", "Ended"].map((item) => (
            <button key={item} type="button" onClick={() => setStatus(item)} className="flex w-full items-center gap-2 py-1.5 text-left text-xs">
              <span className={cn("grid size-4 place-content-center rounded-full border border-border", status === item && "border-primary")}>{status === item && <span className="size-2 rounded-full bg-primary" />}</span>{item}
            </button>
          ))}
          <label className="field-label">Verified Collections</label>
          <label className="flex items-center justify-between text-xs text-muted-foreground">Only show verified<Checkbox /></label>
        </aside>
      </div>
    </Shell>
  );
}

function CollectionGrid({ title, items, offset = 0 }: { title: string; items: typeof grid; offset?: number }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{title}</h2><Link to="/collections/$slug" params={{ slug: "the-ronin" }} className="text-[11px] text-primary">View All</Link></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <Link key={`${item.name}-${index}`} to="/collections/$slug" params={{ slug: item.slug }} className="card-hover animate-fade-in-up overflow-hidden rounded-md border border-border bg-surface/90" style={{ animationDelay: `${(offset + index) * 0.05}s` }}>
            <img src={item.art} alt={`${item.name} collection`} width={1024} height={1024} loading="lazy" className="aspect-[2] w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
            <div className="flex items-center gap-3 p-3">
              <img src={item.art} alt="" className="size-9 rounded-full border-2 border-surface object-cover" />
              <div className="min-w-0 flex-1"><h3 className="truncate font-display text-sm font-semibold">{item.name} <Verified /></h3><p className="text-[11px] text-muted-foreground">By {item.creator}</p></div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-3 border-t border-border px-3 py-2 text-[11px]">
              <span><b className="block">{item.floor}</b><small className="text-muted-foreground">Floor Price</small></span>
              <span><b className="block">{item.volume}</b><small className="text-muted-foreground">Total Volume</small></span>
              <span><b className="block">{item.items}</b><small className="text-muted-foreground">Items</small></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
