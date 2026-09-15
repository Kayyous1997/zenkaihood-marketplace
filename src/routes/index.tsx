import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gem, ShieldCheck, Users } from "lucide-react";

import ronin from "@/assets/ronin.jpg";
import sakura from "@/assets/sakura.jpg";
import moon from "@/assets/moon.jpg";
import { Button } from "@/components/ui/button";
import { CollectionCard, InkHero, NftCard, SectionTitle, Shell, collections, nfts } from "@/components/zenkai";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Zenkaihood — Discover, Collect & Trade Digital Art" },
    { name: "description", content: "Explore premium Japanese-inspired digital art and NFT collections on Zenkaihood." },
    { property: "og:title", content: "Zenkaihood Digital Art Marketplace" },
    { property: "og:description", content: "Discover, collect and trade remarkable digital art." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ExplorePage,
});

function ExplorePage() {
  return (
    <Shell>
      <main>
        <InkHero>
          <div className="relative mx-auto grid max-w-[1440px] items-center px-4 py-12 sm:px-8 lg:min-h-[390px] lg:grid-cols-[1fr_1.08fr] lg:px-14">
            <div className="relative z-10 max-w-xl">
              <p className="eyebrow"><span />The Zenkaihood Marketplace</p>
              <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.96] sm:text-6xl">Discover, Collect <em className="font-normal text-primary">&</em> Trade Digital Art</h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">A premium NFT marketplace for creators, collectors, and dreamers. Own unique digital assets, support visionary artists, and be part of something bigger.</p>
              <div className="mt-6 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/collections/$slug" params={{ slug: "the-ronin" }}>Explore NFTs <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/create">Register Collection</Link></Button></div>
              <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-2"><Gem className="size-4 text-gold" />Unique Collections</span><span className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" />Secure Transactions</span><span className="flex items-center gap-2"><Users className="size-4 text-gold" />Global Community</span>
              </div>
            </div>
            <div className="relative hidden h-[320px] lg:block">
              <div className="absolute left-[19%] top-8 h-[270px] w-[215px] rotate-[-7deg] rounded-md border-[7px] border-surface bg-surface p-1 shadow-art"><img src={sakura} alt="Sakura collection art" className="size-full rounded-sm object-cover" /></div>
              <div className="absolute left-[39%] top-0 z-10 h-[310px] w-[245px] rotate-[2deg] rounded-md border-[8px] border-surface bg-surface p-1 shadow-art"><img src={ronin} alt="The Ronin collection art" className="size-full rounded-sm object-cover" /></div>
              <div className="absolute right-[3%] top-16 h-[245px] w-[190px] rotate-[10deg] rounded-md border-[7px] border-surface bg-surface p-1 shadow-art"><img src={moon} alt="Void Samurai collection art" className="size-full rounded-sm object-cover" /></div>
            </div>
          </div>
        </InkHero>

        <section className="page-section">
          <SectionTitle action={<Link to="/explore" className="section-link">View all collections <ArrowRight /></Link>}>Featured Collections</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{collections.map((item, index) => <CollectionCard key={item.name} item={item} index={index} />)}</div>
        </section>
        <section className="page-section grid gap-10 xl:grid-cols-[1.75fr_1fr]">
          <div><SectionTitle action={<Link to="/explore" className="section-link">View all <ArrowRight /></Link>}>Trending NFTs</SectionTitle><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{nfts.slice(0, 5).map((item, index) => <NftCard key={item.id} item={item} compact index={index} />)}</div></div>
          <div><SectionTitle>Recently Listed</SectionTitle><div className="rounded-md border border-border bg-surface/80">{nfts.slice(0, 5).map((item, index) => <div key={item.id} className="flex animate-fade-in-up items-center gap-3 border-b border-border p-2.5 last:border-0" style={{ animationDelay: `${index * 0.05}s` }}><img src={item.art} alt="" className="size-10 rounded object-cover" /><div className="min-w-0 flex-1"><p className="truncate font-display text-sm font-semibold">{item.name} {item.id}</p><p className="text-[10px] text-muted-foreground">{item.collection}</p></div><div className="text-right text-xs"><b>{item.price}</b><small className="block text-muted-foreground">{item.time}</small></div><ArrowRight className="size-3.5 text-gold" /></div>)}</div></div>
        </section>
      </main>
    </Shell>
  );
}