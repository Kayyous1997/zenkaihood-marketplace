import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown, Globe, ImagePlus, MessageCircle,
  Send, Settings, Twitter, Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChainId, useReadContract, useSignMessage, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AccountShell, InkHero, SelectBox, Verified } from "@/components/zenkai";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet";
import { useRegistry, useIsRegistered } from "@/hooks/useRegistry";
import { useSaveCollectionMeta } from "@/hooks/useCollectionMeta";
import { parseContractError } from "@/lib/contract-errors";
import { signInWithWallet, uploadCollectionImage, useSupabaseSession, isSupabaseConfigured } from "@/lib/supabase";
import { txUrl } from "@/lib/basescan";
import { isSupportedChainId, robinhoodTestnet, SUPPORTED_CHAINS } from "@/lib/chains";
import { BaseIcon, RobinhoodIcon } from "@/components/chain-icons";
import { CategorySelector } from "@/components/category-selector";
import { useMarketplaceConfig } from "@/hooks/useMarketplaceConfig";

function normalizeCollectionMetadataUri(value: string) {
  const uri = value.trim();
  if (/^(Qm|bafy)[^\s/]+(?:\/.*)?$/i.test(uri)) return `ipfs://${uri}`;
  return uri;
}

export const Route = createFileRoute("/create")({
  head: () => ({ meta: [
    { title: "Register a Collection —" },
    { name: "description", content: "Register your NFT collection on Zenkaihood to enable secondary sales, set royalties and payout details." },
    { property: "og:title", content: "Register a Collection" },
    { property: "og:description", content: "Set up your collection for secondary trading on Zenkaihood." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}), component: RegisterCollectionPage,
});

function RegisterCollectionPage() {
  const { wallet, address } = useWallet();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { session, signOut } = useSupabaseSession();
  const { signMessageAsync } = useSignMessage();

  // ─── Form state ───────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [collectionMetadataUri, setCollectionMetadataUri] = useState("");
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);
  const [contract, setContract] = useState("");
  const [royaltyText, setRoyaltyText] = useState("5");
  const [payout, setPayout] = useState("");
  const [tokenStandard, setTokenStandard] = useState<"ERC-721" | "ERC-1155">("ERC-721");
  const [advanced, setAdvanced] = useState(false);

  // Socials
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [discord, setDiscord] = useState("");
  const [telegram, setTelegram] = useState("");

  // Image files + preview object URLs
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Status
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const royalty = Math.min(Math.max(Number(royaltyText) || 0, 0), 10);
  const royaltyBps = Math.round(royalty * 100);
  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(contract);

  const { data: isRegistered } = useIsRegistered(
    isValidAddress ? (contract as `0x${string}`) : undefined
  );

  const { data: contractOwner, isLoading: isCheckingOwner } = useReadContract({
    address: isValidAddress ? (contract as `0x${string}`) : undefined,
    abi: [{ type: "function", name: "owner", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }] as const,
    functionName: "owner",
    query: { enabled: isValidAddress && isSupportedChainId(chainId) },
  });

  const { registerCollection, setMetadataURI, hash: txHash, isPending, isConfirming, isSuccess, reset } = useRegistry();
  const { mutateAsync: saveCollectionMeta } = useSaveCollectionMeta();

  // Save Supabase metadata after on-chain tx is confirmed
  const [pendingMeta, setPendingMeta] = useState<null | {
    logoUrl: string | null; bannerUrl: string | null; metadataURI: string;
  }>(null);
  const [metadataTxStarted, setMetadataTxStarted] = useState(false);

  useEffect(() => {
    reset();
    setPendingMeta(null);
    setMetadataTxStarted(false);
  }, [contract, payout, tokenStandard, royaltyBps, reset]);

  useEffect(() => {
    if (isSuccess && pendingMeta && !metadataTxStarted) {
      setMetadataTxStarted(true);
      setMetadataURI(contract as `0x${string}`, pendingMeta.metadataURI).catch(() => {
        setMetadataTxStarted(false);
        setIsSubmitting(false);
      });
      return;
    }
    if (isSuccess && pendingMeta && isSupabaseConfigured && session && address) {
      saveCollectionMeta({
        contract_address: contract,
        wallet_address: address.toLowerCase(),
        name: name || null,
        description: description || null,
        logo_url: pendingMeta.logoUrl,
        banner_url: pendingMeta.bannerUrl,
        website_url: website || null,
        twitter_handle: twitter || null,
        discord_url: discord || null,
        telegram_url: telegram || null,
        categories: selectedCategories.length > 0 ? selectedCategories : null,
        chain_id: chainId,
      }).then(() => {
        setPendingMeta(null);
        setIsSubmitting(false);
        toast.success("Collection registered & metadata saved!", { id: "register" });
      }).catch((err: unknown) => {
        setPendingMeta(null);
        setIsSubmitting(false);
        toast.error(err instanceof Error ? err.message : "Metadata save failed.", { id: "register" });
      });
    } else if (isSuccess && pendingMeta && !isSupabaseConfigured) {
      setPendingMeta(null);
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  // ─── Image pick handlers ──────────────────────────────────────────────────
  function handleImagePick(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (url: string | null) => void,
  ) {
    const file = e.target.files?.[0] ?? null;
    setFile(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  }

  // ─── Wallet sign-in ───────────────────────────────────────────────────────
  async function handleSignIn() {
    if (!address) { toast.error("Connect your wallet first."); return; }
    setIsSigningIn(true);
    try {
      await signInWithWallet(address, signMessageAsync);
      toast.success("Signed in with wallet!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleRegister() {
    if (!address) { toast.error("Connect your wallet first."); return; }
    if (!isSupportedChainId(chainId)) { toast.error("Switch to Base Sepolia or Robinhood Testnet."); return; }
    if (!isValidAddress) { toast.error("Enter a valid contract address."); return; }
    if (isCheckingOwner) { toast.error("Still checking contract ownership."); return; }
    if (!contractOwner || contractOwner.toLowerCase() !== address.toLowerCase()) { toast.error("Connected wallet is not the NFT contract owner."); return; }
    if (!payout || !/^0x[0-9a-fA-F]{40}$/.test(payout)) { toast.error("Enter a valid payout wallet address."); return; }
    const metadataInput = collectionMetadataUri.trim();
    if (!metadataInput || !(/^(ipfs:\/\/|https?:\/\/|Qm|bafy)/i.test(metadataInput))) {
      toast.error("Enter the collection metadata IPFS CID or URL."); return;
    }
    if (isRegistered) { toast.error("This collection is already registered."); return; }
    if (isSupabaseConfigured && !session) { toast.error("Sign in with your wallet first to save collection metadata."); return; }

    setIsSubmitting(true);

    try {
      // 1. Upload images to Supabase Storage first (before on-chain tx)
      let logoUrl: string | null = null;
      let bannerUrl: string | null = null;

      if (isSupabaseConfigured && session) {
        if (logoFile) {
          toast.loading("Uploading logo…", { id: "upload" });
          logoUrl = await uploadCollectionImage(contract, "logo", logoFile);
          toast.dismiss("upload");
        }
        if (bannerFile) {
          toast.loading("Uploading banner…", { id: "upload" });
          bannerUrl = await uploadCollectionImage(contract, "banner", bannerFile);
          toast.dismiss("upload");
        }
      }

      // Store meta for the useEffect to pick up after isSuccess fires
      // The collection metadata itself is supplied by the creator. Logo/banner
      // uploads remain separate Supabase assets and are not used as this URI.
      const metadataURI = normalizeCollectionMetadataUri(metadataInput);
      setPendingMeta({ logoUrl, bannerUrl, metadataURI });

      // 2. Submit the on-chain tx — useRegistry handles its own toasts internally
      await registerCollection(
        contract as `0x${string}`,
        tokenStandard === "ERC-721" ? 0 : 1,
        payout as `0x${string}`,
        royaltyBps,
      );
      // isSubmitting stays true until useEffect fires on isSuccess
    } catch (err) {
      setPendingMeta(null);
      setIsSubmitting(false);
      toast.error(parseContractError(err), { id: "register" });
    }
  }

  async function handleUpdateMetadata() {
    if (!address) { toast.error("Connect your wallet first."); return; }
    if (!isSupportedChainId(chainId)) { toast.error("Switch to Base Sepolia or Robinhood Testnet."); return; }
    if (!isValidAddress || isRegistered !== true) { toast.error("Enter a registered collection contract."); return; }
    const metadataInput = collectionMetadataUri.trim();
    if (!metadataInput || !(/^(ipfs:\/\/|https?:\/\/|Qm|bafy)/i.test(metadataInput))) {
      toast.error("Enter the collection metadata IPFS CID or URL."); return;
    }
    setIsUpdatingMetadata(true);
    try {
      await setMetadataURI(contract as `0x${string}`, normalizeCollectionMetadataUri(metadataInput));
      toast.success("Metadata update submitted.", { id: "metadata-update" });
      setCollectionMetadataUri("");
    } catch (err) {
      toast.error(parseContractError(err), { id: "metadata-update" });
    } finally {
      setIsUpdatingMetadata(false);
    }
  }


  const needsSignIn = isSupabaseConfigured && !session;
  const isWorking = isPending || isConfirming || isSubmitting;
  const ownsContract = !!address && !!contractOwner && contractOwner.toLowerCase() === address.toLowerCase();
  const canSubmit = !!(address && isSupportedChainId(chainId) && isValidAddress && ownsContract && payout && collectionMetadataUri.trim() && !isRegistered && !isWorking && !needsSignIn);

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

            {/* Step 1 — Artwork */}
            <Step number="1." title="Collection Artwork" subtitle="Upload a logo and a banner. Recommended 350×350 and 1500×500.">
              {/* Hidden file inputs */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImagePick(e, setLogoFile, setLogoPreview)}
              />
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImagePick(e, setBannerFile, setBannerPreview)}
              />
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                {/* Logo */}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="relative size-28 overflow-hidden rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="size-full object-cover" />
                  ) : (
                    <span className="grid place-items-center gap-1">
                      <ImagePlus className="size-5" />
                      <span className="text-[11px]">Logo</span>
                    </span>
                  )}
                </button>
                {/* Banner */}
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="relative h-28 overflow-hidden rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner preview" className="size-full object-cover" />
                  ) : (
                    <span className="grid place-items-center gap-1">
                      <ImagePlus className="size-5" />
                      <span className="text-[11px]">Banner (1400×400)</span>
                    </span>
                  )}
                </button>
              </div>
              {!isSupabaseConfigured && (
                <p className="mt-2 text-[11px] text-amber-500">⚠ Supabase not configured — images will not be saved. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.</p>
              )}
            </Step>

            {/* Step 2 — Details */}
            <Step number="2." title="Collection Details" subtitle="How your collection appears across the marketplace.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label mt-0" htmlFor="col-name">Collection Name</label>
                  <input id="col-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Ronin" className="control w-full" />
                </div>
                <div>
                  <label className="field-label mt-0" htmlFor="col-standard">Token Standard</label>
                  <SelectBox
                    placeholder={tokenStandard}
                    items={["ERC-721", "ERC-1155"]}
                    onSelect={(v) => setTokenStandard(v as "ERC-721" | "ERC-1155")}
                  />
                </div>
              </div>
              <label className="field-label" htmlFor="col-desc">Description</label>
              <textarea
                id="col-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell collectors the story behind your collection."
                className="control h-auto w-full py-2"
              />

              <div className="pt-2">
                <CategorySelector
                  selectedCategories={selectedCategories}
                  onChange={setSelectedCategories}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="col-metadata-uri">Collection Metadata IPFS CID or URL</label>
                <input
                  id="col-metadata-uri"
                  value={collectionMetadataUri}
                  onChange={(e) => setCollectionMetadataUri(e.target.value)}
                  placeholder="ipfs://Qm.../metadata.json or https://..."
                  className="control w-full font-mono text-xs"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  This is the collection metadata JSON URI stored on-chain. Logo and banner uploads above remain separate.
                </p>
              </div>
            </Step>

            {/* Step 3 — Contract */}
            <Step number="3." title="Contract" subtitle="Paste the deployed contract address. You must be the contract owner (IERC173 owner()) to register.">
              <input
                aria-label="Contract address"
                value={contract}
                onChange={(e) => setContract(e.target.value)}
                placeholder="0x0000…0000"
                className={cn("control w-full font-mono", isValidAddress && "border-success", contract && !isValidAddress && "border-destructive")}
              />
              {isValidAddress && isRegistered === true && (
                <p className="mt-2 text-[11px] text-amber-500">⚠ This collection is already registered. <Link to="/edit-collection" search={{ contract }} className="underline">Edit collection metadata</Link>.</p>
              )}
              {isValidAddress && isRegistered === false && (
                <p className="mt-2 text-[11px] text-success">✓ Contract found, not yet registered.</p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">Your wallet must be the owner of the NFT contract to register it. This is verified on-chain.</p>
            </Step>

            {/* Step 4 — Royalties */}
            <Step number="4." title="Royalties & Payouts" subtitle="Earn a percentage of every secondary sale on NexDrop.">
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
                    placeholder={address ?? "0x0000…0000"}
                    className="control w-full font-mono"
                  />
                  {wallet && !payout && (
                    <button type="button" onClick={() => setPayout(address ?? "")} className="mt-1 text-[11px] text-primary hover:underline">
                      Use connected wallet
                    </button>
                  )}
                </div>
              </div>
            </Step>

            {/* Advanced Options */}
            <div className="rounded-md border border-border">
              <Button variant="ghost" onClick={() => setAdvanced(!advanced)} className="h-14 w-full justify-between">
                <span className="flex items-center gap-3"><Settings />Advanced Options</span>
                <ChevronDown className={cn("transition-transform", advanced && "rotate-180")} />
              </Button>
              {advanced && (
                <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
                  <label className="text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Globe className="size-3" />Website</span>
                    <input className="control mt-1.5 w-full" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </label>
                  <label className="text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Twitter className="size-3" />X / Twitter</span>
                    <input className="control mt-1.5 w-full" placeholder="@handle" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
                  </label>
                  <label className="text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><MessageCircle className="size-3" />Discord</span>
                    <input className="control mt-1.5 w-full" placeholder="discord.gg/…" value={discord} onChange={(e) => setDiscord(e.target.value)} />
                  </label>
                  <label className="text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Send className="size-3" />Telegram</span>
                    <input className="control mt-1.5 w-full" placeholder="t.me/…" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
                  </label>
                </div>
              )}
            </div>

            {/* Supabase wallet sign-in gate */}
            {isSupabaseConfigured && wallet && !session && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  <Wallet className="mr-1 inline size-3" />
                  Sign in with your wallet to save your collection logo, banner and socials off-chain.
                </p>
                <Button size="sm" variant="outline" onClick={handleSignIn} disabled={isSigningIn} className="shrink-0">
                  {isSigningIn ? "Signing…" : "Sign in with Wallet"}
                </Button>
              </div>
            )}
            {isSupabaseConfigured && session && (
              <p className="mt-3 text-[11px] text-success">
                ✓ Signed in as {session.user.email?.split("@")[0]}…{" "}
                <button type="button" onClick={signOut} className="underline underline-offset-2 hover:opacity-70">Sign out</button>
              </p>
            )}

            {/* Success banner */}
            {isSuccess && (
              <div className="mt-4 rounded-md bg-success/10 p-3 text-sm text-success">
                ✓ Collection registered! It will appear in the marketplace once the subgraph indexes the transaction.
                {txHash && (
                  <a href={txUrl(txHash, chainId)} target="_blank" rel="noreferrer" className="ml-2 underline underline-offset-2 hover:opacity-80">
                    View on Explorer ↗
                  </a>
                )}
              </div>
            )}

            {/* Submit row */}
            {address && !isSupportedChainId(chainId) && (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600">
                <span>Please switch to a supported network (Base Sepolia or Robinhood Testnet).</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => switchChain({ chainId: baseSepolia.id })} disabled={isSwitching}>
                    <BaseIcon className="size-4" />
                    Base Sepolia
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => switchChain({ chainId: robinhoodTestnet.id })} disabled={isSwitching}>
                    <RobinhoodIcon className="size-4" />
                    Robinhood Testnet
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-md bg-muted p-3 sm:flex-row">
              <p className="text-[11px] text-muted-foreground">ⓘ Registering does not mint or transfer anything. Your contract stays entirely yours.</p>
              <Button
                className="min-w-44"
                onClick={handleRegister}
                disabled={!canSubmit}
              >
                {!wallet
                  ? "Connect Wallet"
                  : needsSignIn
                  ? "Sign in Required"
                  : isPending
                  ? "Confirm in wallet…"
                  : isConfirming
                  ? "Processing…"
                  : isSubmitting
                  ? "Saving metadata…"
                  : "Register Collection"}
              </Button>
            </div>
          </section>

          {/* ─── Preview sidebar ─── */}
          <aside className="space-y-3">
            <CollectionPreview
              name={name}
              description={description}
              royalty={royalty}
              logoPreview={logoPreview}
              bannerPreview={bannerPreview}
              website={website}
              twitter={twitter}
              discord={discord}
              telegram={telegram}
            />

            <div className="rounded-md border border-border bg-surface/90 p-5">
              <h2 className="font-display text-lg font-semibold">Registration Status</h2>
              {[
                ["Contract", contract ? (isValidAddress ? "Valid ✓" : "Invalid address") : "Not set"],
                ["Already registered", isRegistered === undefined ? "Checking…" : isRegistered ? "Yes — already live" : "No — ready to register"],
                ["Ownership", isCheckingOwner ? "Checking…" : ownsContract ? "Verified ✓" : "Not verified"],
                ["Off-chain metadata", !isSupabaseConfigured ? "Not configured" : session ? "Ready ✓" : "Sign in required"],
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

// ─── Collection Preview ───────────────────────────────────────────────────────

function CollectionPreview({
  name, description, royalty,
  logoPreview, bannerPreview,
  website, twitter, discord, telegram,
}: {
  name: string; description: string; royalty: number;
  logoPreview: string | null; bannerPreview: string | null;
  website: string; twitter: string; discord: string; telegram: string;
}) {
  const { platformFeePercent, platformFeeFraction } = useMarketplaceConfig();
  const feePercentNum = platformFeeFraction * 100;
  const sellerReceives = Math.max(0, 100 - feePercentNum - royalty);
  const hasSocials = website || twitter || discord || telegram;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface/95">
      {/* Banner */}
      <div className="relative h-24 bg-muted">
        {bannerPreview && (
          <img src={bannerPreview} alt="Banner" className="size-full object-cover" />
        )}
        {/* Logo overlapping banner */}
        <div className="absolute -bottom-8 left-4">
          <div className="size-16 overflow-hidden rounded-lg border-4 border-surface bg-muted shadow-art">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="size-full object-cover" />
            ) : (
              <div className="size-full grid place-items-center text-muted-foreground">
                <ImagePlus className="size-5" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pb-4 pt-10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold">
              {name || "Your Collection"} <Verified />
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <FeeLine label="Marketplace Fee" value={platformFeePercent} />
          <FeeLine label="Your Royalty" value={`${royalty}%`} />
          <FeeLine label="Seller Receives" value={`${sellerReceives.toFixed(2).replace(/\.?0+$/, "")}%`} strong />
        </div>

        {hasSocials && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            {website && (
              <a href={website} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Website">
                <Globe className="size-4" />
              </a>
            )}
            {twitter && (
              <a href={`https://x.com/${twitter.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Twitter / X">
                <Twitter className="size-4" />
              </a>
            )}
            {discord && (
              <a href={discord.startsWith("http") ? discord : `https://${discord}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Discord">
                <MessageCircle className="size-4" />
              </a>
            )}
            {telegram && (
              <a href={telegram.startsWith("http") ? telegram : `https://${telegram}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Telegram">
                <Send className="size-4" />
              </a>
            )}
          </div>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          ⓘ Percentages apply to each secondary sale of an item in this collection.
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FeeLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={cn("text-muted-foreground", strong && "font-semibold text-foreground")}>{label}</span>
      <b className={cn(strong && "font-display text-base")}>{value}</b>
    </div>
  );
}

function Step({ number, title, optional, subtitle, children }: {
  number: string; title: string; optional?: boolean; subtitle: string; children: React.ReactNode;
}) {
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
