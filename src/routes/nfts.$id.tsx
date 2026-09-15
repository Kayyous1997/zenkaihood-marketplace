import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, Share2, ShieldCheck, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SellDialog, Shell, Verified, nfts, owned } from "@/components/zenkai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nfts/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `NFT ${params.id} — Zenkaihood` },
      { name: "description", content: `View details, traits, and listing history for Zenkaihood NFT ${params.id}.` },
      { property: "og:title", content: `NFT ${params.id} — Zenkaihood` },
      { property: "og:description", content: `Explore this digital collectible on Zenkaihood.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NftDetailPage,
});

type NftItem = (typeof nfts)[number] | (typeof owned)[number];

function findNft(id: string): NftItem {
  return nfts.find((n) => n.id === id) ?? owned.find((n) => n.id === id) ?? nfts[0]!;
}

const history = [
  { event: "Listed", price: "1.23 ETH", from: "0x7a3f...9c2e", to: "—", date: "2 hours ago" },
  { event: "Transfer", price: "—", from: "0x8f2c...6d4a", to: "0x7a3f...9c2e", date: "3 days ago" },
  { event: "Sale", price: "0.95 ETH", from: "0x9a1e...7a0c", to: "0x8f2c...6d4a", date: "1 week ago" },
  { event: "Minted", price: "—", from: "—", to: "0x9a1e...7a0c", date: "2 weeks ago" },
];

function NftDetailPage() {
  const { id } = Route.useParams();
  const item = useMemo(() => findNft(id), [id]);
  const [liked, setLiked] = useState(false);
  const priceNum = parseFloat(item.price?.replace(/[^0-9.]/g, "") ?? "0");
  const usd = (priceNum * 2854.64).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <Shell>
      <main className="page-section animate-fade-in-up">
        <Button asChild variant="ghost" className="mb-4 -ml-2 gap-2 text-xs text-muted-foreground hover:text-foreground">
          <Link to="/collections/the-ronin"><ArrowLeft className="size-4" /> Back to collection</Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-md border border-border bg-surface/90 p-3 shadow-art">
            <div className="relative aspect-square overflow-hidden rounded-sm">
              <img src={item.art} alt={`${item.name} ${item.id}`} width={1024} height={1024} className="size-full object-cover" />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground">◉ {item.collection} <Verified /></p>
              <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{item.name} {item.id}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                Owned by <span className="text-foreground">0x7a3f...9c2e</span>
                <ShieldCheck className="size-4 text-info" />
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface/90 p-4">
              <p className="text-xs text-muted-foreground">Current price</p>
              <div className="mt-1 flex items-baseline gap-3">
                <b className="font-display text-3xl font-semibold">◆ {item.price}</b>
                <span className="text-sm text-muted-foreground">≈ ${usd}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <BuyNowDialog price={item.price} />
                <Button variant="outline" className="press"><WalletCards /> Make Offer</Button>
                <SellDialog itemName={`${item.name} ${item.id}`} defaultPrice={String(priceNum || 1)} />
                <Button size="icon" variant="outline" onClick={() => setLiked(!liked)} aria-label={liked ? "Remove favorite" : "Add favorite"} className="press">
                  <Heart className={cn("size-4 transition-colors", liked && "fill-primary text-primary animate-heart-pop")} />
                </Button>
                <Button size="icon" variant="outline" aria-label="Share" className="press"><Share2 className="size-4" /></Button>
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface/90 p-4">
              <h2 className="font-display text-base font-semibold">Traits</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {"traits" in item && item.traits ? (
                  item.traits.map((trait: string) => (
                    <div key={trait} className="rounded-md border border-border bg-background/60 p-2.5 text-center transition-colors hover:border-primary/40">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{trait}</p>
                      <p className="mt-0.5 text-xs font-semibold">{trait}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{(Math.random() * 12 + 1).toFixed(1)}% have this</p>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-xs text-muted-foreground">No traits listed.</p>
                )}
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface/90 p-4">
              <h2 className="font-display text-base font-semibold">Details</h2>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Contract Address</span><b>0x7a3f...9c2e</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Token ID</span><b>{item.id}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Token Standard</span><b>ERC-721</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Chain</span><b>Ethereum</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Creator Royalties</span><b>5%</b></div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface/90 p-4">
              <h2 className="font-display text-base font-semibold">Listing History</h2>
              <div className="mt-3 divide-y divide-border">
                {history.map((row) => (
                  <div key={`${row.event}-${row.date}`} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-medium">{row.event}</span>
                    <span className="text-muted-foreground">{row.price}</span>
                    <span className="hidden text-muted-foreground sm:inline">{row.from} → {row.to}</span>
                    <span className="text-muted-foreground">{row.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </Shell>
  );
}

function BuyNowDialog({ price }: { price: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button className="press">Buy Now <WalletCards /></Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Confirm purchase</DialogTitle>
          <DialogDescription>You are about to buy {price}. This is a visual preview — no real transaction will occur.</DialogDescription>
        </DialogHeader>
        <DialogFooter><Button>Confirm Preview</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
