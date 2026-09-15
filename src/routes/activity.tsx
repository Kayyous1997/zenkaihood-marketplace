import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, ExternalLink, Gavel, ListRestart, Tag, WandSparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InkHero, SelectBox, Shell, Verified, nfts } from "@/components/zenkai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [
    { title: "Marketplace Activity — Zenkaihood" },
    { name: "description", content: "Track Zenkaihood marketplace sales, listings, transfers, offers, and mints." },
    { property: "og:title", content: "Marketplace Activity — Zenkaihood" },
    { property: "og:description", content: "Follow all marketplace activity in one place." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}), component: ActivityPage,
});

const events = ["Sale", "Listing", "Transfer", "Mint", "Cancelled", "Sale", "Listing", "Transfer"];
const eventStyle: Record<string, string> = { Sale: "bg-success/15 text-success", Listing: "bg-violet/15 text-violet", Transfer: "bg-info/15 text-info", Mint: "bg-gold/15 text-gold", Cancelled: "bg-destructive/15 text-destructive" };
const icons = { Sale: Tag, Listing: ListRestart, Transfer: ArrowRightLeft, Mint: WandSparkles, Cancelled: Gavel };

function ActivityPage() {
  const [category, setCategory] = useState("All Activity");
  const [tab, setTab] = useState("All");
  const categories = ["All Activity", "Sales", "Listings", "Offers", "Transfers", "Mints", "Cancellations"];
  return <Shell>
    <InkHero compact><div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14"><div className="flex items-start gap-4"><span className="font-jp text-5xl font-black text-primary">蔵</span><div><h1 className="font-display text-4xl font-semibold">Activity</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Track all marketplace activity, from listings and sales to transfers and mints. Everything that happens on-chain, in one place.</p></div></div></div></InkHero>
    <main className="page-section grid gap-5 lg:grid-cols-[200px_1fr_240px]">
      <aside className="overflow-hidden rounded-md border border-border bg-surface/90">{categories.map((item, index) => <Button key={item} variant="ghost" onClick={() => setCategory(item)} className={cn("h-12 w-full justify-between rounded-none border-b border-border px-4 text-xs", category === item && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}><span>{item}</span><small className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{index ? [52,67,23,48,12,32][index-1] : 234}</small></Button>)}</aside>
      <section className="min-w-0 rounded-md border border-border bg-surface/90"><div className="flex flex-col justify-between border-b border-border px-4 sm:flex-row sm:items-center"><div className="flex overflow-x-auto">{["All", "Sales", "Listings", "Offers", "Transfers", "Mints", "Cancellations"].map((item) => <Button key={item} variant="ghost" onClick={() => setTab(item)} className={tab === item ? "tab-active" : "tab"}>{item}</Button>)}</div><div className="w-36 py-2"><SelectBox placeholder="Most Recent" items={["Most Recent", "Oldest"]} /></div></div>
        <div>{nfts.slice(0,8).map((nft, index) => { const type = events[index] ?? "Transfer"; const Icon = icons[type as keyof typeof icons]; return <div key={`${nft.id}-${index}`} className="grid grid-cols-[36px_52px_1fr] items-center gap-3 border-b border-border p-3 last:border-0 sm:grid-cols-[36px_52px_1.4fr_1fr_auto]"><span className={cn("grid size-8 place-content-center rounded-full", eventStyle[type])}><Icon className="size-3.5" /></span><img src={nft.art} alt="" className="size-12 rounded object-cover" /><div className="min-w-0"><p className="truncate font-display text-sm font-semibold">{nft.name} {nft.id}</p><p className="text-[11px] text-muted-foreground">{nft.collection} <Verified /></p><p className="text-[10px] text-muted-foreground">⌁ 0x7a3f...9c2e</p></div><div className="col-start-3 text-xs sm:col-start-auto"><span className="text-muted-foreground">{type === "Sale" ? "Sold for" : type === "Listing" ? "Listed for" : type}</span><b className="block">◆ {nft.price}</b></div><div className="col-start-3 flex items-center justify-between text-[11px] text-muted-foreground sm:col-start-auto"><span>{nft.time}</span><ExternalLink className="size-3.5" /></div></div>})}</div>
      </section>
      <aside className="space-y-3"><div className="rounded-md border border-border bg-surface/90 p-4"><h2 className="font-display text-lg font-semibold">Activity Filters</h2><label className="field-label">Event Type</label><SelectBox placeholder="All Events" items={["All Events", "Sales", "Listings"]} /><label className="field-label">Collection</label><SelectBox placeholder="All Collections" items={["All Collections", "The Ronin"]} /><label className="field-label">NFT</label><SelectBox placeholder="All NFTs" items={["All NFTs", "Shadow Walker"]} /><label className="field-label">Wallet Address</label><input className="control w-full" placeholder="0x..." /><label className="field-label">Date Range</label><input className="control w-full" type="date" /></div><div className="rounded-md border border-border bg-surface/90 p-4"><h2 className="font-display text-lg font-semibold">Stats</h2>{[["Total Sales","52"],["Total Volume","24.8 ETH"],["Total Listings","67"],["Total Transfers","48"]].map(([label,value]) => <div key={label} className="mt-4"><p className="text-[11px] text-muted-foreground">{label}</p><b className="text-sm">{value}</b></div>)}</div></aside>
    </main>
  </Shell>;
}