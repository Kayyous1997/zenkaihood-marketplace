import { Link } from "@tanstack/react-router";

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
    <Link
      to="/nfts/$id"
      params={{ id: `${collectionId}-${tokenId}` }}
      className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg animate-fade-in-up"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {imageUri ? (
          <IpfsImg uri={imageUri} alt={name} className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="size-full bg-muted" />
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-semibold">{name || `#${tokenId}`}</p>
        <p className="text-sm font-semibold">{price}</p>
      </div>
    </Link>
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
        <p className="truncate text-[11px] text-muted-foreground">{collectionId.slice(0, 6)}…{collectionId.slice(-4)}</p>
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
