import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, ChevronRight, ClipboardList, Copy, Gavel, RefreshCw, ShoppingCart, Tag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountShell, InfoCard, PageHead, SelectBox, Tabs, Verified, userActivity } from "@/components/zenkai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-activity")({
  head: () => ({ meta: [
    { title: "Recent Activity — Zenkaihood" },
    { name: "description", content: "Track your Zenkaihood trades, listings, bids and transfers in one place." },
    { property: "og:title", content: "Recent Activity — Zenkaihood" },
    { property: "og:description", content: "Your purchases, sales, listings, bids and transfers." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: MyActivityPage,
});

const icons = { Purchase: ShoppingCart, Sale: Tag, Listing: ClipboardList, Bid: Gavel, Transfer: ArrowRightLeft } as const;
const tints: Record<string, string> = { Purchase: "bg-success/15 text-success", Sale: "bg-primary/15 text-primary", Listing: "bg-violet/15 text-violet", Bid: "bg-gold/15 text-gold", Transfer: "bg-info/15 text-info" };

function MyActivityPage() {
  const [tab, setTab] = useState("All");
  const rows = tab === "All" ? userActivity : userActivity.filter((row) => `${row.type}s` === tab);
  return (
    <AccountShell>
      <PageHead eyebrow="Your Activity" title="Recent Activity" description="Track your trades, listings, bids, and more — all in one place." />
      <div className="page-section grid gap-5 xl:grid-cols-[1fr_280px]">
        <section className="min-w-0 rounded-md border border-border bg-surface/90">
          <div className="px-4"><Tabs items={[["All", "32"], ["Purchases", "12"], ["Sales", "8"], ["Listings", "6"], ["Bids", "3"], ["Transfers", "3"]]} value={tab} onChange={setTab} /></div>
          <div className="p-3">
            {rows.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No {tab.toLowerCase()} yet.</p> : rows.map((row) => {
              const Icon = icons[row.type as keyof typeof icons];
              return (
                <div key={`${row.type}-${row.id}-${row.date}`} className="grid items-center gap-3 border-b border-border p-2 last:border-0 sm:grid-cols-[150px_1fr_150px_auto]">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid size-10 shrink-0 place-content-center rounded-full", tints[row.type])}><Icon className="size-4" /></span>
                    <span className="min-w-0"><b className={cn("block text-xs", row.type === "Sale" && "text-primary", row.type === "Bid" && "text-gold")}>{row.type}</b><small className="mt-0.5 inline-block rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{row.state}</small><small className="mt-1 block text-[10px] text-muted-foreground">{row.date}</small></span>
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={row.art} alt={`${row.name} ${row.id}`} width={1024} height={1024} loading="lazy" className="size-14 rounded object-cover" />
                    <div className="min-w-0"><h3 className="truncate font-display text-sm font-semibold">{row.name} {row.id} <Verified /></h3><p className="text-[11px] text-muted-foreground">✿ {row.collection}</p><p className="text-[11px] text-muted-foreground">{row.detail}</p></div>
                  </div>
                  <div className="text-xs">{row.price ? <><b>◆ {row.price} ETH</b><small className="block text-muted-foreground">≈ ${row.usd}</small></> : <span className="text-muted-foreground">—</span>}<small className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">{row.hash}<Copy className="size-3" /></small></div>
                  <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-1 border-t border-border p-3">
            {["1", "2", "3", "4", "5", "...", "10"].map((page) => <Button key={page} size="icon" variant={page === "1" ? "default" : "outline"} className="size-8 text-xs">{page}</Button>)}
          </div>
        </section>
        <aside className="space-y-3">
          <div className="rounded-md border border-border bg-surface/90 p-4">
            <h2 className="font-display text-base font-semibold">Activity Filters</h2>
            <label className="field-label">Event Type</label><SelectBox placeholder="All Events" items={["All Events", "Purchases", "Sales", "Listings", "Bids", "Transfers"]} />
            <label className="field-label">Collection</label><SelectBox placeholder="All Collections" items={["All Collections", "The Ronin", "The Lotus"]} />
            <label className="field-label">NFT</label><SelectBox placeholder="All NFTs" items={["All NFTs", "The Ronin #042"]} />
            <label className="field-label">Date Range</label><input className="control w-full" type="date" aria-label="Date range" />
            <Button variant="outline" className="mt-4 w-full text-xs"><RefreshCw />Clear Filters</Button>
          </div>
          <InfoCard title="Quick Stats" rows={[["Total Sales", "8"], ["Total Purchases", "12"], ["Total Listings", "6"], ["Total Bids", "3"], ["Total Transfers", "3"]]} />
        </aside>
      </div>
    </AccountShell>
  );
}
