import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Share2, ShieldCheck, WalletCards } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Shell, Verified } from "@/components/zenkai";
import { useWallet } from "@/lib/wallet";
import { gqlClient } from "@/indexer/client";
import {
  GET_TOKEN,
  GET_LISTINGS_FOR_ASSET,
  GET_OFFERS_FOR_ASSET,
  GET_AUCTIONS_FOR_ASSET,
  type TokenResult,
  type ListingsForAssetResult,
  type OffersForAssetResult,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS, SLOW_REFETCH_MS } from "@/indexer/events";
import { fetchMetadata, resolveImageUri, type NftMetadata } from "@/lib/metadata";
import { formatEthCompact, formatBps } from "@/lib/token-format";
import { useListingQuote } from "@/hooks/useListingQuote";
import { usePurchase } from "@/hooks/usePurchase";
import { parseContractError } from "@/lib/contract-errors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nfts/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `NFT ${params.id} — Zenkaihood` },
      { name: "description", content: `View details, traits and listing history for Zenkaihood NFT ${params.id}.` },
      { property: "og:title", content: `NFT ${params.id} — Zenkaihood` },
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
  const { wallet } = useWallet();
  const [liked, setLiked] = useState(false);
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);

  // id format: "{collectionAddress}-{tokenId}"
  const dashIdx = id.lastIndexOf("-");
  const collectionAddress = dashIdx !== -1 ? id.slice(0, dashIdx).toLowerCase() : id.toLowerCase();
  const tokenId = dashIdx !== -1 ? id.slice(dashIdx + 1) : "0";
  const tokenEntityId = `${collectionAddress}-${tokenId}`;

  // Token ownership
  const { data: tokenData, isLoading: tokenLoading } = useQuery({
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

  // Active offers for this NFT
  const { data: offersData } = useQuery({
    queryKey: ["asset-offers", collectionAddress, tokenId],
    queryFn: () => gqlClient.request<OffersForAssetResult>(GET_OFFERS_FOR_ASSET, {
      collection: collectionAddress,
      tokenId,
    }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const token = tokenData?.token;
  const listings = listingsData?.listings ?? [];
  const offers = offersData?.offers ?? [];

  // Find cheapest active listing
  const activeListing = listings.find((l) => l.active);
  const listingId = activeListing ? BigInt(activeListing.id) : undefined;

  // Live fee quote for active listing
  const { data: quote } = useListingQuote(listingId, 1n);

  // Purchase hook
  const { buy, buyERC20, isPending, isConfirming } = usePurchase();

  // Resolve token metadata from collection metadataURI
  useEffect(() => {
    if (token?.collection.metadataURI) {
      fetchMetadata(token.collection.metadataURI).then(setMetadata);
    }
  }, [token?.collection.metadataURI]);

  const ownerShort = token?.owner
    ? `${token.owner.slice(0, 6)}…${token.owner.slice(-4)}`
    : "Unknown";

  const isOwner = wallet && token?.owner?.toLowerCase() === wallet.toLowerCase();
  const isEthListing = activeListing?.paymentToken === ETH_ADDRESS;

  async function handleBuy() {
    if (!activeListing || !quote) return;
    try {
      if (isEthListing) {
        await buy(BigInt(activeListing.id), 1n, (quote as { buyerTotal: bigint }).buyerTotal);
      } else {
        await buyERC20(BigInt(activeListing.id), 1n);
      }
      toast.success("Purchase successful!", { id: "buy" });
    } catch (err) {
      toast.error(parseContractError(err), { id: "buy" });
    }
  }

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
                <img
                  src={resolveImageUri(metadata.image) ?? ""}
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

            {/* Buy panel */}
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
                  {quote && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Total (incl. fees): {formatEthCompact((quote as { buyerTotal: bigint }).buyerTotal)}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isOwner && (
                      <Button
                        className="press"
                        onClick={handleBuy}
                        disabled={!wallet || isPending || isConfirming || !quote}
                      >
                        {isPending ? "Confirm in wallet…" : isConfirming ? "Processing…" : "Buy Now"}
                        <WalletCards />
                      </Button>
                    )}
                    <Button variant="outline" className="press"><WalletCards /> Make Offer</Button>
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
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Not currently listed for sale.</p>
                  <div className="flex flex-wrap gap-2">
                    {isOwner && (
                      <Button className="press"><WalletCards /> List for Sale</Button>
                    )}
                    <Button variant="outline" className="press"><WalletCards /> Make Offer</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Offers */}
            {offers.length > 0 && (
              <div className="rounded-md border border-border bg-surface/90 p-4">
                <h2 className="font-display text-base font-semibold">Offers ({offers.length})</h2>
                <div className="mt-3 divide-y divide-border">
                  {offers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between py-2 text-xs">
                      <span>{offer.offerer.slice(0, 8)}…</span>
                      <b>{offer.paymentToken === ETH_ADDRESS
                        ? formatEthCompact(BigInt(offer.amount))
                        : `${offer.amount} tokens`}</b>
                      <span className="text-muted-foreground">
                        Exp. {new Date(Number(offer.expiration) * 1000).toLocaleDateString()}
                      </span>
                      {isOwner && (
                        <Button size="sm" variant="outline" className="text-xs">Accept</Button>
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
