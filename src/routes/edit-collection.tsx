import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { baseSepolia } from "wagmi/chains";
import { useChainId, useSignMessage } from "wagmi";
import { isSupportedChainId } from "@/lib/chains";
import {
  ArrowLeft,
  Camera,
  Check,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Percent,
  ShieldCheck,
  Sparkles,
  Twitter,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountShell, PageHead, Tabs, Verified } from "@/components/zenkai";
import { useWallet } from "@/lib/wallet";
import { useCollectionMeta, useSaveCollectionMeta } from "@/hooks/useCollectionMeta";
import { useCollectionInfo, useRegistry } from "@/hooks/useRegistry";
import { isSupabaseConfigured, signInWithWallet, uploadCollectionImage, useSupabaseSession } from "@/lib/supabase";
import { parseContractError } from "@/lib/contract-errors";
import { formatBps } from "@/lib/token-format";
import { gqlClient } from "@/indexer/client";
import { GET_COLLECTIONS, type CollectionsResult } from "@/indexer/queries";
import { SLOW_REFETCH_MS } from "@/indexer/events";
import { CategorySelector } from "@/components/category-selector";

export const Route = createFileRoute("/edit-collection")({
  validateSearch: (search: Record<string, unknown>) => ({
    contract: typeof search["contract"] === "string" ? search["contract"] : "",
  }),
  component: EditCollectionPage,
});

function normalizeUri(value: string) {
  const uri = value.trim();
  return /^(Qm|bafy)[^\s/]+(?:\/.*)?$/i.test(uri) ? `ipfs://${uri}` : uri;
}

const EDIT_TABS = [["Details & Branding"], ["Creator Royalties"], ["Metadata URI"]] as const;

function EditCollectionPage() {
  const { contract = "" } = Route.useSearch();
  const navigate = useNavigate();
  const { address, wallet } = useWallet();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { session } = useSupabaseSession();
  const [activeTab, setActiveTab] = useState("Details & Branding");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isContractValid = typeof contract === "string" && /^0x[0-9a-fA-F]{40}$/.test(contract.trim());
  const validContractAddress = isContractValid ? (contract.trim() as `0x${string}`) : undefined;

  // Fetch all collections to provide fallback picker if no collection was selected
  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ["all-collections-edit"],
    queryFn: () => gqlClient.request<CollectionsResult>(GET_COLLECTIONS, { first: 100, skip: 0 }),
    refetchInterval: SLOW_REFETCH_MS,
  });

  const myCollections = (collectionsData?.collections ?? []).filter(
    (col) => address && (
      col.creator?.toLowerCase() === address.toLowerCase() ||
      (col.royaltyRecipient ? col.royaltyRecipient.toLowerCase() === address.toLowerCase() : false)
    )
  );

  const { data: meta, refetch: refetchMeta } = useCollectionMeta(validContractAddress);
  const { data: info, refetch: refetchInfo } = useCollectionInfo(validContractAddress);

  const { setMetadataURI, setRoyalty, isPending, isConfirming } = useRegistry();
  const { mutateAsync: saveMeta, isPending: savingMeta } = useSaveCollectionMeta();

  // Form states - Details & Branding
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Social & External Links
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");

  // Form states - On-Chain Royalties & URI
  const [royaltyBpsText, setRoyaltyBpsText] = useState("500");
  const [royaltyRecipientText, setRoyaltyRecipientText] = useState("");
  const [metadataUri, setMetadataUri] = useState("");

  // Extract on-chain info properties safely
  const onChainBps = info
    ? (typeof (info as any).royaltyBps !== "undefined"
        ? (info as any).royaltyBps
        : (info as any)[3] ?? 500)
    : 500;

  const onChainRecipient = info
    ? (typeof (info as any).royaltyRecipient !== "undefined"
        ? (info as any).royaltyRecipient
        : (info as any)[2] ?? "")
    : "";

  const onChainMetadataURI = info
    ? (typeof (info as any).metadataURI !== "undefined"
        ? (info as any).metadataURI
        : (info as any)[9] ?? "")
    : "";

  const onChainStandard = info
    ? (typeof (info as any).tokenStandard !== "undefined"
        ? (info as any).tokenStandard
        : (info as any)[4] ?? 0)
    : 0;

  const onChainVerified = info
    ? Boolean((info as any).verified ?? (info as any)[6])
    : false;

  // Populate form fields from loaded data
  useEffect(() => {
    if (meta) {
      setName(meta.name ?? "");
      setDescription(meta.description ?? "");
      setSelectedCategories(Array.isArray(meta.categories) ? meta.categories : []);
      setWebsiteUrl(meta.website_url ?? "");
      setTwitterHandle(meta.twitter_handle ?? "");
      setDiscordUrl(meta.discord_url ?? "");
      setTelegramUrl(meta.telegram_url ?? "");
    }
  }, [meta]);

  useEffect(() => {
    if (info) {
      if (onChainBps != null) setRoyaltyBpsText(String(onChainBps));
      if (onChainRecipient) setRoyaltyRecipientText(onChainRecipient);
      if (onChainMetadataURI) setMetadataUri(onChainMetadataURI);
    } else if (address) {
      setRoyaltyRecipientText(address);
    }
  }, [info, address, onChainBps, onChainRecipient, onChainMetadataURI]);

  // Current effective logo and banner for preview
  const currentLogo = logoPreview || meta?.logo_url || null;
  const currentBanner = bannerPreview || meta?.banner_url || null;

  async function handleSaveDetails() {
    if (!address || !isContractValid) return;

    setIsUploadingImages(true);
    let finalLogoUrl = meta?.logo_url ?? null;
    let finalBannerUrl = meta?.banner_url ?? null;

    try {
      if (isSupabaseConfigured) {
        if (!session) {
          toast.loading("Authenticating with wallet to save metadata…", { id: "save-details" });
          try {
            await signInWithWallet(address, signMessageAsync);
          } catch (authErr) {
            toast.error(authErr instanceof Error ? authErr.message : "Wallet sign-in failed.", { id: "save-details" });
            setIsUploadingImages(false);
            return;
          }
        }

        if (logoFile) {
          toast.loading("Uploading new logo image…", { id: "save-details" });
          finalLogoUrl = await uploadCollectionImage(contract, "logo", logoFile);
        }
        if (bannerFile) {
          toast.loading("Uploading new banner image…", { id: "save-details" });
          finalBannerUrl = await uploadCollectionImage(contract, "banner", bannerFile);
        }
      }

      toast.loading("Saving collection details…", { id: "save-details" });
      await saveMeta({
        contract_address: contract.toLowerCase(),
        wallet_address: address.toLowerCase(),
        name: name.trim() || null,
        description: description.trim() || null,
        logo_url: finalLogoUrl,
        banner_url: finalBannerUrl,
        website_url: websiteUrl.trim() || null,
        twitter_handle: twitterHandle.trim() || null,
        discord_url: discordUrl.trim() || null,
        telegram_url: telegramUrl.trim() || null,
        categories: selectedCategories.length > 0 ? selectedCategories : null,
      });

      setLogoFile(null);
      setBannerFile(null);

      toast.success("Collection details & branding updated successfully! 🎉", {
        id: "save-details",
        description: "Your new logo, banner, and collection details are now live on Zenkaihood.",
        duration: 4500,
      });

      void refetchMeta();
    } catch (err) {
      toast.error(parseContractError(err), { id: "save-details" });
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function handleUpdateRoyalty() {
    if (!isSupportedChainId(chainId) || !address || !isContractValid) return;
    const bps = parseInt(royaltyBpsText, 10);
    if (isNaN(bps) || bps < 0 || bps > 1000) {
      toast.error("Royalty must be between 0% and 10% (0–1000 bps).");
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(royaltyRecipientText)) {
      toast.error("Please enter a valid royalty recipient wallet address.");
      return;
    }
    try {
      await setRoyalty(contract as `0x${string}`, royaltyRecipientText as `0x${string}`, bps);
      toast.success("On-chain royalties updated successfully!");
      void refetchInfo();
    } catch (err) {
      toast.error(parseContractError(err));
    }
  }

  async function handleUpdateUri() {
    if (!isSupportedChainId(chainId) || !address || !isContractValid || !metadataUri.trim()) return;
    try {
      await setMetadataURI(contract as `0x${string}`, normalizeUri(metadataUri));
      toast.success("NFT metadata URI updated on-chain!");
      void refetchInfo();
    } catch (err) {
      toast.error(parseContractError(err));
    }
  }

  return (
    <AccountShell>
      <main className="page-section max-w-4xl mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs">
            <Link to="/profile">
              <ArrowLeft className="size-4" /> Back to Profile
            </Link>
          </Button>
          {isContractValid && (
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
              <Link to="/collections/$slug" params={{ slug: contract }}>
                <ExternalLink className="size-3.5" /> View Public Page
              </Link>
            </Button>
          )}
        </div>

        <PageHead
          eyebrow="OpenSea Studio Collection Editor"
          title="Edit Collection"
          description="Manage your collection's branding, display metadata, creator earnings, and smart contract settings."
        />

        {!isContractValid ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <Layers className="size-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-lg font-semibold">Select a Collection to Edit</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
              Choose one of your registered collections below to update its details, branding, and on-chain royalties.
            </p>

            {collectionsLoading ? (
              <div className="mt-6 flex justify-center">
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
              </div>
            ) : myCollections.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-xs text-muted-foreground">No registered collections found for your connected wallet.</p>
                <Button asChild size="sm">
                  <Link to="/create">Register New Collection</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {myCollections.map((col) => (
                  <Button
                    key={col.id}
                    variant="outline"
                    className="h-auto p-3.5 justify-start text-left flex items-center gap-3"
                    onClick={() => {
                      void navigate({
                        to: "/edit-collection",
                        search: { contract: col.id },
                      });
                    }}
                  >
                    <div className="size-8 rounded bg-primary/10 text-primary font-jp font-bold flex items-center justify-center shrink-0">
                      蔵
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold truncate">{col.id.slice(0, 6)}…{col.id.slice(-4)}</p>
                      <p className="text-[10px] text-muted-foreground">{col.tokenStandard} · {col.activeListingCount} listings</p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Header info badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 overflow-hidden rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-jp font-bold text-primary shrink-0">
                  {currentLogo ? (
                    <img src={currentLogo} alt="" className="size-full object-cover" />
                  ) : (
                    "蔵"
                  )}
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold">
                    {name || `${contract.slice(0, 6)}…${contract.slice(-4)}`} {onChainVerified && <Verified />}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">{contract}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Standard: <b className="text-foreground">{onChainStandard === 1 ? "ERC-1155" : "ERC-721"}</b></span>
                <span>Royalty: <b className="text-foreground">{formatBps(onChainBps)}</b></span>
              </div>
            </div>

            {/* Editing Navigation Tabs */}
            <Tabs items={EDIT_TABS} value={activeTab} onChange={setActiveTab} />

            {/* Tab 1: Details & Branding */}
            {activeTab === "Details & Branding" && (
              <section className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div>
                  <h3 className="font-display text-base font-semibold">Branding & Visuals</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload your collection logo avatar and cover banner. These represent your brand across the marketplace.
                  </p>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setLogoFile(file);
                    if (file) setLogoPreview(URL.createObjectURL(file));
                  }}
                />
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setBannerFile(file);
                    if (file) setBannerPreview(URL.createObjectURL(file));
                  }}
                />

                {/* OpenSea Studio Banner & Avatar Upload Box */}
                <div className="relative rounded-2xl border border-border bg-muted/20 overflow-hidden">
                  {/* Banner Upload Area */}
                  <div
                    onClick={() => bannerInputRef.current?.click()}
                    className="group relative h-48 w-full cursor-pointer overflow-hidden bg-muted/40 transition-colors hover:bg-muted/60"
                  >
                    {currentBanner ? (
                      <>
                        <img src={currentBanner} alt="Collection Banner" className="size-full object-cover" />
                        <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 text-white">
                          <Camera className="size-6" />
                          <span className="text-xs font-semibold">Change Banner (1400 × 400)</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors group-hover:text-primary">
                        <div className="grid size-12 place-content-center rounded-full bg-background/80 shadow-sm">
                          <ImagePlus className="size-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-foreground">Upload Collection Banner</p>
                          <p className="text-[11px] text-muted-foreground">1400 × 400px recommended (PNG, JPG, WEBP, GIF)</p>
                        </div>
                      </div>
                    )}

                    {bannerFile && (
                      <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow">
                        ● New banner ready
                      </span>
                    )}
                  </div>

                  {/* Logo Upload Area (Overlapping) */}
                  <div className="p-4 pt-0">
                    <div className="flex flex-wrap items-end gap-4 -mt-12 sm:-mt-14">
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        className="group relative size-24 sm:size-28 cursor-pointer overflow-hidden rounded-2xl border-4 border-card bg-card shadow-lg transition-transform hover:scale-[1.02]"
                      >
                        {currentLogo ? (
                          <>
                            <img src={currentLogo} alt="Collection Logo" className="size-full object-cover" />
                            <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-white">
                              <Camera className="size-5" />
                              <span className="text-[10px] font-semibold">Change</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex size-full flex-col items-center justify-center gap-1 bg-muted/60 text-muted-foreground transition-colors group-hover:text-primary">
                            <ImagePlus className="size-6" />
                            <span className="text-[10px] font-semibold">Logo</span>
                          </div>
                        )}

                        {logoFile && (
                          <span className="absolute bottom-1 right-1 size-3 rounded-full bg-primary ring-2 ring-card" />
                        )}
                      </div>

                      <div className="space-y-1 mb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <Camera className="size-3.5" />
                            {currentLogo ? "Change Logo" : "Upload Logo"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => bannerInputRef.current?.click()}
                          >
                            <Camera className="size-3.5" />
                            {currentBanner ? "Change Banner" : "Upload Banner"}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Logo: 350 × 350px square. Banner: 1400 × 400px wide.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {!isSupabaseConfigured && (
                  <p className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    ⚠ Supabase storage is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable image uploads.
                  </p>
                )}

                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="font-display text-sm font-semibold mb-1">Collection Details</h4>
                    <p className="text-xs text-muted-foreground mb-3">Update your collection display name, bio, and story.</p>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="col-name">Display Name</label>
                    <Input
                      id="col-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. The Ronin Origins"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="col-desc">Description (Bio & Story)</label>
                    <textarea
                      id="col-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Tell the story of your collection, vision, roadmap, and art..."
                      className="control h-auto w-full py-2.5 text-sm"
                    />
                  </div>

                  <div className="pt-2">
                    <CategorySelector
                      selectedCategories={selectedCategories}
                      onChange={setSelectedCategories}
                    />
                  </div>

                  <div className="pt-2">
                    <h4 className="font-display text-sm font-semibold mb-3">Social & External Links</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="field-label" htmlFor="col-web">Official Website</label>
                        <Input
                          id="col-web"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://yourproject.art"
                          className="h-10 text-sm"
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="col-x">Twitter / X Handle</label>
                        <Input
                          id="col-x"
                          value={twitterHandle}
                          onChange={(e) => setTwitterHandle(e.target.value)}
                          placeholder="@yourproject"
                          className="h-10 text-sm"
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="col-discord">Discord Invite URL</label>
                        <Input
                          id="col-discord"
                          value={discordUrl}
                          onChange={(e) => setDiscordUrl(e.target.value)}
                          placeholder="https://discord.gg/..."
                          className="h-10 text-sm"
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="col-telegram">Telegram Channel</label>
                        <Input
                          id="col-telegram"
                          value={telegramUrl}
                          onChange={(e) => setTelegramUrl(e.target.value)}
                          placeholder="https://t.me/..."
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button
                    onClick={handleSaveDetails}
                    disabled={savingMeta || isUploadingImages || !address}
                    className="gap-2"
                  >
                    {isUploadingImages ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Uploading Images…
                      </>
                    ) : savingMeta ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Saving Changes…
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" /> Save Details & Branding
                      </>
                    )}
                  </Button>
                </div>
              </section>
            )}

            {/* Tab 2: Creator Royalties */}
            {activeTab === "Creator Royalties" && (
              <section className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div>
                  <h3 className="font-display text-base font-semibold">Creator Earnings & Royalties</h3>
                  <p className="text-xs text-muted-foreground">
                    Set the on-chain percentage fee you receive on all secondary sales across the Zenkaihood Marketplace (max 10%).
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="field-label" htmlFor="royalty-bps">
                      Royalty Fee (in basis points, 100 = 1.0%, 500 = 5.0%, max 1000 = 10%)
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="royalty-bps"
                        type="number"
                        min="0"
                        max="1000"
                        value={royaltyBpsText}
                        onChange={(e) => setRoyaltyBpsText(e.target.value)}
                        className="h-10 w-48 text-sm"
                      />
                      <span className="text-sm font-semibold text-primary">
                        = {formatBps(parseInt(royaltyBpsText, 10) || 0)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="royalty-recipient">
                      Royalty Recipient Wallet Address
                    </label>
                    <Input
                      id="royalty-recipient"
                      value={royaltyRecipientText}
                      onChange={(e) => setRoyaltyRecipientText(e.target.value)}
                      placeholder="0x..."
                      className="h-10 text-sm font-mono"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      This address will automatically receive creator proceeds whenever an item in this collection sells.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button
                    onClick={handleUpdateRoyalty}
                    disabled={isPending || isConfirming || !address}
                    className="gap-2"
                  >
                    {isPending || isConfirming ? "Updating On-Chain…" : "Update Creator Royalties"}
                  </Button>
                </div>
              </section>
            )}

            {/* Tab 3: Metadata URI */}
            {activeTab === "Metadata URI" && (
              <section className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div>
                  <h3 className="font-display text-base font-semibold">NFT Metadata Source</h3>
                  <p className="text-xs text-muted-foreground">
                    Update the IPFS CID or metadata URL registered on the CollectionRegistry contract.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="field-label" htmlFor="metadata-uri">
                      Metadata URI (IPFS CID or HTTPS URL)
                    </label>
                    <Input
                      id="metadata-uri"
                      value={metadataUri}
                      onChange={(e) => setMetadataUri(e.target.value)}
                      placeholder="ipfs://Qm.../metadata.json or https://..."
                      className="h-10 text-sm font-mono"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      This URI is used to dynamically resolve token metadata, attributes, artwork, and traits.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button
                    onClick={handleUpdateUri}
                    disabled={isPending || isConfirming || !metadataUri.trim() || !address}
                    className="gap-2"
                  >
                    {isPending || isConfirming ? "Updating On-Chain…" : "Update Metadata URI"}
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </AccountShell>
  );
}
