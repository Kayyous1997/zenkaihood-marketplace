import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, ExternalLink, Grid2X2, List, PlusCircle, RefreshCw, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountShell, InfoCard, OwnedCard, PageHead, SelectBox, SellDialog, Tabs, Verified, owned, profile } from "@/components/zenkai";

export const Route = createFileRoute("/my-nfts")({
  head: () => ({ meta: [
    { title: "My NFTs — Zenkaihood" },
    { name: "description", content: "View, manage, and list the digital collectibles you own on the Zenkaihood marketplace." },
    { property: "og:title", content: "My NFTs — Zenkaihood" },
    { property: "og:description", content: "All the collectibles you own, ready to manage or list." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: MyNftsPage,
});

function MyNftsPage() {
  const [tab, setTab] = useState("Owned");
  return (
    <AccountShell>
      <PageHead title="My NFTs" description="Here are all the NFTs you own. View, manage, and list them on the marketplace." />
      <div className="page-section grid gap-5 xl:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <section className="flex flex-col gap-5 rounded-md border border-border bg-surface/90 p-4 sm:flex-row sm:items-center">
            <img src={profile.avatar} alt="Akeno avatar" width={1024} height={1024} className="size-20 rounded-full object-cover" />
            <div>
              <h2 className="font-display text-2xl font-semibold">{profile.name} <Verified /></h2>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{profile.address}<Copy className="size-3" /></p>
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Collector</span>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 sm:border-l sm:border-border sm:pl-5">
              {profile.stats.map(([label, value]) => <div key={label}><b className="font-display text-lg">{value}</b><p className="text-[11px] text-muted-foreground">{label}</p></div>)}
            </div>
          </section>

          <div className="mt-5"><Tabs items={[["Owned"], ["Created"], ["Listed"], ["Favorites"]]} value={tab} onChange={setTab} /></div>
          <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">My NFTs <small className="font-body text-xs font-normal text-muted-foreground">(12)</small></h2>
            <div className="flex items-center gap-2"><div className="w-44"><SelectBox placeholder="Sort by: Recently Added" items={["Recently Added", "Price: Low to High", "Price: High to Low"]} /></div><Button variant="outline" size="icon"><Grid2X2 /></Button><Button variant="outline" size="icon"><List /></Button></div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{owned.map((item, index) => <OwnedCard key={`${item.id}-${index}`} item={item} badge={tab === "Listed" ? "Listed" : "Owned"} index={index} />)}</div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-md border border-border bg-surface/90 p-4"><h2 className="font-display text-base font-semibold">Wallet Address</h2><p className="mt-3 flex items-center gap-2 text-xs">{profile.address}<Copy className="size-3.5 text-muted-foreground" /></p><p className="mt-2 text-[11px] text-muted-foreground"><span className="mr-2 rounded-sm bg-muted px-1.5 py-0.5">ENS</span>Not set</p></div>
          <InfoCard title="Collection Stats" rows={[["Total NFTs", "12"], ["Collections", "5"], ["Total Volume", "8.42 ETH"]]} />
          <div className="rounded-md border border-border bg-surface/90 p-4">
            <h2 className="font-display text-base font-semibold">Quick Filters</h2>
            <label className="field-label">Collections</label><SelectBox placeholder="All Collections" items={["All Collections", "The Ronin", "The Lotus", "Cyber Edo"]} />
            <label className="field-label">Status</label><SelectBox placeholder="Owned" items={["Owned", "Listed", "Created"]} />
            <Button variant="outline" className="mt-4 w-full text-xs"><RefreshCw />Clear Filters</Button>
          </div>
          <div className="rounded-md border border-border bg-surface/90 p-4">
            <h2 className="font-display text-base font-semibold">Actions</h2>
            <SellDialog label="List an NFT for Sale" variant="default" className="mt-3 w-full justify-start text-xs" />
            <Button asChild variant="ghost" className="mt-2 w-full justify-start text-xs"><Link to="/collections/the-ronin">View on Marketplace <ExternalLink className="ml-auto size-3.5" /></Link></Button>
            <Button asChild variant="ghost" className="w-full justify-start text-xs"><Link to="/create"><PlusCircle />Register Collection</Link></Button>
            <Button variant="ghost" className="w-full justify-start text-xs"><Send />Transfer NFT</Button>
          </div>
        </aside>
      </div>
    </AccountShell>
  );
}
