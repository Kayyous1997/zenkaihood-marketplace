import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Info, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountShell, PageHead, SelectBox, SellDialog, Tabs, Verified, listings } from "@/components/zenkai";

export const Route = createFileRoute("/listings")({
  head: () => ({ meta: [
    { title: "Your Active Listings — Zenkaihood" },
    { name: "description", content: "Manage your Zenkaihood listings, update prices, or cancel them at any time." },
    { property: "og:title", content: "Your Active Listings — Zenkaihood" },
    { property: "og:description", content: "Manage the collectibles you have listed for sale." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ListingsPage,
});

function ListingsPage() {
  const [tab, setTab] = useState("Active");
  return (
    <AccountShell>
      <PageHead
        eyebrow="My Listings"
        title="Your Active Listings"
        description={<>Manage your NFT listings, update prices, or cancel them anytime.<br />Your items are visible to buyers on the marketplace.</>}
        action={<div className="flex flex-wrap gap-2"><SellDialog label="List an NFT" variant="default" /><Button asChild size="lg" variant="outline"><Link to="/create"><Plus />Register Collection</Link></Button></div>}
      />
      <div className="page-section">
        <section className="rounded-md border border-border bg-surface/90">
          <div className="flex flex-col justify-between gap-3 border-b border-border px-4 sm:flex-row sm:items-center">
            <Tabs items={[["Active", "5"], ["Sold", "3"], ["Cancelled", "2"], ["Expired", "1"]]} value={tab} onChange={setTab} />
            <div className="w-52 py-2"><SelectBox placeholder="Sort by: Recently Listed" items={["Recently Listed", "Price: Low to High", "Expiring Soon"]} /></div>
          </div>

          <div className="hidden grid-cols-[2fr_1fr_1.2fr_0.8fr_1.4fr] gap-3 px-4 py-3 text-[11px] text-muted-foreground lg:grid">
            <span>NFT</span><span>Price</span><span>Expiration</span><span>Status</span><span>Actions</span>
          </div>

          <div className="space-y-2 p-3 pt-0">
            {listings.map((item) => (
              <div key={item.id} className="grid items-center gap-3 rounded-md border border-border p-3 lg:grid-cols-[2fr_1fr_1.2fr_0.8fr_1.4fr]">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={item.art} alt={`${item.name} ${item.id}`} width={1024} height={1024} loading="lazy" className="size-16 rounded object-cover" />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-sm font-semibold">{item.name} {item.id} <Verified /></h3>
                    <p className="text-[11px] text-muted-foreground">✿ {item.collection}</p>
                    <p className="text-[11px] text-muted-foreground">Token ID: {item.id}</p>
                  </div>
                </div>
                <div className="text-xs"><b>◆ {item.price} ETH</b><small className="block text-muted-foreground">≈ ${item.usd}</small></div>
                <div className="flex items-start gap-2 text-xs"><CalendarDays className="mt-0.5 size-3.5 text-muted-foreground" /><span><b>{item.left}</b><small className="block text-muted-foreground">{item.date}</small></span></div>
                <span className="w-fit rounded-full bg-success/15 px-2 py-1 text-[10px] text-success">● {tab}</span>
                <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="text-xs">Update Price</Button><Button size="sm" className="text-xs">Cancel Listing</Button><Button variant="outline" size="icon" className="size-8" aria-label="More options"><MoreHorizontal /></Button></div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 border-t border-border p-4 lg:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3"><span className="text-primary">✿</span><span className="text-xs"><b>5 active listings</b><small className="block text-muted-foreground">Total value: 4.35 ETH (≈ $10,795.94)</small></span></div>
            <div className="flex items-start gap-3 rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" />Your listings will automatically expire based on the date and time you set. You can cancel or update them at any time.</div>
          </div>
        </section>
      </div>
    </AccountShell>
  );
}
