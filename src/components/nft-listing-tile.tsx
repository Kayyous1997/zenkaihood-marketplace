import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

import { IpfsImg } from "@/components/ipfs-img";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { formatEthCompact } from "@/lib/token-format";

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

export function NftListingTile({
  collectionId,
  tokenId,
  pricePerItem,
  paymentToken,
  index = 0,
}: {
  collectionId: string;
  tokenId: string;
  pricePerItem: string;
  paymentToken: string;
  index?: number;
}) {
  const { imageUri, name } = useTokenMetadata(collectionId as `0x${string}`, tokenId);
  const price = paymentToken === ETH_ADDRESS ? formatEthCompact(BigInt(pricePerItem)) : pricePerItem;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg animate-fade-in-up"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionId}-${tokenId}` }} className="block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUri ? (
            <IpfsImg
              uri={imageUri}
              alt={name}
              className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="size-full bg-muted" />
          )}

          {/* Quick Buy hover overlay — slides up from bottom on group-hover */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full pt-8 transition-transform duration-200 ease-out group-hover:translate-y-0 group-hover:pointer-events-auto">
            <div className="bg-gradient-to-t from-card via-card/80 to-transparent p-2">
              <span className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-md transition hover:bg-primary/90">
                <ShoppingCart className="size-3" /> Buy Now · {price}
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-0.5 p-3">
          <p className="truncate text-xs font-semibold group-hover:text-primary transition-colors">
            {name || `#${tokenId}`}
          </p>
          <p className="font-mono text-xs font-bold text-foreground">{price}</p>
        </div>
      </Link>
    </div>
  );
}

export function NftListingRow({
  collectionId,
  tokenId,
  pricePerItem,
  paymentToken,
  createdAt,
}: {
  collectionId: string;
  tokenId: string;
  pricePerItem: string;
  paymentToken: string;
  createdAt?: string;
}) {
  const { imageUri, name } = useTokenMetadata(collectionId as `0x${string}`, tokenId);
  const price = paymentToken === ETH_ADDRESS ? formatEthCompact(BigInt(pricePerItem)) : pricePerItem;

  return (
    <Link
      to="/nfts/$id"
      params={{ id: `${collectionId}-${tokenId}` }}
      className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0 hover:bg-muted/30"
    >
      <div className="size-10 overflow-hidden rounded-lg bg-muted">
        {imageUri ? <IpfsImg uri={imageUri} alt={name} className="size-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name || `#${tokenId}`}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {collectionId.slice(0, 6)}…{collectionId.slice(-4)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{price}</p>
        {createdAt && (
          <p className="text-[10px] text-muted-foreground">
            {new Date(Number(createdAt) * 1000).toLocaleDateString()}
          </p>
        )}
      </div>
    </Link>
  );
}
