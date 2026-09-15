import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Grid2X2, List, Share2, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FilterPanel, InkHero, NftCard, SelectBox, Shell, Stat, Verified, collectionItems, getCollection } from "@/components/zenkai";

export const Route = createFileRoute("/collections/$slug")({
  head: ({ params }) => {
    const col = getCollection(params.slug);
    return {
      meta: [
        { title: `${col.name} Collection — Zenkaihood` },
        { name: "description", content: col.description },
        { property: "og:title", content: `${col.name} Collection — Zenkaihood` },
        { property: "og:description", content: col.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CollectionPage,
});

const ETH_USD = 2854.64;
const usd = (eth: number) => `$${(eth * ETH_USD).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function CollectionPage() {
  const { slug } = Route.useParams();
  const col = getCollection(slug);
  const items = collectionItems(slug);
  const [tab, setTab] = useState("Items");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const floorNum = parseFloat(col.floor.replace(/[^0-9.]/g, "")) || 0;
  const volumeNum = parseFloat(col.volume.replace(/[^0-9.]/g, "")) || 0;

  return (
    <Shell>
      <InkHero compact>
        <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <img src={col.art} alt={`${col.name} collection`} width={1024} height={1024} className="size-32 rounded-md border-[6px] border-surface object-cover shadow-art" />
            <div className="max-w-lg">
              <h1 className="font-display text-4xl font-semibold">{col.name} <Verified /></h1>
              <p className="mt-1 text-sm">by {col.creator}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{col.description}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-between gap-4 border-t border-border pt-3 lg:flex-row lg:items-center">
            <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-5">
              <Stat label="Floor Price" value={`◆ ${col.floor}`} sub={`≈ ${usd(floorNum)}`} />
              <Stat label="Total Volume" value={`◆ ${col.volume}`} sub={`≈ ${usd(volumeNum)}`} />
              <Stat label="Owners" value={col.owners} sub={`(${col.supply} supply)`} />
              <Stat label="Items" value={col.supply} sub="Total Supply" />
              <Stat label="Blockchain" value={col.chain} />
            </div>
            <div className="flex gap-3"><Button>View on Marketplace <ExternalLink /></Button><Button variant="outline"><Share2 />Share</Button></div>
          </div>
        </div>
      </InkHero>
      <main className="page-section pt-0">
        <div className="mb-3 flex gap-8 border-b border-border">{["Items", "Activity", "About", "Traits"].map((name) => <Button key={name} variant="ghost" onClick={() => setTab(name)} className={tab === name ? "tab-active" : "tab"}>{name}</Button>)}</div>
        {tab !== "Items" ? <div className="grid min-h-80 place-content-center text-center"><p className="font-display text-2xl">{tab}</p><p className="mt-2 text-sm text-muted-foreground">Collection {tab.toLowerCase()} is ready to explore.</p></div> : <>
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{items.length} items</h2><div className="flex gap-2"><Button className="lg:hidden" variant="outline" size="icon" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /></Button><div className="w-44"><SelectBox placeholder="Recently Listed" items={["Recently Listed", "Price: Low to High", "Price: High to Low"]} /></div><Button variant="outline" size="icon"><Grid2X2 /></Button><Button variant="outline" size="icon"><List /></Button></div></div>
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]"> <div className={filtersOpen ? "block" : "hidden lg:block"}><FilterPanel /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{items.map((item, index) => <NftCard key={item.id} item={item} index={index} />)}</div></div>
        </>}
      </main>
    </Shell>
  );
}
