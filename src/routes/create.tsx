import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ImagePlus, Settings } from "lucide-react";
import { useState } from "react";

import ronin from "@/assets/ronin.jpg";
import { Button } from "@/components/ui/button";
import {
  AccountShell,
  InkHero,
  SelectBox,
  Verified,
} from "@/components/zenkai";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/create")({
  head: () => ({ meta: [
    { title: "Register a Collection — Zenkaihood" },
    { name: "description", content: "Register your NFT collection on Zenkaihood to enable secondary sales, set royalties and payout details." },
    { property: "og:title", content: "Register a Collection — Zenkaihood" },
    { property: "og:description", content: "Set up your collection for secondary trading on Zenkaihood." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}), component: RegisterCollectionPage,
});

function RegisterCollectionPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [contract, setContract] = useState("");
  const [royaltyText, setRoyaltyText] = useState("5");
  const [payout, setPayout] = useState("");
  const [advanced, setAdvanced] = useState(false);

  const royalty = Math.min(Math.max(Number(royaltyText) || 0, 0), 10);
  const autoSlug = slug || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return <AccountShell>
    <main>
      <InkHero compact>
        <div className="relative mx-auto max-w-[1240px] px-4 py-8 sm:px-8">
          <p className="eyebrow">Creator Studio<span /></p>
          <h1 className="mt-2 font-display text-5xl font-semibold">Register Your Collection</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Zenkaihood is a secondary marketplace. Register your deployed contract so holders can trade your collection here — and so every resale pays you a royalty.</p>
        </div>
      </InkHero>

      <div className="mx-auto grid max-w-[1240px] gap-5 px-4 py-5 sm:px-8 xl:grid-cols-[1fr_350px]">
        <section className="rounded-md border border-border bg-surface/90 p-5 sm:p-6">
          <Step number="1." title="Collection Artwork" subtitle="Upload a logo and a banner. Recommended 350×350 and 1400×400.">
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <UploadBox className="size-28" label="Logo" />
              <UploadBox className="h-28" label="Banner" />
            </div>
          </Step>

          <Step number="2." title="Collection Details" subtitle="How your collection appears across the marketplace.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label mt-0" htmlFor="col-name">Collection Name</label>
                <input id="col-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="The Ronin" className="control w-full" />
              </div>
              <div>
                <label className="field-label mt-0" htmlFor="col-slug">Marketplace URL</label>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-border px-3 text-xs text-muted-foreground">zenkaihood.io/collections/</span>
                  <input id="col-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder={autoSlug || "the-ronin"} className="control min-w-0 flex-1 rounded-l-none" />
                </div>
              </div>
            </div>
            <label className="field-label" htmlFor="col-desc">Description</label>
            <textarea id="col-desc" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Tell collectors the story behind your collection." className="control h-auto w-full py-2" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="field-label" htmlFor="col-cat">Category</label><SelectBox placeholder="Art" items={["Art", "Photography", "Gaming", "PFP", "Music"]} /></div>
              <div><label className="field-label" htmlFor="col-chain">Blockchain</label><SelectBox placeholder="◆  Ethereum" items={["Ethereum", "Base", "Polygon"]} /></div>
            </div>
          </Step>

          <Step number="3." title="Contract" subtitle="Paste the deployed contract address. We verify ownership before your collection goes live.">
            <input aria-label="Contract address" value={contract} onChange={(event) => setContract(event.target.value)} placeholder="0x0000…0000" className="control w-full font-mono" />
            <p className="mt-2 text-[11px] text-muted-foreground">Ownership is confirmed by signing a message with the deployer wallet — no transaction, no gas.</p>
          </Step>

          <Step number="4." title="Royalties & Payouts" subtitle="Earn a percentage of every secondary sale on Zenkaihood.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label mt-0" htmlFor="col-royalty">Creator Royalty</label>
                <div className="flex">
                  <input id="col-royalty" value={royaltyText} onChange={(event) => setRoyaltyText(event.target.value)} inputMode="decimal" className="control min-w-0 flex-1 rounded-r-none" />
                  <span className="flex items-center rounded-r-md border border-l-0 border-border px-3 text-sm">%</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Maximum 10%. Applied to every resale.</p>
              </div>
              <div>
                <label className="field-label mt-0" htmlFor="col-payout">Payout Wallet</label>
                <input id="col-payout" value={payout} onChange={(event) => setPayout(event.target.value)} placeholder="0x0000…0000" className="control w-full font-mono" />
              </div>
            </div>
          </Step>

          <div className="rounded-md border border-border">
            <Button variant="ghost" onClick={() => setAdvanced(!advanced)} className="h-14 w-full justify-between"><span className="flex items-center gap-3"><Settings />Advanced Options</span><ChevronDown className={cn("transition-transform", advanced && "rotate-180")} /></Button>
            {advanced && <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
              <label className="text-xs">Website<input className="control mt-2 w-full" placeholder="https://" /></label>
              <label className="text-xs">X / Twitter<input className="control mt-2 w-full" placeholder="@handle" /></label>
              <label className="text-xs">Discord<input className="control mt-2 w-full" placeholder="discord.gg/…" /></label>
              <label className="text-xs">Display theme<SelectBox placeholder="Padded" items={["Padded", "Contained", "Covered"]} /></label>
            </div>}
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-md bg-muted p-3 sm:flex-row">
            <p className="text-[11px] text-muted-foreground">ⓘ Registering does not mint or transfer anything. Your contract stays entirely yours.</p>
            <RegisterReview name={name || "Untitled Collection"} royalty={royalty} />
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded-md border border-border bg-surface/95 p-5">
            <h2 className="font-display text-lg font-semibold">Collection Preview</h2>
            <div className="my-5 flex items-center gap-4">
              <img src={ronin} alt="Collection logo preview" width={1024} height={1024} className="size-20 rounded object-cover" />
              <div className="min-w-0">
                <h3 className="truncate font-display font-semibold">{name || "Your Collection"} <Verified /></h3>
                <p className="truncate text-xs text-muted-foreground">zenkaihood.io/collections/{autoSlug || "your-collection"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{royalty}% creator royalty</p>
              </div>
            </div>
            <div className="space-y-4 border-t border-border py-4 text-sm">
              <Row label="Marketplace Fee" value="2.5%" />
              <Row label="Your Royalty" value={`${royalty}%`} />
              <Row label="Seller Receives" value={`${(100 - 2.5 - royalty).toFixed(2)}%`} strong />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">ⓘ Percentages apply to each secondary sale of an item in this collection.</p>
          </div>
          <div className="rounded-md border border-border bg-surface/90 p-5">
            <h2 className="font-display text-lg font-semibold">Registration Status</h2>
            {[["Contract", contract ? "Provided" : "Not set"], ["Ownership", "Pending signature"], ["Visibility", "Draft"]].map(([label, value]) => <div key={label} className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><b>{value}</b></div>)}
          </div>
        </aside>
      </div>
    </main>
  </AccountShell>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between gap-4"><span className={cn("text-muted-foreground", strong && "font-semibold text-foreground")}>{label}</span><b className={cn(strong && "font-display text-base")}>{value}</b></div>;
}

function UploadBox({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" className={cn("grid w-full place-items-center gap-1 rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary", className)}>
      <ImagePlus className="size-5" />
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

function RegisterReview({ name, royalty }: { name: string; royalty: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button className="min-w-40">Review & Register</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Review your collection</DialogTitle>
          <DialogDescription>{name} will be listed for secondary trading with a {royalty}% creator royalty. This is a visual preview and no blockchain transaction will occur.</DialogDescription>
        </DialogHeader>
        <DialogFooter><Button>Confirm Preview</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ number, title, optional, subtitle, children }: { number: string; title: string; optional?: boolean; subtitle: string; children: React.ReactNode }) {
  return <div className="mb-7"><h2 className="font-display text-xl font-semibold">{number} {title} {optional && <small className="font-body text-sm font-normal">(Optional)</small>}</h2><p className="mb-3 ml-5 mt-1 text-xs text-muted-foreground">{subtitle}</p>{children}</div>;
}
