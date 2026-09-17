import { useReadContract } from "wagmi";
import { marketplaceAbi } from "@/contracts/marketplaceAbi";
import { useAddresses } from "@/lib/deployments";

/**
 * SaleQuote returned by the Marketplace contract.
 * Mirrors the Solidity struct:
 *   { itemPrice, platformFee, royaltyAmount, buyerTotal, sellerProceeds, royaltyRecipient }
 */
export interface SaleQuote {
  itemPrice: bigint;
  platformFee: bigint;
  royaltyAmount: bigint;
  /** Total the buyer must pay (itemPrice + platformFee + royaltyAmount). */
  buyerTotal: bigint;
  /** What the seller receives (= itemPrice; fees are added on top by the buyer). */
  sellerProceeds: bigint;
  royaltyRecipient: `0x${string}`;
}

/**
 * Fetch a live price breakdown for an active listing.
 * Use this immediately before calling buy() to get the exact msg.value required.
 *
 * @param listingId  On-chain listing ID (bigint)
 * @param quantity   Quantity the user wants to buy
 */
export function useListingQuote(
  listingId: bigint | undefined,
  quantity: bigint | undefined,
) {
  const addrs = useAddresses();
  return useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "getListingQuote",
    args:
      listingId !== undefined && quantity !== undefined
        ? [listingId, quantity]
        : undefined,
    query: {
      enabled:
        !!addrs &&
        listingId !== undefined &&
        listingId > 0n &&
        quantity !== undefined &&
        quantity > 0n,
    },
  });
}

/**
 * Fetch a live price breakdown for any sale amount without needing a listing ID.
 * Used for: offer dialogs, auction bid previews, new listing fee summaries.
 *
 * @param nftContract  NFT collection contract address
 * @param tokenId      Token ID
 * @param itemPrice    Gross price in wei (the amount the seller sets)
 */
export function useSaleQuote(
  nftContract: `0x${string}` | undefined,
  tokenId: bigint | undefined,
  itemPrice: bigint | undefined,
) {
  const addrs = useAddresses();
  return useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "getSaleQuote",
    args:
      nftContract && tokenId !== undefined && itemPrice !== undefined
        ? [nftContract, tokenId, itemPrice]
        : undefined,
    query: {
      enabled:
        !!addrs &&
        !!nftContract &&
        tokenId !== undefined &&
        itemPrice !== undefined &&
        itemPrice > 0n,
    },
  });
}
