import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Grid2X2, List, Share2, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import ronin from "@/assets/ronin.jpg";
import { Button } from "@/components/ui/button";
import { FilterPanel, InkHero, NftCard, SelectBox, Shell, Stat, Verified, nfts } from "@/components/zenkai";

export const Route = createFileRoute("/collections/the-ronin")({
  head: () => ({ meta: [
    { title: "The Ronin Collection — Zenkaihood" },
    { name: "description", content: "Explore The Ronin, a collection of 777 lone warriors on Zenkaihood." },
    { property: "og:title", content: "The Ronin Collection — Zenkaihood" },
    { property: "og:description", content: "Discover 777 unique Ronin digital collectibles." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: CollectionPage,
});

function CollectionPage() {
  const [tab, setTab] = useState("Items");
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <Shell>
      <InkHero compact>
        <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <img src={ronin} alt="The Ronin collection" width={1024} height={1024} className="size-32 rounded-md border-[6px] border-surface object-cover shadow-art" />
            <div className="max-w-lg"><h1 className="font-display text-4xl font-semibold">The Ronin <Verified /></h1><p className="mt-1 text-sm">by Zenkaihood</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">A collection of 777 lone warriors, each carrying a story of honor, loss, and the endless pursuit of a greater tomorrow.</p></div>
          </div>
          <div className="mt-6 flex flex-col justify-between gap-4 border-t border-border pt-3 lg:flex-row lg:items-center">
            <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-5"><Stat label="Floor Price" value="◆ 1.25 ETH" sub="≈ $2,480" /><Stat label="Total Volume" value="◆ 24.8 ETH" sub="≈ $48,520" /><Stat label="Owners" value="642" sub="(82.8%)" /><Stat label="Items" value="777" sub="Total Supply" /><Stat label="Blockchain" value="Ethereum" /></div>
            <div className="flex gap-3"><Button>View on Marketplace <ExternalLink /></Button><Button variant="outline"><Share2 />Share</Button></div>
          </div>
        </div>
      </InkHero>
      <main className="page-section pt-0">
        <div className="mb-3 flex gap-8 border-b border-border">{["Items", "Activity", "About", "Traits"].map((name) => <Button key={name} variant="ghost" onClick={() => setTab(name)} className={tab === name ? "tab-active" : "tab"}>{name}</Button>)}</div>
        {tab !== "Items" ? <div className="grid min-h-80 place-content-center text-center"><p className="font-display text-2xl">{tab}</p><p className="mt-2 text-sm text-muted-foreground">Collection {tab.toLowerCase()} is ready to explore.</p></div> : <>
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">777 items</h2><div className="flex gap-2"><Button className="lg:hidden" variant="outline" size="icon" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /></Button><div className="w-44"><SelectBox placeholder="Recently Listed" items={["Recently Listed", "Price: Low to High", "Price: High to Low"]} /></div><Button variant="outline" size="icon"><Grid2X2 /></Button><Button variant="outline" size="icon"><List /></Button></div></div>
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]"> <div className={filtersOpen ? "block" : "hidden lg:block"}><FilterPanel /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{nfts.map((item, index) => <NftCard key={item.id} item={item} index={index} />)}</div></div>
        </>}
      </main>
    </Shell>
  );
}