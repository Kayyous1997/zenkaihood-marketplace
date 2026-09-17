import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { marketplaceAbi } from "@/contracts/marketplaceAbi";
import { erc721Abi } from "@/contracts/erc721Abi";
import { erc1155Abi } from "@/contracts/erc1155Abi";
import { useAddresses } from "@/lib/deployments";
import { parseContractError } from "@/lib/contract-errors";

/**
 * Check if the marketplace is approved to transfer a specific ERC-721 token.
 * Returns true if either getApproved(tokenId) == marketplace
 * or isApprovedForAll(owner, marketplace) == true.
 */
export function useIsApproved721(
  nftContract: `0x${string}` | undefined,
  tokenId: bigint | undefined,
  owner: `0x${string}` | undefined,
) {
  const addrs = useAddresses();

  const { data: approvedFor } = useReadContract({
    address: nftContract,
    abi: erc721Abi,
    functionName: "getApproved",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: !!nftContract && tokenId !== undefined },
  });

  const { data: approvedForAll } = useReadContract({
    address: nftContract,
    abi: erc721Abi,
    functionName: "isApprovedForAll",
    args: owner && addrs ? [owner, addrs.marketplace] : undefined,
    query: { enabled: !!nftContract && !!owner && !!addrs },
  });

  return (
    approvedFor === addrs?.marketplace || approvedForAll === true
  );
}

/**
 * Check if the marketplace is approved to transfer all ERC-1155 tokens
 * for a given owner.
 */
export function useIsApproved1155(
  nftContract: `0x${string}` | undefined,
  owner: `0x${string}` | undefined,
) {
  const addrs = useAddresses();
  const { data } = useReadContract({
    address: nftContract,
    abi: erc1155Abi,
    functionName: "isApprovedForAll",
    args: owner && addrs ? [owner, addrs.marketplace] : undefined,
    query: { enabled: !!nftContract && !!owner && !!addrs },
  });
  return data === true;
}

/**
 * Write hook: create and cancel listings.
 *
 * Listing flow:
 *  1. approveAll(nftContract, isErc1155) — setApprovalForAll → marketplace
 *     OR approve721(nftContract, tokenId) — per-token approval for ERC-721
 *  2. createListing(params)
 *
 * Cancel flow:
 *  - cancelListing(listingId)
 *
 * Pre-conditions:
 *  - Collection must be registered AND active in CollectionRegistry
 *  - endTime > startTime (both are unix seconds as bigint)
 *  - pricePerItem > 0n
 *  - quantity must be 1n for ERC-721
 *  - paymentToken = "0x0000...0000" for ETH, or a supported ERC-20 address
 */
export function useListing() {
  const addrs = useAddresses();
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  /** Grant marketplace setApprovalForAll on an ERC-721 or ERC-1155 contract. */
  async function approveAll(nftContract: `0x${string}`, isErc1155 = false) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Approving marketplace…", { id: "approve" });
      const abi = isErc1155 ? erc1155Abi : erc721Abi;
      const txHash = await writeContractAsync({
        address: nftContract,
        abi,
        functionName: "setApprovalForAll",
        args: [addrs.marketplace, true],
      });
      toast.loading("Waiting for approval…", { id: "approve" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "approve" });
      throw err;
    }
  }

  /** Per-token approval for a single ERC-721 (alternative to approveAll). */
  async function approve721(nftContract: `0x${string}`, tokenId: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Approving token…", { id: "approve" });
      const txHash = await writeContractAsync({
        address: nftContract,
        abi: erc721Abi,
        functionName: "approve",
        args: [addrs.marketplace, tokenId],
      });
      toast.loading("Waiting for approval…", { id: "approve" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "approve" });
      throw err;
    }
  }

  /**
   * Create a fixed-price listing on the Marketplace.
   *
   * @param nftContract   NFT contract address
   * @param tokenId       Token ID
   * @param quantity      Amount to list (must be 1n for ERC-721)
   * @param paymentToken  address(0) = ETH, else ERC-20 token address
   * @param pricePerItem  Price in wei (or token base units) per single item
   * @param startTime     Unix timestamp (seconds) when listing becomes active
   * @param endTime       Unix timestamp (seconds) when listing expires
   */
  async function createListing(
    nftContract: `0x${string}`,
    tokenId: bigint,
    quantity: bigint,
    paymentToken: `0x${string}`,
    pricePerItem: bigint,
    startTime: bigint,
    endTime: bigint,
  ) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Creating listing…", { id: "listing" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "createListing",
        args: [nftContract, tokenId, quantity, paymentToken, pricePerItem, startTime, endTime],
      });
      toast.loading("Waiting for confirmation…", { id: "listing" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "listing" });
      throw err;
    }
  }

  /** Cancel an active listing. Caller must be the seller or contract owner. */
  async function cancelListing(listingId: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Cancelling listing…", { id: "cancel-listing" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "cancelListing",
        args: [listingId],
      });
      toast.loading("Waiting for confirmation…", { id: "cancel-listing" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "cancel-listing" });
      throw err;
    }
  }

  return {
    approveAll,
    approve721,
    createListing,
    cancelListing,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  };
}
