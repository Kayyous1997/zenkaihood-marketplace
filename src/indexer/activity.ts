/** Activity.type values written by the subgraph mappings. */
export const SALE_ACTIVITY_TYPES = [
  "NFT_SOLD",
  "OFFER_ACCEPTED",
  "SIGNED_OFFER_EXECUTED",
  "AUCTION_SETTLED",
  "LISTINGS_SWEPT",
] as const;

export const LISTING_ACTIVITY_TYPES = ["LISTING_CREATED", "LISTING_CANCELLED"] as const;

export const BID_ACTIVITY_TYPES = [
  "BID_PLACED",
  "AUCTION_CREATED",
  "AUCTION_CANCELLED",
  "AUCTION_SETTLED",
] as const;

export const TRANSFER_ACTIVITY_TYPES = [
  "ERC721_TRANSFER",
  "ERC1155_TRANSFER",
  "ERC1155_TRANSFER_BATCH",
] as const;

const LABELS: Record<string, string> = {
  NFT_SOLD: "Sale",
  OFFER_ACCEPTED: "Sale",
  SIGNED_OFFER_EXECUTED: "Sale",
  AUCTION_SETTLED: "Sale",
  LISTINGS_SWEPT: "Purchase",
  LISTING_CREATED: "Listing",
  LISTING_CANCELLED: "Listing",
  BID_PLACED: "Bid",
  AUCTION_CREATED: "Bid",
  AUCTION_CANCELLED: "Bid",
  ERC721_TRANSFER: "Transfer",
  ERC1155_TRANSFER: "Transfer",
  ERC1155_TRANSFER_BATCH: "Transfer",
  OFFER_CREATED: "Offer",
  OFFER_CANCELLED: "Offer",
  COLLECTION_REGISTERED: "Collection",
};

export function activityLabel(type: string): string {
  return LABELS[type] ?? type.replaceAll("_", " ");
}

export function activityKind(type: string): "Sale" | "Purchase" | "Listing" | "Bid" | "Transfer" {
  if ((SALE_ACTIVITY_TYPES as readonly string[]).includes(type) || type === "LISTINGS_SWEPT") {
    return type === "LISTINGS_SWEPT" ? "Purchase" : "Sale";
  }
  if ((LISTING_ACTIVITY_TYPES as readonly string[]).includes(type)) return "Listing";
  if ((BID_ACTIVITY_TYPES as readonly string[]).includes(type)) return "Bid";
  if ((TRANSFER_ACTIVITY_TYPES as readonly string[]).includes(type)) return "Transfer";
  return "Sale";
}

export function isSaleActivity(type: string): boolean {
  return (SALE_ACTIVITY_TYPES as readonly string[]).includes(type);
}

export function isListingActivity(type: string): boolean {
  return (LISTING_ACTIVITY_TYPES as readonly string[]).includes(type);
}

export function isBidActivity(type: string): boolean {
  return (BID_ACTIVITY_TYPES as readonly string[]).includes(type);
}

export function isTransferActivity(type: string): boolean {
  return (TRANSFER_ACTIVITY_TYPES as readonly string[]).includes(type);
}
