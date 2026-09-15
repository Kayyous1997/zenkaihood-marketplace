import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Copy, Globe2, Grid2X2, List, MessageCircle, Pencil, Twitter } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet";
import { AccountShell, InfoCard, InkHero, OwnedCard, SelectBox, Tabs, Verified, owned, profile } from "@/components/zenkai";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Akeno's Profile — Zenkaihood" },
    { name: "description", content: "View Akeno's Zenkaihood profile: owned and created collectibles, listings, favorites, and wallet stats." },
    { property: "og:title", content: "Akeno's Profile — Zenkaihood" },
    { property: "og:description", content: "Collector profile with owned works, listings and activity." },
    { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ProfilePage,
});

const tabs = [["Owned"], ["Created"], ["Listed"], ["Activity"], ["Favorites"]] as const;

function ProfilePage() {
  const [tab, setTab] = useState("Owned");
  const { wallet, chainName } = useWallet();
  return (
    <AccountShell>
      <div className="page-section">
        <section className="overflow-hidden rounded-md border border-border bg-surface/90">
          <InkHero compact>
            <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
              <img src={profile.avatar} alt="Akeno avatar" width={1024} height={1024} className="size-28 rounded-md border-4 border-surface object-cover shadow-art" />
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-4xl font-semibold">{profile.name} <Verified /></h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{wallet ?? profile.address}<Copy className="size-3.5" /><span className="rounded-sm bg-muted px-2 py-0.5 text-[10px]">{chainName ?? "ENS not set"}</span></p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
                <div className="mt-3 flex gap-4 text-muted-foreground"><Twitter className="size-4" /><MessageCircle className="size-4" /><Globe2 className="size-4" /></div>
              </div>
              <div className="flex gap-2"><Button variant="outline"><Pencil />Edit Profile</Button><Button>Follow</Button></div>
            </div>
          </InkHero>
          <div className="grid grid-cols-2 divide-border border-t border-border sm:grid-cols-5 sm:divide-x">
            {profile.stats.map(([label, value]) => <div key={label} className="p-4"><b className="font-display text-xl">{value}</b><p className="text-[11px] text-muted-foreground">{label}</p></div>)}
            <div className="flex items-center gap-2 p-4"><CalendarDays className="size-4 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Joined<b className="block text-xs text-foreground">Aug 2025</b></span></div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_280px]">
          <section className="min-w-0">
            <Tabs items={tabs} value={tab} onChange={setTab} />
            <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">{tab} NFTs <small className="font-body text-xs font-normal text-muted-foreground">12 items</small></h2>
              <div className="flex items-center gap-2"><div className="w-44"><SelectBox placeholder="Recently Added" items={["Recently Added", "Price: Low to High", "Price: High to Low"]} /></div><Button variant="outline" size="icon"><Grid2X2 /></Button><Button variant="outline" size="icon"><List /></Button></div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{owned.slice(0, 8).map((item, index) => <OwnedCard key={`${item.id}-${index}`} item={item} />)}</div>
          </section>
          <aside className="space-y-3">
            <div className="rounded-md border border-border bg-surface/90 p-4">
              <h2 className="font-display text-base font-semibold">Wallet Address</h2>
              <p className="mt-3 flex items-center gap-2 text-xs">{wallet ?? profile.address}<Copy className="size-3.5 text-muted-foreground" /></p>
              <p className="mt-2 text-[11px] text-muted-foreground"><span className="mr-2 rounded-sm bg-muted px-1.5 py-0.5">ENS</span>Not set</p>
            </div>
            <InfoCard title="Social Links" rows={[["X", "@Akeno"], ["Discord", "Not set"], ["Website", "Not set"]]} />
            <div className="rounded-md border border-border bg-surface/90 p-4"><h2 className="font-display text-base font-semibold">Bio</h2><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{profile.bio}</p></div>
            <InfoCard title="Stats" rows={[["Total Sales", "5"], ["Total Volume", "8.42 ETH"], ["Total Listings", "4"], ["Total Transfers", "12"]]} />
          </aside>
        </div>
      </div>
    </AccountShell>
  );
}
