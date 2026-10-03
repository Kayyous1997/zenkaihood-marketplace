import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { isAddress } from "viem";
import { ArrowLeft, Clock, Coins, Gavel, Heart, RefreshCw, Share2, ShieldCheck, Trophy, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Shell, Verified } from "@/components/zenkai";
import { BuyDialog, SellDialog, OfferDialog, CreateAuctionDialog, BidDialog } from "@/components/dialogs";
import { useWallet } from "@/lib/wallet";
import { useAuction } from "@/hooks/useAuction";
import { useOffer } from "@/hooks/useOffer";
import { useListing, useIsApproved721, useIsApproved1155 } from "@/hooks/useListing";
import { parseContractError } from "@/lib/contract-errors";
import { erc721Abi } from "@/contracts/erc721Abi";
import { erc1155Abi } from "@/contracts/erc1155Abi";
import { gqlClient } from "@/indexer/client";
import {
  GET_TOKEN,
  GET_LISTINGS_FOR_ASSET,
  GET_OFFERS_FOR_ASSET,
  GET_AUCTIONS_FOR_ASSET,
  GET_AUCTION_BIDS,
  type TokenResult,
  type ListingsForAssetResult,
  type OffersForAssetResult,
  type AuctionsForAssetResult,
  type AuctionBidsResult,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS, FAST_REFETCH_MS, SLOW_REFETCH_MS, unixNowSeconds } from "@/indexer/events";
import { IpfsImg } from "@/components/ipfs-img";
import { fetchMetadata, resolveTokenMetadataUri, type NftMetadata } from "@/lib/metadata";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { formatEthCompact, formatBps } from "@/lib/token-format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nfts/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `NFT ${params.id}` },
      { name: "description", content: `View details, traits and listing history for Zenkaihood NFT ${params.id}.` },
      { property: "og:title", content: `NFT ${params.id}` },
      { property: "og:description", content: "Explore this digital collectible on Zenkaihood." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NftDetailPage,
});

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

function NftDetailPage() {
  const { id } = Route.useParams();
  const { address } = useWallet();
  const [liked, setLiked] = useState(false);
  const [collectionMetadata, setCollectionMetadata] = useState<NftMetadata | null>(null);

  // id format: "{collectionAddress}-{tokenId}"
  const dashIdx = id.lastIndexOf("-");
  const collectionAddress = dashIdx !== -1 ? id.slice(0, dashIdx).toLowerCase() : id.toLowerCase();
  const tokenId = dashIdx !== -1 ? id.slice(dashIdx + 1) : "0";
  const tokenEntityId = `${collectionAddress}-${tokenId}`;

  // Token ownership
  const { data: tokenData, isLoading: tokenLoading, refetch: refetchToken } = useQuery({
    queryKey: ["token", tokenEntityId],
    queryFn: () => gqlClient.request<TokenResult>(GET_TOKEN, { id: tokenEntityId }),
    refetchInterval: SLOW_REFETCH_MS,
  });

  // Active listings for this NFT
  const { data: listingsData } = useQuery({
    queryKey: ["asset-listings", collectionAddress, tokenId],
    queryFn: () => gqlClient.request<ListingsForAssetResult>(GET_LISTINGS_FOR_ASSET, {
      collection: collectionAddress,
      tokenId,
    }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Active auctions for this NFT
  const { data: auctionsData, refetch: refetchAuctions } = useQuery({
    queryKey: ["asset-auctions", collectionAddress, tokenId],
    queryFn: () => gqlClient.request<AuctionsForAssetResult>(GET_AUCTIONS_FOR_ASSET, {
      collection: collectionAddress,
      tokenId,
    }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  // Active offers for this NFT
  const { data: offersData, refetch: refetchOffers } = useQuery({
    queryKey: ["asset-offers", collectionAddress, tokenId],
    queryFn: () => gqlClient.request<OffersForAssetResult>(GET_OFFERS_FOR_ASSET, {
      collection: collectionAddress,
      tokenId,
      now: unixNowSeconds(),
    }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const token = tokenData?.token;
  const listings = listingsData?.listings ?? [];
  const auctions = auctionsData?.auctions ?? [];
  const offers = offersData?.offers ?? [];

  const now = Math.floor(Date.now() / 1000);
  const activeListing = listings.find(
    (l) => l.active && !l.cancelled && Number(l.startTime) <= now && Number(l.endTime) > now,
  );
  const isEthListing = activeListing?.paymentToken === ETH_ADDRESS;

  // Active auction for this NFT
  const activeAuction = auctions.find((a) => a.active);
  const auctionEndTime = activeAuction ? Number(activeAuction.endTime) : 0;
  const isAuctionEnded = activeAuction ? auctionEndTime <= now : false;
  const auctionEndsInMin = activeAuction ? Math.max(0, Math.floor((auctionEndTime * 1000 - Date.now()) / 60000)) : 0;
  const isZeroBidder = !activeAuction?.highestBidder || activeAuction.highestBidder === "0x0000000000000000000000000000000000000000";
  const highestBidVal = BigInt(activeAuction?.highestBid || "0");
  const reservePriceVal = BigInt(activeAuction?.reservePrice || "0");
  const hasAuctionBids = !isZeroBidder && highestBidVal > 0n;
  const highBidOrReserve = hasAuctionBids ? highestBidVal : reservePriceVal;
  const minNextBid = ((highBidOrReserve > 0n ? highBidOrReserve : 10n ** 15n) * 105n) / 100n;
  const isAuctionSeller = Boolean(activeAuction && address && activeAuction.seller.toLowerCase() === address.toLowerCase());
  const isWinningBidder = Boolean(
    activeAuction &&
    address &&
    activeAuction.highestBidder &&
    activeAuction.highestBidder.toLowerCase() === address.toLowerCase()
  );

  // Bids query for the active auction
  const { data: bidsData, refetch: refetchBids } = useQuery({
    queryKey: ["auction-bids", activeAuction?.id],
    queryFn: () => gqlClient.request<AuctionBidsResult>(GET_AUCTION_BIDS, { auctionId: activeAuction!.id }),
    enabled: !!activeAuction?.id,
    refetchInterval: FAST_REFETCH_MS,
  });

  const bids = bidsData?.bids ?? [];

  const { settleAuction, cancelAuction, isPending: auctionActionPending } = useAuction();

  async function handleSettleAuction() {
    if (!activeAuction) return;
    try {
      await settleAuction(BigInt(activeAuction.id));
      toast.success("Auction settled successfully! Tokens & funds transferred.", { id: "settle-auction" });
      void refetchAuctions();
      void refetchBids();
    } catch (err) {
      toast.error(parseContractError(err), { id: "settle-auction" });
    }
  }

  async function handleCancelAuction() {
    if (!activeAuction) return;
    try {
      await cancelAuction(BigInt(activeAuction.id));
      toast.success("Auction cancelled.", { id: "cancel-auction" });
      void refetchAuctions();
      void refetchBids();
    } catch (err) {
      toast.error(parseContractError(err), { id: "cancel-auction" });
    }
  }

  const { acceptOffer } = useOffer();
  const { approveAll } = useListing();
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);

  const isApproved721 = useIsApproved721(
    collectionAddress as `0x${string}`,
    tokenId ? BigInt(tokenId) : undefined,
    address as `0x${string}` | undefined,
  );
  const isApproved1155 = useIsApproved1155(
    collectionAddress as `0x${string}`,
    address as `0x${string}` | undefined,
  );

  async function handleAcceptOffer(offerId: string) {
    setAcceptingOfferId(offerId);
    try {
      const isErc1155 = token?.collection.tokenStandard === "ERC1155";
      const isApproved = isErc1155 ? isApproved1155 : isApproved721;
      if (!isApproved) {
        toast.info("Approving marketplace to transfer NFT…", { id: "accept-offer" });
        await approveAll(collectionAddress as `0x${string}`, isErc1155);
      }
      await acceptOffer(BigInt(offerId));
      toast.success("Offer accepted! NFT transferred and payout distributed.", { id: "accept-offer" });
      void refetchOffers();
      void refetchToken();
    } catch (err) {
      toast.error(parseContractError(err), { id: "accept-offer" });
    } finally {
      setAcceptingOfferId(null);
    }
  }

  // On-chain ERC-721 owner read fallback
  const { data: onchainOwner } = useReadContract({
    address: isAddress(collectionAddress) ? (collectionAddress as `0x${string}`) : undefined,
    abi: erc721Abi,
    functionName: "ownerOf",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: isAddress(collectionAddress) && tokenId !== undefined && tokenId !== "",
    },
  });

  // On-chain ERC-1155 balance read for connected user
  const { data: user1155Balance } = useReadContract({
    address: isAddress(collectionAddress) ? (collectionAddress as `0x${string}`) : undefined,
    abi: erc1155Abi,
    functionName: "balanceOf",
    args: address && tokenId ? [address as `0x${string}`, BigInt(tokenId)] : undefined,
    query: {
      enabled: isAddress(collectionAddress) && !!address && tokenId !== undefined && tokenId !== "",
    },
  });

  // Resolve token metadata from collection metadataURI
  const { metadata: onchainMetadata } = useTokenMetadata(
    collectionAddress as `0x${string}`,
    tokenId,
  );

  useEffect(() => {
    if (onchainMetadata || !token?.collection.metadataURI) return;
    fetchMetadata(resolveTokenMetadataUri(token.collection.metadataURI, tokenId)).then(setCollectionMetadata);
  }, [onchainMetadata, token?.collection.metadataURI, tokenId]);

  const metadata = onchainMetadata ?? collectionMetadata;

  const effectiveOwner =
    (onchainOwner as string | undefined) ??
    token?.owner ??
    (activeListing ? activeListing.seller : null) ??
    (activeAuction ? activeAuction.seller : null);

  const isOwner = Boolean(
    address && (
      (effectiveOwner && effectiveOwner.toLowerCase() === address.toLowerCase()) ||
      (user1155Balance !== undefined && user1155Balance > 0n) ||
      (activeListing && activeListing.seller.toLowerCase() === address.toLowerCase()) ||
      (activeAuction && activeAuction.seller.toLowerCase() === address.toLowerCase())
    )
  );

  const ownerShort = effectiveOwner
    ? `${effectiveOwner.slice(0, 6)}…${effectiveOwner.slice(-4)}`
    : "Unknown";

  if (tokenLoading) {
    return (
      <Shell>
        <main className="page-section grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="aspect-square animate-pulse rounded-md bg-muted" />
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="page-section animate-fade-in-up">
        <Button asChild variant="ghost" className="mb-4 -ml-2 gap-2 text-xs text-muted-foreground hover:text-foreground">
          <Link to="/collections/$slug" params={{ slug: collectionAddress }}>
            <ArrowLeft className="size-4" /> Back to collection
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* NFT image */}
          <div className="overflow-hidden rounded-md border border-border bg-surface/90 p-3 shadow-art">
            <div className="relative aspect-square overflow-hidden rounded-sm">
              {metadata?.image ? (
                <IpfsImg
                  uri={metadata.image}
                  alt={metadata.name ?? `Token #${tokenId}`}
                  className="size-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="size-full bg-muted" />
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground">
                ◉ {collectionAddress.slice(0, 8)}…{collectionAddress.slice(-6)}{" "}
                {token?.collection.verified && <Verified />}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
                {metadata?.name ?? `Token #${tokenId}`}
              </h1>
              {metadata?.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{metadata.description}</p>
              )}
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                Owned by <span className="text-foreground">{ownerShort}</span>
                <ShieldCheck className="size-4 text-info" />
              </p>
            </div>

            {/* Buy / Auction panel */}
            <div className="rounded-md border border-border bg-surface/90 p-4">
              {activeListing ? (
                <>
                  <p className="text-xs text-muted-foreground">Current price</p>
                  <div className="mt-1 flex items-baseline gap-3">
                    <b className="font-display text-3xl font-semibold">
                      {isEthListing
                        ? formatEthCompact(BigInt(activeListing.pricePerItem))
                        : `${activeListing.pricePerItem} tokens`}
                    </b>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isOwner && (
                      <BuyDialog
                        listingId={BigInt(activeListing.id)}
                        pricePerItem={BigInt(activeListing.pricePerItem)}
                        quantity={BigInt(activeListing.quantity)}
                        paymentToken={activeListing.paymentToken}
                        tokenId={tokenId}
                        collectionId={collectionAddress}
                      />
                    )}
                    {!isOwner && (
                      <OfferDialog
                        nftContract={collectionAddress as `0x${string}`}
                        tokenId={tokenId}
                        tokenStandard={token?.collection.tokenStandard === "ERC1155" ? "ERC-1155" : "ERC-721"}
                      />
                    )}
                    {isOwner && (
                      <CreateAuctionDialog
                        nftContract={collectionAddress as `0x${string}`}
                        tokenId={tokenId}
                        tokenStandard={token?.collection.tokenStandard === "ERC1155" ? "ERC-1155" : "ERC-721"}
                        royaltyBps={token?.collection.royaltyBps ?? 0}
                        existingListingId={activeListing?.id}
                      />
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setLiked(!liked)}
                      aria-label={liked ? "Remove favorite" : "Add favorite"}
                      className="press"
                    >
                      <Heart className={cn("size-4 transition-colors", liked && "fill-primary text-primary")} />
                    </Button>
                    <Button size="icon" variant="outline" aria-label="Share" className="press">
                      <Share2 className="size-4" />
                    </Button>
                  </div>
                </>
              ) : activeAuction ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold border flex items-center gap-1.5",
                        isAuctionEnded
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                      )}>
                        {isAuctionEnded ? (
                          <>
                            <Trophy className="size-3" />
                            <span>Auction Ended</span>
                          </>
                        ) : (
                          <>
                            <Gavel className="size-3" />
                            <span>Live Auction</span>
                          </>
                        )}
                      </span>
                      {!isAuctionEnded && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3.5" />
                          {auctionEndsInMin < 5 ? `Ends in ${auctionEndsInMin}m (anti-sniping active)` : `Ends in ~${auctionEndsInMin}m`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      {hasAuctionBids ? "Current highest bid" : "Reserve price"}
                    </p>
                    <div className="mt-1 flex items-baseline gap-3">
                      <b className="font-display text-3xl font-semibold text-amber-500">
                        {formatEthCompact(highBidOrReserve)}
                      </b>
                      {hasAuctionBids && (
                        <span className="text-xs text-muted-foreground">
                          Reserve: {formatEthCompact(reservePriceVal)}
                        </span>
                      )}
                    </div>
                    {hasAuctionBids && activeAuction.highestBidder && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Highest bidder:{" "}
                        <span className="font-mono text-foreground font-medium">
                          {activeAuction.highestBidder.slice(0, 8)}…{activeAuction.highestBidder.slice(-6)}
                        </span>
                        {isWinningBidder && (
                          <span className="ml-2 font-semibold text-emerald-400">(You)</span>
                        )}
                      </p>
                    )}
                  </div>

                  {isAuctionEnded && (
                    isWinningBidder ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                        🏆 <b>Congratulations!</b> You won this auction. Click below to settle and claim your NFT.
                      </div>
                    ) : isAuctionSeller ? (
                      <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
                        {hasAuctionBids ? (
                          <>
                            💰 <b>Auction Ended with bids!</b> Winning bid: <span className="font-semibold text-primary">{formatEthCompact(highestBidVal)}</span>. Click below to settle and receive your payout.
                          </>
                        ) : (
                          <>
                            ℹ <b>Auction Ended without bids.</b> Click below to settle and return the NFT to your active inventory.
                          </>
                        )}
                      </div>
                    ) : null
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!isAuctionEnded ? (
                      <>
                        {!isAuctionSeller && (
                          <BidDialog
                            auctionId={BigInt(activeAuction.id)}
                            nftContract={collectionAddress as `0x${string}`}
                            minBid={minNextBid}
                            paymentToken={activeAuction.paymentToken}
                            tokenId={tokenId}
                            endsAt={BigInt(activeAuction.endTime)}
                            label="Place Bid"
                          />
                        )}
                        {isAuctionSeller && isZeroBidder && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={auctionActionPending}
                            onClick={handleCancelAuction}
                            className="text-xs"
                          >
                            <XCircle className="size-4 mr-1.5" />
                            Cancel Auction
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="default"
                        disabled={auctionActionPending}
                        onClick={handleSettleAuction}
                        className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                      >
                        {isWinningBidder ? (
                          <>
                            <Trophy className="size-4 mr-1.5" />
                            Settle & Claim NFT
                          </>
                        ) : isAuctionSeller ? (
                          hasAuctionBids ? (
                            <>
                              <Coins className="size-4 mr-1.5" />
                              Settle & Receive Payout
                            </>
                          ) : (
                            <>
                              <RefreshCw className="size-4 mr-1.5" />
                              Settle & Close Auction
                            </>
                          )
                        ) : (
                          <>
                            <Gavel className="size-4 mr-1.5" />
                            Settle Auction
                          </>
                        )}
                      </Button>
                    )}

                    {!isOwner && (
                      <OfferDialog
                        nftContract={collectionAddress as `0x${string}`}
                        tokenId={tokenId}
                        tokenStandard={token?.collection.tokenStandard === "ERC1155" ? "ERC-1155" : "ERC-721"}
                      />
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setLiked(!liked)}
                      aria-label={liked ? "Remove favorite" : "Add favorite"}
                      className="press"
                    >
                      <Heart className={cn("size-4 transition-colors", liked && "fill-primary text-primary")} />
                    </Button>
                    <Button size="icon" variant="outline" aria-label="Share" className="press">
                      <Share2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Not currently listed for sale.</p>
                  <div className="flex flex-wrap gap-2">
                    {isOwner && (
                      <SellDialog
                        nftContract={collectionAddress as `0x${string}`}
                        tokenId={tokenId}
                        tokenStandard={token?.collection.tokenStandard === "ERC1155" ? "ERC-1155" : "ERC-721"}
                        royaltyBps={token?.collection.royaltyBps ?? 0}
                        label="List for Sale"
                        variant="default"
                        existingAuctionId={activeAuction?.id}
                        hasAuctionBids={hasAuctionBids}
                      />
                    )}
                    {!isOwner && (
                      <OfferDialog
                        nftContract={collectionAddress as `0x${string}`}
                        tokenId={tokenId}
                        tokenStandard={token?.collection.tokenStandard === "ERC1155" ? "ERC-1155" : "ERC-721"}
                      />
                    )}
                    {isOwner && (
                      <CreateAuctionDialog
                        nftContract={collectionAddress as `0x${string}`}
                        tokenId={tokenId}
                        tokenStandard={token?.collection.tokenStandard === "ERC1155" ? "ERC-1155" : "ERC-721"}
                        royaltyBps={token?.collection.royaltyBps ?? 0}
                        existingListingId={activeListing?.id}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auction Bids History */}
            {activeAuction && bids.length > 0 && (
              <div className="rounded-md border border-border bg-surface/90 p-4">
                <h2 className="font-display text-base font-semibold">Auction Bids ({bids.length})</h2>
                <div className="mt-3 divide-y divide-border">
                  {bids.map((b, idx) => (
                    <div key={b.id} className="flex items-center justify-between py-2 text-xs">
                      <span className="font-mono text-muted-foreground">
                        {b.bidder.slice(0, 8)}…{b.bidder.slice(-4)}
                        {idx === 0 && <span className="ml-1 text-emerald-400 font-semibold">(Highest)</span>}
                      </span>
                      <b className="font-semibold text-primary">{formatEthCompact(BigInt(b.amount))}</b>
                      <span className="text-muted-foreground">
                        {new Date(Number(b.timestamp) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Offers */}
            {offers.length > 0 && (
              <div className="rounded-md border border-border bg-surface/90 p-4">
                <h2 className="font-display text-base font-semibold">Offers ({offers.length})</h2>
                <div className="mt-3 divide-y divide-border">
                  {offers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between py-2 text-xs">
                      <span>{offer.offerer.slice(0, 6)}…{offer.offerer.slice(-4)}</span>
                      <b>{offer.paymentToken === ETH_ADDRESS
                        ? formatEthCompact(BigInt(offer.amount))
                        : `${offer.amount} tokens`}</b>
                      <span className="text-muted-foreground">
                        Exp. {new Date(Number(offer.expiration) * 1000).toLocaleDateString()}
                      </span>
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs h-7 px-3 bg-primary text-primary-foreground font-semibold"
                          disabled={acceptingOfferId === offer.id}
                          onClick={() => handleAcceptOffer(offer.id)}
                        >
                          {acceptingOfferId === offer.id ? "Accepting…" : "Accept"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NFT Attributes */}
            {metadata?.attributes && metadata.attributes.length > 0 && (
              <div className="rounded-md border border-border bg-surface/90 p-4">
                <h2 className="font-display text-base font-semibold">Traits</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {metadata.attributes.map((attr) => (
                    <div key={attr.trait_type} className="rounded-md border border-border bg-background/60 p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{attr.trait_type}</p>
                      <p className="mt-0.5 text-xs font-semibold">{String(attr.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* On-chain details */}
            <div className="rounded-md border border-border bg-surface/90 p-4">
              <h2 className="font-display text-base font-semibold">Details</h2>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Contract Address</span><b className="font-mono">{collectionAddress.slice(0, 8)}…{collectionAddress.slice(-6)}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Token ID</span><b>#{tokenId}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Token Standard</span><b>{token?.collection.tokenStandard ?? "ERC-721"}</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Chain</span><b>Base Sepolia</b></div>
                {token?.collection.royaltyBps != null && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Creator Royalties</span><b>{formatBps(token.collection.royaltyBps)}</b></div>
                )}
              </div>
            </div>

            {/* Listing history */}
            <div className="rounded-md border border-border bg-surface/90 p-4">
              <h2 className="font-display text-base font-semibold">Listing History</h2>
              <div className="mt-3 divide-y divide-border">
                {listings.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No listing history yet.</p>
                ) : (
                  listings.map((listing) => (
                    <div key={listing.id} className="flex items-center justify-between py-2.5 text-xs">
                      <span className="font-medium">{listing.active ? "Listed" : listing.cancelled ? "Cancelled" : "Expired"}</span>
                      <span className="text-muted-foreground">
                        {listing.paymentToken === ETH_ADDRESS
                          ? formatEthCompact(BigInt(listing.pricePerItem))
                          : `${listing.pricePerItem} tokens`}
                      </span>
                      <span className="hidden text-muted-foreground sm:inline">{listing.seller.slice(0, 8)}…</span>
                      <span className="text-muted-foreground">
                        {new Date(Number(listing.createdAtTimestamp) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </Shell>
  );
}
