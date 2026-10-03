import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Gavel,
  Grid2X2,
  List,
  Pencil,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Tag,
  Trophy,
  Twitter,
  WalletCards,
  Check,
  XCircle,
  AlertCircle,
  Flame,
  Coins,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import landscape from "@/assets/zenkai-landscape.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/lib/wallet";
import { useAdmin } from "@/hooks/useAdmin";
import { AccountShell, SelectBox, Tabs, Verified } from "@/components/zenkai";
import { CollectionPreviewCard } from "@/components/collection-preview-card";
import { BidDialog, SellDialog } from "@/components/dialogs";
import { IpfsImg } from "@/components/ipfs-img";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useCollectionsMeta } from "@/hooks/useCollectionsMeta";
import { useListing } from "@/hooks/useListing";
import { useAuction } from "@/hooks/useAuction";
import { useOffer } from "@/hooks/useOffer";
import { parseContractError } from "@/lib/contract-errors";
import { gqlClient } from "@/indexer/client";
import {
  GET_TOKENS_BY_OWNER,
  GET_ERC1155_BALANCES,
  GET_LISTINGS_BY_SELLER,
  GET_AUCTIONS_BY_SELLER,
  GET_BIDS_BY_BIDDER,
  GET_OFFERS_BY_USER,
  GET_USER_ACTIVITY,
  GET_COLLECTIONS,
  type TokensByOwnerResult,
  type Erc1155BalancesResult,
  type ListingsBySellerResult,
  type AuctionsBySellerResult,
  type BidsByBidderResult,
  type OffersByUserResult,
  type UserActivityResult,
  type CollectionsResult,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS, SLOW_REFETCH_MS } from "@/indexer/events";
import { useOwnedTokenFallback } from "@/hooks/useOwnedTokenFallback";
import { formatEth, formatEthCompact, formatBps } from "@/lib/token-format";
import { txUrl } from "@/lib/basescan";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "User Profile" },
      { name: "description", content: "View owned and created NFTs, active listings, auctions, bids and activity on Zenkaihood." },
      { property: "og:title", content: "User Profile" },
      { property: "og:description", content: "Collector profile with owned works, listings, auctions, bids, and activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const PROFILE_TABS = [["Collected"], ["Created"], ["Listed"], ["Auctions & Bids"], ["Offers"], ["Activity"]] as const;

function formatTimeLeft(endTime: string): string {
  const diff = Number(endTime) * 1000 - Date.now();
  if (diff <= 0) return "Expired";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

function ProfilePage() {
  const [tab, setTab] = useState("Collected");
  const [auctionSubTab, setAuctionSubTab] = useState<"All" | "My Auctions" | "My Bids">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { wallet, address, chainName } = useWallet();
  const admin = useAdmin();
  const { cancelListing, listingPending } = useListing();
  const { cancelAuction, settleAuction, isPending: auctionActionPending } = useAuction();
  const { cancelOffer, refundExpiredOffer, isPending: offerActionPending } = useOffer();
  const { data: fallbackData, isLoading: fallbackLoading } = useOwnedTokenFallback(address as `0x${string}` | undefined);

  const addrShort = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Not connected";

  // Query 1a: ERC-721 Tokens owned
  const { data: ownedData, isLoading: ownedLoading } = useQuery({
    queryKey: ["profile-owned", address],
    queryFn: () => gqlClient.request<TokensByOwnerResult>(GET_TOKENS_BY_OWNER, {
      owner: address as `0x${string}`,
      first: 50,
      skip: 0,
    }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Query 1b: ERC-1155 Tokens owned
  const { data: erc1155Data, isLoading: erc1155Loading } = useQuery({
    queryKey: ["profile-1155", address],
    queryFn: () =>
      gqlClient.request<Erc1155BalancesResult>(GET_ERC1155_BALANCES, {
        account: address as `0x${string}`,
        first: 50,
        skip: 0,
      }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Query 2: Listings created by seller
  const { data: listingsData, isLoading: listingsLoading, refetch: refetchListings } = useQuery({
    queryKey: ["profile-listings", address],
    queryFn: () => gqlClient.request<ListingsBySellerResult>(GET_LISTINGS_BY_SELLER, {
      seller: address as `0x${string}`,
      first: 50,
      skip: 0,
    }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Query 3: Auctions created by seller
  const { data: auctionsData, isLoading: auctionsLoading, refetch: refetchAuctions } = useQuery({
    queryKey: ["profile-auctions", address],
    queryFn: () => gqlClient.request<AuctionsBySellerResult>(GET_AUCTIONS_BY_SELLER, {
      seller: address as `0x${string}`,
      first: 50,
      skip: 0,
    }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Query 4: Bids placed by bidder
  const { data: bidsData, isLoading: bidsLoading, refetch: refetchBids } = useQuery({
    queryKey: ["profile-bids", address],
    queryFn: () => gqlClient.request<BidsByBidderResult>(GET_BIDS_BY_BIDDER, {
      bidder: address as `0x${string}`,
      first: 50,
      skip: 0,
    }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Query 5: Activity events
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["profile-activity", address],
    queryFn: () => gqlClient.request<UserActivityResult>(GET_USER_ACTIVITY, {
      account: address as `0x${string}`,
      first: 50,
      skip: 0,
    }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Query 6: Collections created/registered
  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ["profile-collections"],
    queryFn: () => gqlClient.request<CollectionsResult>(GET_COLLECTIONS, { first: 100, skip: 0 }),
    refetchInterval: SLOW_REFETCH_MS,
  });

  // Query 7: Offers made by user
  const { data: offersData, isLoading: offersLoading, refetch: refetchOffers } = useQuery({
    queryKey: ["profile-offers", address],
    queryFn: () => gqlClient.request<OffersByUserResult>(GET_OFFERS_BY_USER, {
      offerer: address as `0x${string}`,
      first: 50,
      skip: 0,
    }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const allCollections = collectionsData?.collections ?? [];

  // Filter collections created or registered by this wallet address
  const createdCollections = allCollections.filter(
    (col) => address && (
      col.creator?.toLowerCase() === address.toLowerCase() ||
      (col.royaltyRecipient ? col.royaltyRecipient.toLowerCase() === address.toLowerCase() : false)
    )
  );

  const { data: metaMap } = useCollectionsMeta(createdCollections.map((col) => col.id));

  const erc721Combined = [
    ...(ownedData?.tokens ?? []).map((t) => ({
      id: t.id,
      tokenId: t.tokenId,
      collection: { id: t.collection.id },
      tokenStandard: "ERC-721" as const,
    })),
    ...(fallbackData?.erc721 ?? [])
      .filter((fallback) => !(ownedData?.tokens ?? []).some((token) => token.id === fallback.id))
      .map((t) => ({
        id: t.id,
        tokenId: t.tokenId,
        collection: { id: t.collection.id },
        tokenStandard: "ERC-721" as const,
      })),
  ];

  const erc1155Combined = [
    ...(erc1155Data?.erc1155Balances ?? []).map((b) => ({
      id: b.id,
      tokenId: b.tokenId,
      collection: { id: b.collection.id },
      tokenStandard: "ERC-1155" as const,
    })),
    ...(fallbackData?.erc1155 ?? [])
      .filter((fallback) => !(erc1155Data?.erc1155Balances ?? []).some((b) => b.id === fallback.id))
      .map((b) => ({
        id: b.id,
        tokenId: b.tokenId,
        collection: { id: b.collection.id },
        tokenStandard: "ERC-1155" as const,
      })),
  ];

  const ownedTokens = [...erc721Combined, ...erc1155Combined];

  const listings = listingsData?.listings ?? [];
  const myAuctions = auctionsData?.auctions ?? [];
  const myBids = bidsData?.bids ?? [];
  const myOffers = offersData?.offers ?? [];
  const now = Math.floor(Date.now() / 1000);
  const activeListings = listings.filter((l) => l.active && !l.cancelled && Number(l.endTime) > now);
  const activeAuctions = myAuctions.filter((a) => a.active);
  const activity = activityData?.activities ?? [];

  const isLoading =
    tab === "Collected" ? ownedLoading || erc1155Loading || fallbackLoading :
    tab === "Created" ? collectionsLoading :
    tab === "Listed" ? listingsLoading :
    tab === "Auctions & Bids" ? auctionsLoading || bidsLoading :
    tab === "Offers" ? offersLoading : activityLoading;

  function handleCopyAddress() {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet);
    setCopied(true);
    toast.success("Wallet address copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareProfile() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Profile URL copied to clipboard!");
    }
  }

  async function handleCancelListing(listingId: string) {
    try {
      await cancelListing(BigInt(listingId));
      toast.success("Listing cancelled successfully.", { id: "cancel-listing" });
      void refetchListings();
    } catch (err) {
      toast.error(parseContractError(err), { id: "cancel-listing" });
    }
  }

  async function handleCancelAuction(auctionId: string) {
    try {
      await cancelAuction(BigInt(auctionId));
      toast.success("Auction cancelled successfully.", { id: "cancel-auction" });
      void refetchAuctions();
    } catch (err) {
      toast.error(parseContractError(err), { id: "cancel-auction" });
    }
  }

  async function handleSettleAuction(auctionId: string) {
    try {
      await settleAuction(BigInt(auctionId));
      toast.success("Auction settled successfully! Funds & NFT transferred.", { id: "settle-auction" });
      void refetchAuctions();
      void refetchBids();
    } catch (err) {
      toast.error(parseContractError(err), { id: "settle-auction" });
    }
  }

  async function handleCancelOffer(offerId: string) {
    try {
      await cancelOffer(BigInt(offerId));
      toast.success("Offer cancelled and escrowed funds refunded!", { id: "cancel-offer" });
      void refetchOffers();
    } catch (err) {
      toast.error(parseContractError(err), { id: "cancel-offer" });
    }
  }

  async function handleRefundExpiredOffer(offerId: string) {
    try {
      await refundExpiredOffer(BigInt(offerId));
      toast.success("Expired offer refunded to wallet!", { id: "refund-offer" });
      void refetchOffers();
    } catch (err) {
      toast.error(parseContractError(err), { id: "refund-offer" });
    }
  }

  // Filtered lists based on search bar
  const filteredOwned = ownedTokens.filter(
    (t) => !searchQuery || t.tokenId?.includes(searchQuery) || t.collection?.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredListings = activeListings.filter(
    (l) => !searchQuery || l.tokenId?.includes(searchQuery) || l.collection?.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCreated = createdCollections.filter(
    (c) => !searchQuery || c.id?.toLowerCase().includes(searchQuery.toLowerCase()) || metaMap?.[c.id]?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuctions = myAuctions.filter(
    (a) => !searchQuery || a.tokenId?.includes(searchQuery) || a.collection?.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBids = myBids.filter(
    (b) => !searchQuery || b.auction?.tokenId?.includes(searchQuery) || b.auction?.collection?.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOffers = myOffers.filter(
    (o) => !searchQuery || o.tokenId?.includes(searchQuery) || o.collection?.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AccountShell>
      <main className="min-h-screen pb-16">
        {/* OpenSea Banner & Profile Header */}
        <section className="relative">
          {/* Top Hero Cover Banner */}
          <div className="relative h-48 sm:h-64 lg:h-72 w-full overflow-hidden bg-muted">
            <img
              src={landscape}
              alt="Profile Cover Banner"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
          </div>

          {/* User Info Header Block */}
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-14">
            <div className="relative -mt-16 sm:-mt-20 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-border">
              {/* Avatar & Identifiers */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="relative size-24 sm:size-32 rounded-2xl border-4 border-background bg-card font-display text-4xl shadow-xl flex items-center justify-center overflow-hidden">
                  <span className="font-jp text-4xl font-bold text-primary">
                    {wallet ? wallet.slice(2, 4).toUpperCase() : "?"}
                  </span>
                </div>
                <div>
                  <h1 className="flex items-center gap-2 font-display text-2xl sm:text-3xl font-bold">
                    {addrShort} <Verified />
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="font-mono text-xs">{wallet ?? "Not connected"}</span>
                    {wallet && (
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        title="Copy address"
                      >
                        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                      </button>
                    )}
                    {chainName && (
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                        {chainName}
                      </span>
                    )}
                    {admin.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-500">
                        <ShieldCheck className="size-3" /> Protocol Admin
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {admin.isAdmin && (
                  <Button asChild size="sm" className="gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-primary text-primary-foreground font-semibold shadow-md hover:opacity-90">
                    <Link to="/admin">
                      <ShieldAlert className="size-3.5" /> Admin Dashboard
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleShareProfile} className="gap-2 text-xs">
                  <Share2 className="size-3.5" /> Share
                </Button>
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <Pencil className="size-3.5" /> Edit Profile
                </Button>
              </div>
            </div>

            {/* OpenSea Stats Bar */}
            <div className="py-4 grid grid-cols-2 sm:grid-cols-6 gap-4 border-b border-border text-center sm:text-left">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Collected</span>
                <p className="font-display text-xl sm:text-2xl font-bold">{ownedTokens.length}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created Collections</span>
                <p className="font-display text-xl sm:text-2xl font-bold">{createdCollections.length}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Listings</span>
                <p className="font-display text-xl sm:text-2xl font-bold">{activeListings.length}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Auctions & Bids</span>
                <p className="font-display text-xl sm:text-2xl font-bold">{myAuctions.length + myBids.length}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Offers Made</span>
                <p className="font-display text-xl sm:text-2xl font-bold">{myOffers.length}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity Events</span>
                <p className="font-display text-xl sm:text-2xl font-bold">{activity.length}</p>
              </div>
            </div>

            {/* OpenSea Navigation Tabs */}
            <div className="mt-6">
              <Tabs items={PROFILE_TABS} value={tab} onChange={setTab} />
            </div>

            {/* OpenSea Filter & View Control Bar */}
            <div className="my-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items by name or address..."
                  className="h-10 rounded-xl bg-card pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="w-48">
                  <SelectBox placeholder="Sort by: Recently Added" items={["Recently Added", "Price: Low to High", "Price: High to Low"]} />
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                  >
                    <Grid2X2 className="size-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                  >
                    <List className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tab Content Display */}
            {!wallet ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                <WalletCards className="size-10 text-muted-foreground mb-3" />
                <h3 className="font-display text-lg font-semibold">Wallet Not Connected</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  Connect your web3 wallet to view your collected NFTs, created works, and transaction history.
                </p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : tab === "Collected" ? (
              filteredOwned.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No collected NFTs found matching your filter.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {filteredOwned.map((token, i) => (
                    <ProfileTokenCard
                      key={token.id}
                      collectionId={token.collection.id}
                      tokenId={token.tokenId}
                      tokenStandard={token.tokenStandard}
                      index={i}
                    />
                  ))}
                </div>
              )
            ) : tab === "Created" ? (
              filteredCreated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">No registered collections found for this wallet.</p>
                  <Button asChild size="sm" className="gap-2">
                    <Link to="/create"><Plus className="size-4" /> Register Collection</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCreated.map((col, index) => (
                    <CollectionPreviewCard
                      key={col.id}
                      col={col}
                      meta={metaMap?.[col.id]}
                      index={index}
                      editable
                    />
                  ))}
                </div>
              )
            ) : tab === "Listed" ? (
              filteredListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">No active listings found for this wallet.</p>
                  <Button asChild size="sm" className="gap-2">
                    <Link to="/my-nfts"><Plus className="size-4" /> List an NFT</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {filteredListings.map((listing, i) => (
                    <ProfileTokenCard
                      key={listing.id}
                      collectionId={listing.collection.id}
                      tokenId={listing.tokenId}
                      tokenStandard="ERC-721"
                      pricePerItem={BigInt(listing.pricePerItem)}
                      listingId={listing.id}
                      isListed
                      isListingActive
                      endTime={listing.endTime}
                      onCancelListing={handleCancelListing}
                      listingPending={listingPending}
                      index={i}
                    />
                  ))}
                </div>
              )
            ) : tab === "Auctions & Bids" ? (
              <div className="space-y-6">
                {/* Sub-Tabs: All / My Auctions / My Bids */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    {(["All", "My Auctions", "My Bids"] as const).map((sub) => {
                      const count =
                        sub === "All" ? myAuctions.length + myBids.length :
                        sub === "My Auctions" ? myAuctions.length : myBids.length;
                      return (
                        <Button
                          key={sub}
                          size="sm"
                          variant={auctionSubTab === sub ? "default" : "outline"}
                          className="h-8 text-xs gap-1.5"
                          onClick={() => setAuctionSubTab(sub)}
                        >
                          {sub === "My Auctions" && <Gavel className="size-3.5" />}
                          {sub === "My Bids" && <Trophy className="size-3.5" />}
                          {sub} <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">{count}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <Button asChild size="sm" variant="ghost" className="text-xs gap-1.5 text-primary">
                    <Link to="/explore">
                      Explore Live Auctions <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                </div>

                {/* Content Rendering based on sub-tab */}
                {(auctionSubTab === "All" || auctionSubTab === "My Auctions") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold flex items-center gap-2">
                        <Gavel className="size-4 text-primary" /> Auctions Created by You ({filteredAuctions.length})
                      </h3>
                      {filteredAuctions.length > 0 && (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {activeAuctions.length} active
                        </span>
                      )}
                    </div>

                    {filteredAuctions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center">
                        <Gavel className="size-8 text-muted-foreground/60 mb-2" />
                        <p className="text-xs text-muted-foreground mb-3">You haven't created any auctions yet.</p>
                        <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                          <Link to="/my-nfts"><Plus className="size-3.5" /> Start an Auction</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {filteredAuctions.map((auction, i) => (
                          <ProfileAuctionCard
                            key={auction.id}
                            auction={auction}
                            onCancel={handleCancelAuction}
                            onSettle={handleSettleAuction}
                            actionPending={auctionActionPending}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(auctionSubTab === "All" || auctionSubTab === "My Bids") && (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold flex items-center gap-2">
                        <Trophy className="size-4 text-gold" /> Bids Placed by You ({filteredBids.length})
                      </h3>
                    </div>

                    {filteredBids.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center">
                        <Trophy className="size-8 text-muted-foreground/60 mb-2" />
                        <p className="text-xs text-muted-foreground mb-3">You haven't placed any bids yet.</p>
                        <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                          <Link to="/explore">Explore Auctions</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {filteredBids.map((bid, i) => (
                          <ProfileBidCard
                            key={bid.id}
                            bid={bid}
                            userAddress={address}
                            onSettle={handleSettleAuction}
                            actionPending={auctionActionPending}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : tab === "Offers" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold flex items-center gap-2">
                    <Tag className="size-4 text-primary" /> Active Offers Placed by You ({filteredOffers.length})
                  </h3>
                </div>

                {filteredOffers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center">
                    <Tag className="size-8 text-muted-foreground/60 mb-2" />
                    <p className="text-xs text-muted-foreground mb-3">You haven't placed any offers yet.</p>
                    <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                      <Link to="/explore">Explore Collections</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {filteredOffers.map((offer, i) => (
                      <ProfileOfferCard
                        key={offer.id}
                        offer={offer}
                        onCancel={handleCancelOffer}
                        onRefund={handleRefundExpiredOffer}
                        actionPending={offerActionPending}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : activity.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No activity history found.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                {activity.slice(0, 20).map((row) => (
                  <div key={row.id} className="flex items-center justify-between p-3.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-semibold text-primary">
                        {row.type}
                      </span>
                      <span className="font-mono text-xs">
                        {row.collection?.id ? `${row.collection.id.slice(0, 8)}…` : "Collection"}
                        {row.tokenId ? ` #${row.tokenId}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="text-[10px]">
                        {new Date(Number(row.timestamp) * 1000).toLocaleDateString()}
                      </span>
                      {row.transactionHash && (
                        <a
                          href={txUrl(row.transactionHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground transition-colors"
                          title="View transaction"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </AccountShell>
  );
}

// ─── Profile Auction Card Component ──────────────────────────────────────────

function ProfileAuctionCard({
  auction,
  onCancel,
  onSettle,
  actionPending = false,
  index,
}: {
  auction: any;
  onCancel: (auctionId: string) => void;
  onSettle: (auctionId: string) => void;
  actionPending?: boolean;
  index: number;
}) {
  const collectionAddress = (auction.collection?.id || "") as `0x${string}`;
  const tokenId = auction.tokenId || "";
  const { imageUri, name } = useTokenMetadata(
    collectionAddress,
    tokenId,
  );
  const now = Math.floor(Date.now() / 1000);
  const endTimeStr = auction.endTime || "0";
  const isEnded = Number(endTimeStr) <= now;
  const isZeroBidder = !auction.highestBidder || auction.highestBidder === "0x0000000000000000000000000000000000000000";
  const highestBidVal = BigInt(auction.highestBid || "0");
  const reservePriceVal = BigInt(auction.reservePrice || "0");
  const hasBids = !isZeroBidder && highestBidVal > 0n;

  return (
    <div
      className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 flex flex-col justify-between"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg
              uri={imageUri}
              alt={name || `Token #${tokenId}`}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="size-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono">
              #{tokenId}
            </div>
          )}

          {/* Status Badge */}
          <span className={cn(
            "absolute top-2 left-2 rounded-full backdrop-blur px-2.5 py-0.5 text-[10px] font-semibold shadow-sm border",
            !auction.active
              ? "bg-background/90 text-muted-foreground border-border"
              : isEnded
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-success/20 text-success border-success/30"
          )}>
            {!auction.active ? "Settled" : isEnded ? "Ended" : "Live Auction"}
          </span>

          <span className="absolute bottom-2 left-2 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            {auction.active ? formatTimeLeft(endTimeStr) : "Closed"}
          </span>
        </div>

        <div className="p-3">
          <p className="truncate font-display text-xs font-semibold group-hover:text-primary transition-colors">
            {name || `Token #${tokenId}`}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-[10px] text-muted-foreground">
              {hasBids ? "Highest Bid" : "Reserve Price"}
            </span>
            <span className="font-semibold text-foreground">
              {formatEthCompact(hasBids ? highestBidVal : reservePriceVal)}
            </span>
          </div>
          {hasBids && auction.highestBidder && (
            <p className="mt-0.5 text-[10px] text-muted-foreground font-mono truncate">
              Bidder: {auction.highestBidder.slice(0, 6)}…{auction.highestBidder.slice(-4)}
            </p>
          )}
        </div>
      </Link>

      {/* Action Footer */}
      {auction.active && (
        <div className="p-2 border-t border-border bg-card/60 flex gap-2">
          {isZeroBidder && !isEnded ? (
            <Button
              variant="outline"
              size="sm"
              disabled={actionPending}
              onClick={() => onCancel(auction.id)}
              className="w-full text-[10px] h-7 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="size-3 mr-1" />
              Cancel Auction
            </Button>
          ) : isEnded ? (
            <Button
              variant="default"
              size="sm"
              disabled={actionPending}
              onClick={() => onSettle(auction.id)}
              className="w-full text-[10px] h-7 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {hasBids ? (
                <>
                  <Coins className="size-3 mr-1" />
                  Settle & Receive Payout
                </>
              ) : (
                <>
                  <RefreshCw className="size-3 mr-1" />
                  Settle & Close
                </>
              )}
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="w-full text-[10px] h-7">
              <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${tokenId}` }}>
                View Bids
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Profile Bid Card Component ──────────────────────────────────────────────

function ProfileBidCard({
  bid,
  userAddress,
  onSettle,
  actionPending = false,
  index,
}: {
  bid: any;
  userAddress?: string;
  onSettle: (auctionId: string) => void;
  actionPending?: boolean;
  index: number;
}) {
  const auction = bid.auction || {};
  const collectionAddress = (auction.collection?.id || "") as `0x${string}`;
  const tokenId = auction.tokenId || "";
  const { imageUri, name } = useTokenMetadata(
    collectionAddress,
    tokenId,
  );
  const now = Math.floor(Date.now() / 1000);
  const endTimeStr = auction.endTime || "0";
  const isEnded = Number(endTimeStr) <= now;
  const isWinning = Boolean(
    auction.highestBidder &&
    userAddress &&
    auction.highestBidder.toLowerCase() === userAddress.toLowerCase()
  );
  const bidAmount = BigInt(bid.amount || "0");
  const highestBid = BigInt(auction.highestBid || "0");

  return (
    <div
      className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 flex flex-col justify-between"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg
              uri={imageUri}
              alt={name || `Token #${tokenId}`}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="size-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono">
              #{tokenId}
            </div>
          )}

          {/* Status Badge */}
          <span className={cn(
            "absolute top-2 left-2 rounded-full backdrop-blur px-2.5 py-0.5 text-[10px] font-semibold shadow-sm border",
            !auction.active
              ? "bg-background/90 text-muted-foreground border-border"
              : isWinning
                ? isEnded
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-success/20 text-success border-success/30"
                : "bg-destructive/20 text-destructive border-destructive/30"
          )}>
            {!auction.active
              ? "Completed"
              : isWinning
                ? isEnded
                  ? "🏆 Won (Claim Ready)"
                  : "Winning"
                : "Outbid"}
          </span>

          <span className="absolute bottom-2 left-2 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            {auction.active ? formatTimeLeft(endTimeStr) : "Closed"}
          </span>
        </div>

        <div className="p-3">
          <p className="truncate font-display text-xs font-semibold group-hover:text-primary transition-colors">
            {name || `Token #${tokenId}`}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-[10px] text-muted-foreground">Your Bid</span>
            <span className="font-semibold text-foreground">
              {formatEthCompact(bidAmount)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-xs">
            <span className="text-[10px] text-muted-foreground">Highest Bid</span>
            <span className={cn("font-medium", isWinning ? "text-success" : "text-muted-foreground")}>
              {formatEthCompact(highestBid)}
            </span>
          </div>
        </div>
      </Link>

      {/* Action Footer */}
      {auction.active && (
        <div className="p-2 border-t border-border bg-card/60 flex gap-2">
          {isWinning && isEnded ? (
            <Button
              variant="default"
              size="sm"
              disabled={actionPending}
              onClick={() => onSettle(auction.id)}
              className="w-full text-[10px] h-7 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Trophy className="size-3 mr-1" />
              Settle & Claim NFT
            </Button>
          ) : !isWinning && !isEnded ? (
            <div className="w-full">
              <BidDialog
                auctionId={BigInt(auction.id || "0")}
                nftContract={collectionAddress}
                tokenId={tokenId}
                paymentToken={auction.paymentToken || "0x0000000000000000000000000000000000000000"}
                minBid={((highestBid || 10n ** 15n) * 105n) / 100n}
                endsAt={BigInt(endTimeStr)}
                label="Increase Bid"
                className="w-full text-[10px] h-7 bg-primary text-primary-foreground hover:bg-primary/90"
              />
            </div>
          ) : (
            <Button asChild variant="outline" size="sm" className="w-full text-[10px] h-7">
              <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${tokenId}` }}>
                View Auction
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Profile Offer Card Component ──────────────────────────────────────────────

function ProfileOfferCard({
  offer,
  onCancel,
  onRefund,
  actionPending = false,
  index,
}: {
  offer: any;
  onCancel: (offerId: string) => void;
  onRefund: (offerId: string) => void;
  actionPending?: boolean;
  index: number;
}) {
  const collectionAddress = (offer.collection?.id || "") as `0x${string}`;
  const tokenId = offer.tokenId || "";
  const { imageUri, name } = useTokenMetadata(
    collectionAddress,
    tokenId,
  );
  const now = Math.floor(Date.now() / 1000);
  const expStr = offer.expiration || "0";
  const isExpired = Number(expStr) <= now;
  const amountVal = BigInt(offer.amount || "0");
  const fundedVal = BigInt(offer.fundedAmount || "0");

  return (
    <div
      className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 flex flex-col justify-between"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionAddress}-${tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg
              uri={imageUri}
              alt={name || `Token #${tokenId}`}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="size-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono">
              #{tokenId}
            </div>
          )}

          {/* Status Badge */}
          <span className={cn(
            "absolute top-2 left-2 rounded-full backdrop-blur px-2.5 py-0.5 text-[10px] font-semibold shadow-sm border",
            !offer.active
              ? "bg-background/90 text-muted-foreground border-border"
              : isExpired
                ? "bg-destructive/20 text-destructive border-destructive/30"
                : "bg-primary/20 text-primary border-primary/30"
          )}>
            {!offer.active ? "Closed" : isExpired ? "Expired" : "Active Offer"}
          </span>

          <span className="absolute bottom-2 left-2 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            {offer.active ? formatTimeLeft(expStr) : "Closed"}
          </span>
        </div>

        <div className="p-3">
          <p className="truncate font-display text-xs font-semibold group-hover:text-primary transition-colors">
            {name || `Token #${tokenId}`}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-[10px] text-muted-foreground">Offer Amount</span>
            <span className="font-semibold text-primary">
              {formatEthCompact(amountVal)}
            </span>
          </div>
          {fundedVal > amountVal && (
            <div className="mt-0.5 flex items-center justify-between text-xs">
              <span className="text-[10px] text-muted-foreground">Escrowed (incl. fees)</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {formatEthCompact(fundedVal)}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Action Footer */}
      {offer.active && (
        <div className="p-2 border-t border-border bg-card/60 flex gap-2">
          {!isExpired ? (
            <Button
              variant="outline"
              size="sm"
              disabled={actionPending}
              onClick={() => onCancel(offer.id)}
              className="w-full text-[10px] h-7 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="size-3 mr-1" />
              Cancel & Refund ETH
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              disabled={actionPending}
              onClick={() => onRefund(offer.id)}
              className="w-full text-[10px] h-7 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <RefreshCw className="size-3 mr-1" />
              Claim Refund
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Profile Token Card component using useTokenMetadata & IpfsImg ──────────────

function ProfileTokenCard({
  collectionId,
  tokenId,
  tokenStandard = "ERC-721",
  pricePerItem,
  listingId,
  isListed = false,
  isListingActive = false,
  endTime,
  onCancelListing,
  listingPending = false,
  index,
}: {
  collectionId: string;
  tokenId: string;
  tokenStandard?: "ERC-721" | "ERC-1155";
  pricePerItem?: bigint;
  listingId?: string;
  isListed?: boolean;
  isListingActive?: boolean;
  endTime?: string;
  onCancelListing?: (listingId: string) => void;
  listingPending?: boolean;
  index: number;
}) {
  const { imageUri, name, isLoading: metaLoading } = useTokenMetadata(
    collectionId as `0x${string}`,
    tokenId,
    tokenStandard,
  );

  const formattedPrice = pricePerItem ? formatEth(pricePerItem) : "0.1";

  return (
    <div
      className="card-hover group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionId}-${tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg
              uri={imageUri}
              alt={name || `Token #${tokenId}`}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className={`size-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono ${metaLoading ? "animate-pulse" : ""}`}>
              #{tokenId}
            </div>
          )}
          {pricePerItem && (
            <span className="absolute top-2 right-2 rounded-full bg-background/90 backdrop-blur border border-border px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
              {formatEthCompact(pricePerItem)}
            </span>
          )}
          {endTime && (
            <span className="absolute bottom-2 left-2 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
              {formatTimeLeft(endTime)}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="truncate font-display text-xs font-semibold group-hover:text-primary transition-colors">
            {name || `Token #${tokenId}`}
          </p>
          <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-mono">{collectionId.slice(0, 8)}…</span>
            {isListed && (
              <span className="rounded-full bg-success/15 px-1.5 py-0.2 text-[9px] font-medium text-success">
                Active
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Hover action bar */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full p-2 transition-transform duration-200 group-hover:translate-y-0 bg-background/95 backdrop-blur border-t border-border flex flex-col gap-1.5">
        {isListed && listingId ? (
          <>
            <SellDialog
              nftContract={collectionId as `0x${string}`}
              tokenId={tokenId}
              tokenStandard={tokenStandard}
              label="Update Price"
              variant="default"
              defaultPrice={formattedPrice}
              existingListingId={listingId}
              className="w-full text-[10px] h-7 bg-primary text-primary-foreground hover:bg-primary/90"
            />
            {onCancelListing && (
              <Button
                variant="outline"
                size="sm"
                disabled={listingPending}
                onClick={() => onCancelListing(listingId)}
                className="w-full text-[10px] h-7 gap-1 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="size-3" />
                {listingPending ? "Cancelling…" : "Cancel Listing"}
              </Button>
            )}
          </>
        ) : (
          <SellDialog
            nftContract={collectionId as `0x${string}`}
            tokenId={tokenId}
            tokenStandard={tokenStandard}
            label="List for Sale"
            variant="default"
            className="w-full text-[10px] h-8"
          />
        )}
      </div>
    </div>
  );
}

