import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Lock,
  Unlock,
  Coins,
  Wallet,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  RefreshCw,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  BadgeCheck,
  Tag,
  Gavel,
  SlidersHorizontal,
  Plus,
  Pencil,
  Copy,
  Check,
  Globe,
  Radio,
  Clock,
  TrendingUp,
  FileCode2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { isAddress, formatEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shell, Tabs, Verified } from "@/components/zenkai";
import { useWallet } from "@/lib/wallet";
import { useAdmin, DEFAULT_ADMIN_ROLE, VERIFIER_ROLE, PAUSER_ROLE } from "@/hooks/useAdmin";
import { gqlClient } from "@/indexer/client";
import {
  GET_COLLECTIONS,
  GET_ACTIVE_LISTINGS,
  GET_ACTIVE_AUCTIONS,
  GET_SALES,
  type CollectionsResult,
  type ActiveListingsResult,
  type ActiveAuctionsResult,
  type SalesResult,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS, unixNowSeconds } from "@/indexer/events";
import { useCollectionsMeta } from "@/hooks/useCollectionsMeta";
import { formatBps, formatEth, formatEthCompact } from "@/lib/token-format";
import { txUrl } from "@/lib/basescan";
import { ADDRESSES } from "@/contracts/addresses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal & Governance — NexDrop" },
      { name: "description", content: "Protocol governance, verification, and marketplace administration for NexDrop." },
    ],
  }),
  component: AdminPage,
});

const ADMIN_TABS = [
  ["Collections & Verification"],
  ["Marketplace & Fees"],
  ["Circuit Breakers"],
  ["Roles & Governance"],
  ["Market Oversight"],
  ["Deployments & Matrix"],
] as const;

function safeFormatEth(rawWei: string | bigint | null | undefined): string {
  if (!rawWei) return "0 ETH";
  try {
    const b = typeof rawWei === "bigint" ? rawWei : BigInt(rawWei);
    return `${Number(formatEther(b)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH`;
  } catch {
    return "0 ETH";
  }
}

function safeFormatDate(rawTimestamp: string | number | null | undefined): string {
  if (!rawTimestamp) return "—";
  try {
    const sec = Number(rawTimestamp);
    if (isNaN(sec) || sec <= 0) return "—";
    return new Date(sec * 1000).toLocaleDateString();
  } catch {
    return "—";
  }
}

function safeFormatTime(rawTimestamp: string | number | null | undefined): string {
  if (!rawTimestamp) return "—";
  try {
    const sec = Number(rawTimestamp);
    if (isNaN(sec) || sec <= 0) return "—";
    return new Date(sec * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function AdminPage() {
  const { wallet, address, isConnected, connected, ready, chainName } = useWallet();
  const admin = useAdmin();
  const [activeTab, setActiveTab] = useState("Collections & Verification");
  const [previewMode, setPreviewMode] = useState(false);

  // ─── Query 1: Collections ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<"all" | "verified" | "unverified" | "721" | "1155">("all");
  const { data: collectionsData, isLoading: collectionsLoading, refetch: refetchCollections } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => gqlClient.request<CollectionsResult>(GET_COLLECTIONS, { first: 100, skip: 0 }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const rawCollections = collectionsData?.collections ?? [];
  const { data: metaMap } = useCollectionsMeta(rawCollections.map((c) => c.id.toLowerCase()));

  // ─── Query 2: Active Listings (Marketplace Oversight) ───────────────────────
  const { data: listingsData, isLoading: listingsLoading, refetch: refetchListings } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => gqlClient.request<ActiveListingsResult>(GET_ACTIVE_LISTINGS, { first: 50, skip: 0, now: unixNowSeconds() }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });
  const activeListings = listingsData?.listings ?? [];

  // ─── Query 3: Active Auctions ──────────────────────────────────────────────
  const { data: auctionsData, isLoading: auctionsLoading, refetch: refetchAuctions } = useQuery({
    queryKey: ["admin-auctions"],
    queryFn: () => gqlClient.request<ActiveAuctionsResult>(GET_ACTIVE_AUCTIONS, { first: 50, skip: 0 }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });
  const activeAuctions = auctionsData?.auctions ?? [];

  // ─── Query 4: Recent Sales ─────────────────────────────────────────────────
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ["admin-sales"],
    queryFn: () => gqlClient.request<SalesResult>(GET_SALES, { first: 50, skip: 0 }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });
  const sales = salesData?.sales ?? [];

  // Form states
  const [newFeeBps, setNewFeeBps] = useState(String(admin.platformFeeBps || ""));
  const [newRecipient, setNewRecipient] = useState(admin.feeRecipient || "");
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSupported, setTokenSupported] = useState(true);

  // Role Form
  const [roleAccount, setRoleAccount] = useState("");
  const [selectedRole, setSelectedRole] = useState<"VERIFIER" | "PAUSER" | "ADMIN">("VERIFIER");

  // Dialog State: Manual Registration
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [regContract, setRegContract] = useState("");
  const [regCreator, setRegCreator] = useState("");
  const [regStandard, setRegStandard] = useState<"0" | "1">("0");
  const [regRoyaltyRecipient, setRegRoyaltyRecipient] = useState("");
  const [regRoyaltyBps, setRegRoyaltyBps] = useState("500");

  // Dialog State: Edit Royalty
  const [royaltyDialogOpen, setRoyaltyDialogOpen] = useState(false);
  const [royaltyTargetContract, setRoyaltyTargetContract] = useState("");
  const [royaltyRecipientInput, setRoyaltyRecipientInput] = useState("");
  const [royaltyBpsInput, setRoyaltyBpsInput] = useState("500");

  // Dialog State: Edit Metadata URI
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [metaTargetContract, setMetaTargetContract] = useState("");
  const [metaUriInput, setMetaUriInput] = useState("");

  // Sync state when on-chain reads finish
  useEffect(() => {
    if (admin.platformFeeBps != null) {
      setNewFeeBps(String(admin.platformFeeBps));
    }
  }, [admin.platformFeeBps]);

  useEffect(() => {
    if (admin.feeRecipient) {
      setNewRecipient(admin.feeRecipient);
    }
  }, [admin.feeRecipient]);

  function refetchEverything() {
    admin.refetchAll();
    refetchCollections();
    refetchListings();
    refetchAuctions();
    refetchSales();
    toast.success("Protocol state refreshed");
  }

  // Calculated Protocol Metrics
  const totalVolumeWei = sales.reduce((acc, s) => {
    try {
      return acc + (s?.price ? BigInt(s.price) : 0n);
    } catch {
      return acc;
    }
  }, 0n);

  const totalRevenueWei = sales.reduce((acc, s) => {
    try {
      return acc + (s?.platformFee ? BigInt(s.platformFee) : 0n);
    } catch {
      return acc;
    }
  }, 0n);

  const totalRoyaltiesWei = sales.reduce((acc, s) => {
    try {
      return acc + (s?.royaltyAmount ? BigInt(s.royaltyAmount) : 0n);
    } catch {
      return acc;
    }
  }, 0n);

  const verifiedCount = rawCollections.filter((c) => c.verified).length;

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (!ready || (isConnected && admin.isLoading)) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl border border-primary/30 bg-primary/10 shadow-xl animate-pulse">
            <RefreshCw className="size-9 text-primary animate-spin" />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Verifying Protocol Permissions…</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Connecting to smart contracts and verifying on-chain roles on {chainName || "the network"}...
          </p>
        </div>
      </Shell>
    );
  }

  // ─── Disconnected State ───────────────────────────────────────────────────
  if (!isConnected || !address) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl border border-border bg-card shadow-xl">
            <Lock className="size-10 text-muted-foreground" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin Portal</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Please connect your administrator wallet to manage NexDrop smart contracts, collection verification, platform fees, and circuit breakers.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <ConnectButton />
            <Button asChild variant="outline" size="default">
              <Link to="/profile">Back to Profile</Link>
            </Button>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setPreviewMode(true)}
              className="text-xs"
            >
              Preview Panel (Read-Only)
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // ─── Unauthorized State (with Diagnostics and Preview option) ─────────────
  if (!admin.isAdmin && !previewMode) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl border border-destructive/30 bg-destructive/10 shadow-xl">
            <ShieldAlert className="size-10 text-destructive" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin Privileges Required</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            The connected wallet <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">{address}</span> is not registered with administrator roles on this network ({chainName || "Active Chain"}).
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-card/60 p-5 text-left text-xs space-y-3">
            <p className="font-semibold text-foreground">On-Chain Role Status:</p>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Marketplace Owner:</span>
                <span className={cn(admin.isMarketplaceOwner ? "text-emerald-500 font-bold" : "text-muted-foreground")}>
                  {admin.marketplaceOwner ? `${admin.marketplaceOwner.slice(0, 8)}…${admin.marketplaceOwner.slice(-6)}` : "None"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Registry Super Admin:</span>
                <span className={cn(admin.isRegistryAdmin ? "text-emerald-500 font-bold" : "text-destructive")}>
                  {admin.isRegistryAdmin ? "Granted" : "Not Assigned"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Registry Verifier:</span>
                <span className={cn(admin.isRegistryVerifier ? "text-emerald-500 font-bold" : "text-destructive")}>
                  {admin.isRegistryVerifier ? "Granted" : "Not Assigned"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registry Pauser:</span>
                <span className={cn(admin.isRegistryPauser ? "text-emerald-500 font-bold" : "text-destructive")}>
                  {admin.isRegistryPauser ? "Granted" : "Not Assigned"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <ConnectButton />
            <Button
              variant="default"
              onClick={() => setPreviewMode(true)}
              className="bg-primary text-primary-foreground text-xs shadow-md"
            >
              Explore Panel (Read-Only Preview)
            </Button>
            <Button asChild variant="outline">
              <Link to="/profile">Return to Profile</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // ─── Filter Collections ───────────────────────────────────────────────────
  const filteredCollections = rawCollections.filter((c) => {
    const meta = metaMap?.[c.id.toLowerCase()];
    const name = meta?.name || c.name || "";
    const query = search.toLowerCase();
    const matchesSearch =
      name.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.creator.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (collectionFilter === "verified") return c.verified;
    if (collectionFilter === "unverified") return !c.verified;
    if (collectionFilter === "721") return c.tokenStandard !== "ERC1155" && c.tokenStandard !== "1";
    if (collectionFilter === "1155") return c.tokenStandard === "ERC1155" || c.tokenStandard === "1";
    return true;
  });

  return (
    <Shell>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14">
        {/* Preview Mode Notification */}
        {previewMode && !admin.isAdmin && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-500">Read-Only Preview Mode Active</p>
                <p className="text-xs text-muted-foreground">
                  Your connected wallet (<span className="font-mono">{address || "Disconnected"}</span>) is not assigned admin roles on-chain. You can inspect all data and oversight tabs, but state-modifying contract transactions require an authorized admin wallet.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ConnectButton />
            </div>
          </div>
        )}

        {/* ─── Top Banner ──────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/20 px-3 py-0.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="size-3.5" /> Protocol Administration
                </span>
                {admin.isMarketplaceOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500">
                    <Sparkles className="size-3" /> Marketplace Owner
                  </span>
                )}
                {admin.isRegistryAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400">
                    Registry Super Admin
                  </span>
                )}
                {admin.isRegistryVerifier && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                    Verifier
                  </span>
                )}
                {admin.isRegistryPauser && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">
                    Pauser
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
                Admin Panel &amp; Governance
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                NexDrop Protocol Control Suite — Manage marketplace fees, emergency circuit breakers, collection verifications, and smart contract ownership.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ConnectButton />
              <Button
                variant="outline"
                size="sm"
                onClick={refetchEverything}
                className="gap-1.5 text-xs h-9"
              >
                <RefreshCw className="size-3.5" /> Refresh
              </Button>
              <Button asChild size="sm" variant="ghost" className="gap-1.5 text-xs h-9">
                <Link to="/profile">
                  Profile <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick Protocol Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 border-t border-border/60 pt-6 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <span className="text-emerald-400 font-medium">Protocol Revenue</span>
              <div className="mt-1 font-bold text-emerald-400 font-mono text-sm">
                {safeFormatEth(totalRevenueWei)}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <span className="text-muted-foreground">Market Volume</span>
              <div className="mt-1 font-semibold text-foreground font-mono">
                {safeFormatEth(totalVolumeWei)}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <span className="text-muted-foreground">Platform Fee</span>
              <div className="mt-1 font-semibold text-foreground">
                {(admin.platformFeeBps / 100).toFixed(2)}% ({admin.platformFeeBps} bps)
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <span className="text-muted-foreground">Creator Royalties</span>
              <div className="mt-1 font-semibold text-foreground font-mono">
                {safeFormatEth(totalRoyaltiesWei)}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <span className="text-muted-foreground">Marketplace State</span>
              <div className="mt-1 flex items-center gap-1.5 font-semibold">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    admin.marketplacePaused ? "bg-destructive animate-pulse" : "bg-emerald-500"
                  )}
                />
                {admin.marketplacePaused ? "PAUSED" : "ACTIVE"}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <span className="text-muted-foreground">Registry State</span>
              <div className="mt-1 flex items-center gap-1.5 font-semibold">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    admin.registryPaused ? "bg-destructive animate-pulse" : "bg-emerald-500"
                  )}
                />
                {admin.registryPaused ? "PAUSED" : "ACTIVE"}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/60 p-3">
              <span className="text-muted-foreground">Fee Recipient</span>
              <div className="mt-1 truncate font-mono font-semibold text-foreground" title={admin.feeRecipient || "—"}>
                {admin.feeRecipient
                  ? `${admin.feeRecipient.slice(0, 6)}…${admin.feeRecipient.slice(-4)}`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Owner Banner */}
        {admin.isPendingOwner && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-500">Ownership Transfer Pending</p>
                <p className="text-xs text-muted-foreground">
                  You have been nominated as the new owner of the NexDrop Marketplace contract.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => admin.acceptMarketplaceOwnership()}
              disabled={admin.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Claim Marketplace Ownership
            </Button>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="mt-8">
          <Tabs items={ADMIN_TABS as any} value={activeTab} onChange={setActiveTab} />
        </div>

        {/* ─── TAB 1: Collections & Verification ─────────────────────────────── */}
        {activeTab === "Collections & Verification" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">
                  Registered Collections ({rawCollections.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Grant verified checkmarks, update royalties, change metadata URIs, or register external contracts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => setRegDialogOpen(true)}
                  className="gap-1.5 text-xs shadow-sm bg-primary text-primary-foreground"
                >
                  <Plus className="size-3.5" /> Verifier Registration
                </Button>
                <div className="relative flex-1 sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, address..."
                    className="pl-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Sub-filters */}
            <div className="flex flex-wrap gap-2 text-xs">
              {(["all", "verified", "unverified", "721", "1155"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={collectionFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCollectionFilter(filter)}
                  className="h-7 px-3 text-xs capitalize"
                >
                  {filter === "721" ? "ERC-721" : filter === "1155" ? "ERC-1155" : filter}
                </Button>
              ))}
            </div>

            {/* Collections Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Collection</th>
                      <th className="px-4 py-3 font-semibold">Contract</th>
                      <th className="px-4 py-3 font-semibold">Creator</th>
                      <th className="px-4 py-3 font-semibold">Standard</th>
                      <th className="px-4 py-3 font-semibold">Royalty</th>
                      <th className="px-4 py-3 font-semibold text-center">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredCollections.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          {collectionsLoading
                            ? "Loading collections from subgraph…"
                            : "No collections match search query."}
                        </td>
                      </tr>
                    ) : (
                      filteredCollections.map((col) => {
                        const meta = metaMap?.[col.id.toLowerCase()];
                        const displayName = meta?.name || col.name || "Untitled Collection";
                        const isVerified = col.verified;
                        const isActive = col.active !== false;

                        return (
                          <tr key={col.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center gap-2.5">
                                {meta?.logo ? (
                                  <img
                                    src={meta.logo}
                                    alt=""
                                    className="size-8 rounded-lg object-cover border border-border"
                                  />
                                ) : (
                                  <div className="grid size-8 place-content-center rounded-lg bg-muted text-xs font-bold text-muted-foreground border border-border">
                                    {displayName.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <Link
                                    to="/collections/$slug"
                                    params={{ slug: col.id }}
                                    className="hover:underline flex items-center gap-1 font-semibold truncate max-w-[180px]"
                                  >
                                    {displayName}
                                    {isVerified && (
                                      <Verified className="size-3.5" />
                                    )}
                                  </Link>
                                  <span className="text-[10px] text-muted-foreground">
                                    {col.tokenCount || 0} items
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              <a
                                href={txUrl(col.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-foreground inline-flex items-center gap-1"
                              >
                                {col.id.slice(0, 6)}…{col.id.slice(-4)}
                                <ExternalLink className="size-3" />
                              </a>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {col.creator.slice(0, 6)}…{col.creator.slice(-4)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono">
                                {col.tokenStandard === "ERC1155" || col.tokenStandard === "1"
                                  ? "ERC-1155"
                                  : "ERC-721"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {formatBps(col.royaltyBps || 0)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    isVerified
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {isVerified ? "Verified" : "Unverified"}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    isActive
                                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                      : "bg-destructive/10 text-destructive border border-destructive/20"
                                  )}
                                >
                                  {isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  variant={isVerified ? "outline" : "default"}
                                  className={cn(
                                    "h-7 px-2.5 text-[11px] gap-1",
                                    !isVerified && "bg-primary text-primary-foreground"
                                  )}
                                  onClick={() =>
                                    admin.setCollectionVerified(
                                      col.id as `0x${string}`,
                                      !isVerified
                                    )
                                  }
                                  disabled={admin.isPending}
                                  title={isVerified ? "Revoke Verification Badge" : "Grant Verified Checkmark"}
                                >
                                  {isVerified ? (
                                    <>
                                      <XCircle className="size-3 text-destructive" /> Revoke
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="size-3" /> Verify
                                    </>
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => {
                                    setRoyaltyTargetContract(col.id);
                                    setRoyaltyRecipientInput(col.creator);
                                    setRoyaltyBpsInput(String(col.royaltyBps || 500));
                                    setRoyaltyDialogOpen(true);
                                  }}
                                  title="Edit Royalty"
                                >
                                  <Coins className="size-3 mr-1" /> Royalty
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => {
                                    setMetaTargetContract(col.id);
                                    setMetaUriInput(col.metadataURI || "");
                                    setMetaDialogOpen(true);
                                  }}
                                  title="Edit Metadata URI"
                                >
                                  <Pencil className="size-3 mr-1" /> URI
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                  onClick={() =>
                                    admin.setCollectionActive(col.id as `0x${string}`, !isActive)
                                  }
                                  disabled={admin.isPending}
                                >
                                  {isActive ? "Deactivate" : "Activate"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: Marketplace & Fees ───────────────────────────────────── */}
        {activeTab === "Marketplace & Fees" && (
          <div className="mt-6 space-y-6">
            {/* Financial Performance KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold text-emerald-400">Total Protocol Revenue</span>
                  <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Coins className="size-4" />
                  </div>
                </div>
                <div className="font-display text-2xl font-extrabold text-foreground font-mono">
                  {safeFormatEth(totalRevenueWei)}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cumulative 100% on-chain fees accrued from sales &amp; auctions
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold text-foreground">Gross Market Volume (GMV)</span>
                  <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="font-display text-2xl font-extrabold text-foreground font-mono">
                  {safeFormatEth(totalVolumeWei)}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Across {sales.length} settled marketplace transaction{sales.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold text-foreground">Creator Royalties Disbursed</span>
                  <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Sparkles className="size-4" />
                  </div>
                </div>
                <div className="font-display text-2xl font-extrabold text-foreground font-mono">
                  {safeFormatEth(totalRoyaltiesWei)}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Direct creator earnings disbursed seamlessly on-chain
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold text-foreground">Active Protocol Take Rate</span>
                  <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                    <BadgeCheck className="size-4" />
                  </div>
                </div>
                <div className="font-display text-2xl font-extrabold text-foreground">
                  {(admin.platformFeeBps / 100).toFixed(2)}%
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {admin.platformFeeBps} basis points (BPS)
                </p>
              </div>
            </div>

            {/* Protocol Fee Controls & Whitelist */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Fee Configuration */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="size-5 text-primary" />
                  <h3 className="font-display text-base font-bold">Platform Fee Take-Rate</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure the protocol take rate deducted on every secondary NFT sale and auction settlement. Max allowed on-chain is 1,000 bps (10.00%).
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="field-label mt-0" htmlFor="fee-bps">
                      Platform Fee (Basis Points)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="fee-bps"
                        type="number"
                        min="0"
                        max="1000"
                        placeholder="e.g. 250 for 2.5%"
                        value={newFeeBps}
                        onChange={(e) => setNewFeeBps(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => {
                          const bps = parseInt(newFeeBps, 10);
                          if (isNaN(bps) || bps < 0 || bps > 1000) {
                            toast.error("Fee must be between 0 and 1,000 bps (0% to 10%).");
                            return;
                          }
                          admin.setPlatformFeeBps(bps);
                        }}
                        disabled={admin.isPending}
                      >
                        Update Fee
                      </Button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Current: <b className="text-foreground">{admin.platformFeeBps} bps</b> (=
                      {(admin.platformFeeBps / 100).toFixed(2)}%)
                    </p>
                  </div>

                  {/* Live Preview Calculator */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground">Revenue Projection Preview:</p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>1.00 ETH Sale:</span>
                      <b className="font-mono text-foreground">
                        {((1 * (parseInt(newFeeBps, 10) || 0)) / 10000).toFixed(4)} ETH Protocol Fee
                      </b>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>10.00 ETH Sale:</span>
                      <b className="font-mono text-foreground">
                        {((10 * (parseInt(newFeeBps, 10) || 0)) / 10000).toFixed(4)} ETH Protocol Fee
                      </b>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <label className="field-label mt-0" htmlFor="fee-recipient">
                      Fee Recipient Address
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="fee-recipient"
                        placeholder="0x..."
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value.trim())}
                        className="font-mono text-xs"
                      />
                      <Button
                        onClick={() => {
                          if (!isAddress(newRecipient)) {
                            toast.error("Invalid Ethereum address.");
                            return;
                          }
                          admin.setFeeRecipient(newRecipient as `0x${string}`);
                        }}
                        disabled={admin.isPending}
                      >
                        Update Recipient
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Current Recipient:</span>
                      {admin.feeRecipient ? (
                        <a
                          href={txUrl(admin.feeRecipient)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {admin.feeRecipient} <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="font-mono">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Supported Payment Tokens & Anti-sniping */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-5 text-primary" />
                    <h3 className="font-display text-base font-bold">Payment Token Support</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Enable or disable custom ERC-20 payment tokens for listings and bids across the marketplace.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="field-label mt-0" htmlFor="token-address">
                        ERC-20 Token Contract Address
                      </label>
                      <Input
                        id="token-address"
                        placeholder="0x..."
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value.trim())}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tokenSupported}
                          onChange={(e) => setTokenSupported(e.target.checked)}
                          className="rounded border-border"
                        />
                        Enable Token Support
                      </label>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        if (!isAddress(tokenAddress)) {
                          toast.error("Invalid ERC-20 token address.");
                          return;
                        }
                        admin.setPaymentTokenSupported(tokenAddress as `0x${string}`, tokenSupported);
                      }}
                      disabled={admin.isPending}
                    >
                      Apply Token Configuration
                    </Button>
                  </div>
                </div>

                {/* Anti-Sniping Engine Specs */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-primary" />
                    <h4 className="font-display font-bold">Anti-Sniping Engine Parameters</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-muted-foreground block text-[10px]">Window</span>
                      <b className="font-mono">300s (5m)</b>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-muted-foreground block text-[10px]">Extension</span>
                      <b className="font-mono">300s (5m)</b>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <span className="text-muted-foreground block text-[10px]">Min Increment</span>
                      <b className="font-mono">500 bps (5%)</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Protocol Fee Revenue Ledger */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold">Protocol Revenue Inflows &amp; Fee Ledger</h3>
                  <p className="text-xs text-muted-foreground">
                    Live record of platform fees captured into protocol treasury from recent sales and settlements.
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  Total Captured: {safeFormatEth(totalRevenueWei)}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Tx / Sale</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Collection</th>
                        <th className="px-4 py-3 font-semibold">Gross Sale</th>
                        <th className="px-4 py-3 font-semibold text-emerald-500">Platform Fee Earned</th>
                        <th className="px-4 py-3 font-semibold">Creator Royalty</th>
                        <th className="px-4 py-3 font-semibold text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                            {salesLoading ? "Loading revenue records…" : "No fee-generating sales recorded yet."}
                          </td>
                        </tr>
                      ) : (
                        sales.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/10">
                            <td className="px-4 py-3 font-mono font-semibold">
                              {s.transactionHash ? (
                                <a
                                  href={txUrl(s.transactionHash)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  #{s.id.slice(0, 8)} <ExternalLink className="size-3" />
                                </a>
                              ) : (
                                `#{s.id}`
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono capitalize">
                                {s.type || (s.auction ? "Auction" : s.offer ? "Offer" : "Listing")}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {s.collection?.id ? `${s.collection.id.slice(0, 6)}…${s.collection.id.slice(-4)}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-foreground">
                              {safeFormatEth(s.price)}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-emerald-500 bg-emerald-500/5">
                              +{safeFormatEth(s.platformFee)}
                            </td>
                            <td className="px-4 py-3 font-mono text-amber-500">
                              {safeFormatEth(s.royaltyAmount)}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {safeFormatDate(s.timestamp)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: Circuit Breakers ─────────────────────────────────────── */}
        {activeTab === "Circuit Breakers" && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Marketplace Circuit Breaker */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="size-5 text-primary" />
                  <h3 className="font-display text-base font-bold">Marketplace Contract Pause</h3>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    admin.marketplacePaused
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "bg-emerald-500/20 text-emerald-500"
                  )}
                >
                  {admin.marketplacePaused ? "PAUSED" : "OPERATIONAL"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Emergency pause for the marketplace contract. Pausing halts all purchases, new listings, offers, auction bids, and sweeps. Existing user escrows remain safe on-chain.
              </p>

              <div className="pt-4 border-t border-border">
                {admin.marketplacePaused ? (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={() => admin.toggleMarketplacePause(false)}
                    disabled={admin.isPending}
                  >
                    <Unlock className="size-4" /> Unpause Marketplace Contract
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => admin.toggleMarketplacePause(true)}
                    disabled={admin.isPending}
                  >
                    <Lock className="size-4" /> Emergency Pause Marketplace
                  </Button>
                )}
              </div>
            </div>

            {/* Collection Registry Circuit Breaker */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="size-5 text-primary" />
                  <h3 className="font-display text-base font-bold">Collection Registry Pause</h3>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    admin.registryPaused
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "bg-emerald-500/20 text-emerald-500"
                  )}
                >
                  {admin.registryPaused ? "PAUSED" : "OPERATIONAL"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Emergency pause for the Collection Registry contract. Pausing prevents creators from registering new NFT collections or updating metadata until unpaused.
              </p>

              <div className="pt-4 border-t border-border">
                {admin.registryPaused ? (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={() => admin.toggleRegistryPause(false)}
                    disabled={admin.isPending}
                  >
                    <Unlock className="size-4" /> Unpause Collection Registry
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => admin.toggleRegistryPause(true)}
                    disabled={admin.isPending}
                  >
                    <Lock className="size-4" /> Emergency Pause Registry
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: Roles & Governance ───────────────────────────────────── */}
        {activeTab === "Roles & Governance" && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Marketplace Contract Ownership */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" />
                <h3 className="font-display text-base font-bold">Marketplace Contract Ownership</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                NexDrop Marketplace uses a 2-step Ownable2Step transfer process. The nominated address must execute `acceptOwnership()` to finalize.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Owner:</span>
                    <span className="font-mono font-semibold text-foreground truncate max-w-[200px]">
                      {admin.marketplaceOwner || "—"}
                    </span>
                  </div>
                  {admin.pendingOwner &&
                    admin.pendingOwner !== "0x0000000000000000000000000000000000000000" && (
                      <div className="flex justify-between text-amber-500">
                        <span>Pending Nominee:</span>
                        <span className="font-mono font-semibold truncate max-w-[200px]">
                          {admin.pendingOwner}
                        </span>
                      </div>
                    )}
                </div>

                {admin.isMarketplaceOwner && (
                  <div className="pt-2 border-t border-border">
                    <label className="field-label mt-0" htmlFor="new-owner">
                      Transfer Ownership to Address
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="new-owner"
                        placeholder="0x..."
                        value={newOwnerAddress}
                        onChange={(e) => setNewOwnerAddress(e.target.value.trim())}
                        className="font-mono text-xs"
                      />
                      <Button
                        onClick={() => {
                          if (!isAddress(newOwnerAddress)) {
                            toast.error("Invalid Ethereum address.");
                            return;
                          }
                          admin.transferMarketplaceOwnership(newOwnerAddress as `0x${string}`);
                        }}
                        disabled={admin.isPending}
                      >
                        Nominate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Collection Registry AccessControl Roles */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <UserCheck className="size-5 text-primary" />
                <h3 className="font-display text-base font-bold">Registry AccessControl Roles</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Grant or revoke specific permission roles (`VERIFIER_ROLE`, `PAUSER_ROLE`,
                `DEFAULT_ADMIN_ROLE`) on the Collection Registry contract.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="field-label mt-0">Target Account Address</label>
                  <Input
                    placeholder="0x..."
                    value={roleAccount}
                    onChange={(e) => setRoleAccount(e.target.value.trim())}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="field-label mt-0">Select Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="control w-full text-xs"
                  >
                    <option value="VERIFIER">
                      VERIFIER_ROLE (Collection Verification &amp; Verifier Registrations)
                    </option>
                    <option value="PAUSER">PAUSER_ROLE (Emergency Pause Registry)</option>
                    <option value="ADMIN">
                      DEFAULT_ADMIN_ROLE (Super Admin Role Management)
                    </option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (!isAddress(roleAccount)) {
                        toast.error("Invalid account address.");
                        return;
                      }
                      const roleHash =
                        selectedRole === "VERIFIER"
                          ? VERIFIER_ROLE
                          : selectedRole === "PAUSER"
                          ? PAUSER_ROLE
                          : DEFAULT_ADMIN_ROLE;
                      admin.grantRegistryRole(roleHash, roleAccount as `0x${string}`);
                    }}
                    disabled={admin.isPending}
                  >
                    Grant Role
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (!isAddress(roleAccount)) {
                        toast.error("Invalid account address.");
                        return;
                      }
                      const roleHash =
                        selectedRole === "VERIFIER"
                          ? VERIFIER_ROLE
                          : selectedRole === "PAUSER"
                          ? PAUSER_ROLE
                          : DEFAULT_ADMIN_ROLE;
                      admin.revokeRegistryRole(roleHash, roleAccount as `0x${string}`);
                    }}
                    disabled={admin.isPending}
                  >
                    Revoke Role
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: Market Oversight ─────────────────────────────────────── */}
        {activeTab === "Market Oversight" && (
          <div className="mt-6 space-y-8">
            {/* Active Listings Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-primary" />
                  <h3 className="font-display text-base font-bold">Active Listings ({activeListings.length})</h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">Live Subgraph Stream</span>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">Collection</th>
                        <th className="px-4 py-3 font-semibold">Token ID</th>
                        <th className="px-4 py-3 font-semibold">Seller</th>
                        <th className="px-4 py-3 font-semibold">Price</th>
                        <th className="px-4 py-3 font-semibold">Qty</th>
                        <th className="px-4 py-3 font-semibold text-right">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {activeListings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                            {listingsLoading ? "Loading listings…" : "No active listings found."}
                          </td>
                        </tr>
                      ) : (
                        activeListings.map((l) => (
                          <tr key={l.id} className="hover:bg-muted/10">
                            <td className="px-4 py-3 font-mono font-semibold">#{l.id}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {l.collection?.id
                                ? `${l.collection.id.slice(0, 6)}…${l.collection.id.slice(-4)}`
                                : "—"}
                            </td>
                            <td className="px-4 py-3 font-semibold">#{l.tokenId}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {l.seller ? `${l.seller.slice(0, 6)}…${l.seller.slice(-4)}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-primary">
                              {safeFormatEth(l.pricePerItem)}
                            </td>
                            <td className="px-4 py-3">{l.quantity || 1}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {safeFormatDate(l.endTime)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Live Auctions Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="size-4 text-amber-500" />
                  <h3 className="font-display text-base font-bold">Live Auctions ({activeAuctions.length})</h3>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Auction ID</th>
                        <th className="px-4 py-3 font-semibold">Collection</th>
                        <th className="px-4 py-3 font-semibold">Token</th>
                        <th className="px-4 py-3 font-semibold">Seller</th>
                        <th className="px-4 py-3 font-semibold">Reserve Price</th>
                        <th className="px-4 py-3 font-semibold">Highest Bid</th>
                        <th className="px-4 py-3 font-semibold">Top Bidder</th>
                        <th className="px-4 py-3 font-semibold text-right">Ends At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {activeAuctions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                            {auctionsLoading ? "Loading auctions…" : "No live auctions found."}
                          </td>
                        </tr>
                      ) : (
                        activeAuctions.map((a) => (
                          <tr key={a.id} className="hover:bg-muted/10">
                            <td className="px-4 py-3 font-mono font-semibold">#{a.id}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {a.collection?.id
                                ? `${a.collection.id.slice(0, 6)}…${a.collection.id.slice(-4)}`
                                : "—"}
                            </td>
                            <td className="px-4 py-3 font-semibold">#{a.tokenId}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {a.seller ? `${a.seller.slice(0, 6)}…${a.seller.slice(-4)}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {safeFormatEth(a.reservePrice)}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-amber-500">
                              {safeFormatEth(a.highestBid)}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {a.highestBidder
                                ? `${a.highestBidder.slice(0, 6)}…${a.highestBidder.slice(-4)}`
                                : "None"}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {safeFormatTime(a.endTime)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recent Protocol Sales Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-500" />
                  <h3 className="font-display text-base font-bold">Recent Protocol Sales ({sales.length})</h3>
                </div>
                <span className="text-xs font-semibold text-emerald-500">
                  Total Volume: {safeFormatEth(totalVolumeWei)}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Sale ID</th>
                        <th className="px-4 py-3 font-semibold">Collection</th>
                        <th className="px-4 py-3 font-semibold">Token</th>
                        <th className="px-4 py-3 font-semibold">Seller</th>
                        <th className="px-4 py-3 font-semibold">Buyer</th>
                        <th className="px-4 py-3 font-semibold">Price</th>
                        <th className="px-4 py-3 font-semibold">Platform Fee</th>
                        <th className="px-4 py-3 font-semibold text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                            {salesLoading ? "Loading sales…" : "No sales recorded yet."}
                          </td>
                        </tr>
                      ) : (
                        sales.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/10">
                            <td className="px-4 py-3 font-mono font-semibold">#{s.id}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {s.collection?.id
                                ? `${s.collection.id.slice(0, 6)}…${s.collection.id.slice(-4)}`
                                : "—"}
                            </td>
                            <td className="px-4 py-3 font-semibold">#{s.tokenId}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {s.seller ? `${s.seller.slice(0, 6)}…${s.seller.slice(-4)}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {s.buyer ? `${s.buyer.slice(0, 6)}…${s.buyer.slice(-4)}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-foreground">
                              {safeFormatEth(s.price)}
                            </td>
                            <td className="px-4 py-3 font-mono text-emerald-500">
                              {safeFormatEth(s.platformFee)}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {safeFormatDate(s.timestamp)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: Deployments & Matrix ─────────────────────────────────── */}
        {activeTab === "Deployments & Matrix" && (
          <div className="mt-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold">Smart Contract Deployments</h2>
              <p className="text-xs text-muted-foreground">
                Verified smart contracts deployed across Base Sepolia (84532) and Robinhood Testnet (46630).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Object.entries(ADDRESSES).map(([chainId, contracts]) => {
                const isBase = chainId === "84532";
                const netName = isBase ? "Base Sepolia (84532)" : "Robinhood Testnet (46630)";

                return (
                  <div key={chainId} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="size-5 text-primary" />
                        <h3 className="font-display text-base font-bold">{netName}</h3>
                      </div>
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                        EVM Verified
                      </span>
                    </div>

                    <div className="space-y-3 pt-2 text-xs">
                      {Object.entries(contracts).map(([key, contractAddr]) => (
                        <div key={key} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="capitalize font-medium text-foreground">{key}</span>
                            <a
                              href={txUrl(contractAddr as string)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                            >
                              Explorer <ExternalLink className="size-3" />
                            </a>
                          </div>
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="truncate max-w-[280px]">{contractAddr}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(contractAddr);
                                toast.success(`${key} address copied!`);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              title="Copy"
                            >
                              <Copy className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: Manual Verifier Registration ───────────────────────────── */}
      <Dialog open={regDialogOpen} onOpenChange={setRegDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Direct Verifier Registration</DialogTitle>
            <DialogDescription>
              Register an external ERC-721 or ERC-1155 smart contract on the Collection Registry using verifier credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="field-label mt-0">NFT Contract Address</label>
              <Input
                placeholder="0x..."
                value={regContract}
                onChange={(e) => setRegContract(e.target.value.trim())}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="field-label mt-0">Creator Address</label>
              <Input
                placeholder="0x..."
                value={regCreator}
                onChange={(e) => setRegCreator(e.target.value.trim())}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="field-label mt-0">Token Standard</label>
              <select
                value={regStandard}
                onChange={(e) => setRegStandard(e.target.value as any)}
                className="control w-full text-xs"
              >
                <option value="0">ERC-721 (Single Unique Editions)</option>
                <option value="1">ERC-1155 (Multi-token Semi-Fungible)</option>
              </select>
            </div>

            <div>
              <label className="field-label mt-0">Royalty Recipient Address</label>
              <Input
                placeholder="0x..."
                value={regRoyaltyRecipient}
                onChange={(e) => setRegRoyaltyRecipient(e.target.value.trim())}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="field-label mt-0">Royalty (Basis Points: 0 to 1,000)</label>
              <Input
                type="number"
                min="0"
                max="1000"
                value={regRoyaltyBps}
                onChange={(e) => setRegRoyaltyBps(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!isAddress(regContract) || !isAddress(regCreator) || !isAddress(regRoyaltyRecipient)) {
                  toast.error("Please provide valid Ethereum addresses.");
                  return;
                }
                const bps = parseInt(regRoyaltyBps, 10);
                if (isNaN(bps) || bps < 0 || bps > 1000) {
                  toast.error("Royalty Bps must be between 0 and 1000.");
                  return;
                }
                await admin.registerCollectionByVerifier(
                  regContract as `0x${string}`,
                  regCreator as `0x${string}`,
                  regStandard === "1" ? 1 : 0,
                  regRoyaltyRecipient as `0x${string}`,
                  bps
                );
                setRegDialogOpen(false);
                refetchCollections();
              }}
              disabled={admin.isPending}
            >
              Register Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Set Royalty Override ───────────────────────────────────── */}
      <Dialog open={royaltyDialogOpen} onOpenChange={setRoyaltyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Collection Royalty</DialogTitle>
            <DialogDescription>
              Set royalty recipient and basis points on-chain for collection{" "}
              <span className="font-mono text-xs text-foreground">{royaltyTargetContract.slice(0, 8)}…</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="field-label mt-0">Royalty Recipient Address</label>
              <Input
                placeholder="0x..."
                value={royaltyRecipientInput}
                onChange={(e) => setRoyaltyRecipientInput(e.target.value.trim())}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="field-label mt-0">Royalty Rate (Basis Points: 0 to 1,000)</label>
              <Input
                type="number"
                min="0"
                max="1000"
                value={royaltyBpsInput}
                onChange={(e) => setRoyaltyBpsInput(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                = {((parseInt(royaltyBpsInput, 10) || 0) / 100).toFixed(2)}% Royalty
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoyaltyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!isAddress(royaltyRecipientInput)) {
                  toast.error("Invalid recipient address.");
                  return;
                }
                const bps = parseInt(royaltyBpsInput, 10);
                if (isNaN(bps) || bps < 0 || bps > 1000) {
                  toast.error("Royalty must be between 0 and 1000 bps.");
                  return;
                }
                await admin.setRoyalty(royaltyTargetContract as `0x${string}`, royaltyRecipientInput as `0x${string}`, bps);
                setRoyaltyDialogOpen(false);
                refetchCollections();
              }}
              disabled={admin.isPending}
            >
              Save Royalty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: Set Metadata URI ───────────────────────────────────────── */}
      <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Set Metadata URI</DialogTitle>
            <DialogDescription>
              Update on-chain metadata URI (ipfs:// or https://) for collection{" "}
              <span className="font-mono text-xs text-foreground">{metaTargetContract.slice(0, 8)}…</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="field-label mt-0">Metadata URI</label>
              <Input
                placeholder="ipfs://Qm... or https://..."
                value={metaUriInput}
                onChange={(e) => setMetaUriInput(e.target.value.trim())}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!metaUriInput) {
                  toast.error("Metadata URI cannot be empty.");
                  return;
                }
                await admin.setMetadataURI(metaTargetContract as `0x${string}`, metaUriInput);
                setMetaDialogOpen(false);
                refetchCollections();
              }}
              disabled={admin.isPending}
            >
              Save Metadata URI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
