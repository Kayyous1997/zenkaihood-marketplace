import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ImagePlus, Settings } from "lucide-react";
import { useState } from "react";

import ronin from "@/assets/ronin.jpg";
import { Button } from "@/components/ui/button";
import { AccountShell, InkHero, SelectBox, Verified } from "@/components/zenkai";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@/lib/wallet";
import { useRegistry, useIsRegistered } from "@/hooks/useRegistry";
import { parseContractError } from "@/lib/contract-errors";
import { toast } from "sonner";

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
  const { wallet } = useWallet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contract, setContract] = useState("");
  const [royaltyText, setRoyaltyText] = useState("5");
  const [payout, setPayout] = useState("");
  const [tokenStandard, setTokenStandard] = useState<"ERC-721" | "ERC-1155">("ERC-721");
  const [advanced, setAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const royalty = Math.min(Math.max(Number(royaltyText) || 0, 0), 10);
  const royaltyBps = Math.round(royalty * 100);

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(contract);

  // Check if already registered
  const { data: isRegistered } = useIsRegistered(
    isValidAddress ? (contract as `0x${string}`) : undefined
  );

  const { registerCollection, isPending, isConfirming, isSuccess } = useRegistry();

  async function handleRegister() {
    if (!wallet) { toast.error("Connect your wallet first."); return; }
    if (!isValidAddress) { toast.error("Enter a valid contract address."); return; }
    if (!payout || !/^0x[0-9a-fA-F]{40}$/.test(payout)) { toast.error("Enter a valid payout wallet address."); return; }
    if (isRegistered) { toast.error("This collection is already registered."); return; }

    setIsSubmitting(true);
    try {
      await registerCollection(
        contract as `0x${string}`,
        tokenStandard === "ERC-721" ? 0 : 1,
        payout as `0x${string}`,
        royaltyBps,
      );
      toast.success("Collection registered successfully!", { id: "registry" });
    } catch (err) {
      toast.error(parseContractError(err), { id: "registry" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AccountShell>
      <main>
        <InkHero compact>
          <div className="relative mx-auto max-w-[1240px] px-4 py-8 sm:px-8">
            <p className="eyebrow">Creator Studio<span /></p>
            <h1 className="mt-2 font-display text-5xl font-semibold">Register Your Collection</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Zenkaihood is a secondary marketplace. Register your deployed contract so holders can trade your collection here — and so every resale pays you a royalty.
            </p>
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
                  <input id="col-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Ronin" className="control w-full" />
                </div>
                <div>
                  <label className="field-label mt-0" htmlFor="col-standard">Token Standard</label>
                  <SelectBox
                    placeholder="ERC-721"
                    items={["ERC-721", "ERC-1155"]}
                  />
                </div>
              </div>
              <label className="field-label" htmlFor="col-desc">Description</label>
              <textarea id="col-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Tell collectors the story behind your collection." className="control h-auto w-full py-2" />
            </Step>

            <Step number="3." title="Contract" subtitle="Paste the deployed contract address. You must be the contract owner (IERC173 owner()) to register.">
              <input
                aria-label="Contract address"
                value={contract}
                onChange={(e) => setContract(e.target.value)}
                placeholder="0x0000…0000"
                className={cn("control w-full font-mono", isValidAddress && "border-success", contract && !isValidAddress && "border-destructive")}
              />
              {isValidAddress && isRegistered === true && (
                <p className="mt-2 text-[11px] text-destructive">⚠ This collection is already registered.</p>
              )}
              {isValidAddress && isRegistered === false && (
                <p className="mt-2 text-[11px] text-success">✓ Contract found, not yet registered.</p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">Your wallet must be the owner of the NFT contract to register it. This is verified on-chain.</p>
            </Step>

            <Step number="4." title="Royalties & Payouts" subtitle="Earn a percentage of every secondary sale on Zenkaihood.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label mt-0" htmlFor="col-royalty">Creator Royalty</label>
                  <div className="flex">
                    <input id="col-royalty" value={royaltyText} onChange={(e) => setRoyaltyText(e.target.value)} inputMode="decimal" className="control min-w-0 flex-1 rounded-r-none" />
                    <span className="flex items-center rounded-r-md border border-l-0 border-border px-3 text-sm">%</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Maximum 10%. Applied to every resale.</p>
                </div>
                <div>
                  <label className="field-label mt-0" htmlFor="col-payout">Payout Wallet</label>
                  <input
                    id="col-payout"
                    value={payout}
                    onChange={(e) => setPayout(e.target.value)}
                    placeholder={wallet ?? "0x0000…0000"}
                    className="control w-full font-mono"
                  />
                  {wallet && !payout && (
                    <button type="button" onClick={() => setPayout(wallet)} className="mt-1 text-[11px] text-primary hover:underline">
                      Use connected wallet
                    </button>
                  )}
                </div>
              </div>
            </Step>

            <div className="rounded-md border border-border">
              <Button variant="ghost" onClick={() => setAdvanced(!advanced)} className="h-14 w-full justify-between">
                <span className="flex items-center gap-3"><Settings />Advanced Options</span>
                <ChevronDown className={cn("transition-transform", advanced && "rotate-180")} />
              </Button>
              {advanced && (
                <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
                  <label className="text-xs">Website<input className="control mt-2 w-full" placeholder="https://" /></label>
                  <label className="text-xs">X / Twitter<input className="control mt-2 w-full" placeholder="@handle" /></label>
                  <label className="text-xs">Discord<input className="control mt-2 w-full" placeholder="discord.gg/…" /></label>
                  <label className="text-xs">Display theme<SelectBox placeholder="Padded" items={["Padded", "Contained", "Covered"]} /></label>
                </div>
              )}
            </div>

            {isSuccess && (
              <div className="mt-4 rounded-md bg-success/10 p-3 text-sm text-success">
                ✓ Collection registered successfully! It will appear in the marketplace once the subgraph indexes the transaction.
              </div>
            )}

            <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-md bg-muted p-3 sm:flex-row">
              <p className="text-[11px] text-muted-foreground">ⓘ Registering does not mint or transfer anything. Your contract stays entirely yours.</p>
              <Button
                className="min-w-40"
                onClick={handleRegister}
                disabled={!wallet || !isValidAddress || !payout || isPending || isConfirming || isRegistered === true}
              >
                {!wallet ? "Connect Wallet" : isPending ? "Confirm in wallet…" : isConfirming ? "Processing…" : "Register Collection"}
              </Button>
            </div>
          </section>

          <aside className="space-y-3">
            <div className="rounded-md border border-border bg-surface/95 p-5">
              <h2 className="font-display text-lg font-semibold">Collection Preview</h2>
              <div className="my-5 flex items-center gap-4">
                <img src={ronin} alt="Collection logo preview" className="size-20 rounded object-cover" />
                <div className="min-w-0">
                  <h3 className="truncate font-display font-semibold">{name || "Your Collection"} <Verified /></h3>
                  <p className="mt-1 text-xs text-muted-foreground">{royalty}% creator royalty</p>
                </div>
              </div>
              <div className="space-y-4 border-t border-border py-4 text-sm">
                <FeeLine label="Marketplace Fee" value="2.5%" />
                <FeeLine label="Your Royalty" value={`${royalty}%`} />
                <FeeLine label="Seller Receives" value={`${(100 - 2.5 - royalty).toFixed(2)}%`} strong />
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">ⓘ Percentages apply to each secondary sale of an item in this collection.</p>
            </div>

            <div className="rounded-md border border-border bg-surface/90 p-5">
              <h2 className="font-display text-lg font-semibold">Registration Status</h2>
              {[
                ["Contract", contract ? (isValidAddress ? "Valid ✓" : "Invalid address") : "Not set"],
                ["Already registered", isRegistered === undefined ? "Checking…" : isRegistered ? "Yes — already live" : "No — ready to register"],
                ["Ownership", "Verified on-chain at submission"],
                ["Visibility", isSuccess ? "Live" : "Draft"],
              ].map(([label, value]) => (
                <div key={label} className="mt-4 flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span><b>{value}</b>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </AccountShell>
  );
}

function FeeLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={cn("text-muted-foreground", strong && "font-semibold text-foreground")}>{label}</span>
      <b className={cn(strong && "font-display text-base")}>{value}</b>
    </div>
  );
}

function UploadBox({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" className={cn("grid w-full place-items-center gap-1 rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary", className)}>
      <ImagePlus className="size-5" />
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

function Step({ number, title, optional, subtitle, children }: { number: string; title: string; optional?: boolean; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="font-display text-xl font-semibold">
        {number} {title} {optional && <small className="font-body text-sm font-normal">(Optional)</small>}
      </h2>
      <p className="mb-3 ml-5 mt-1 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}
