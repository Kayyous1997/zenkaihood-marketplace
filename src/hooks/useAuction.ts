import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { marketplaceAbi } from "@/contracts/marketplaceAbi";
import { erc20Abi } from "@/contracts/erc20Abi";
import { erc721Abi } from "@/contracts/erc721Abi";
import { erc1155Abi } from "@/contracts/erc1155Abi";
import { useAddresses } from "@/lib/deployments";
import { parseContractError } from "@/lib/contract-errors";

/**
 * Read the minimum valid next bid for an active auction.
 * Returns { grossBid, buyerTotal } — use buyerTotal as msg.value for placeBid().
 *
 * - If no bids yet: grossBid = reservePrice
 * - Otherwise:      grossBid = highestBid + highestBid * minimumBidIncrementBps / 10_000
 *                              (default increment is 5%)
 */
export function useMinimumBid(auctionId: bigint | undefined) {
  const addrs = useAddresses();
  return useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "getMinimumBid",
    args: auctionId !== undefined ? [auctionId] : undefined,
    query: {
      enabled: !!addrs && auctionId !== undefined && auctionId > 0n,
      // Poll every 6 seconds to keep auction pages feeling live
      refetchInterval: 6_000,
    },
  });
}

/**
 * Write hook: create auctions, place bids, cancel, and settle.
 *
 * Create auction flow:
 *  1. Approve marketplace on NFT contract (setApprovalForAll or approve)
 *  2. createAuction(nft, tokenId, qty, paymentToken, reservePrice, startTime, endTime)
 *
 * ETH bid flow:
 *  1. useMinimumBid(auctionId) → { grossBid, buyerTotal }
 *  2. placeBid(auctionId, grossBid, buyerTotal)   ← buyerTotal = msg.value
 *
 * ERC-20 bid flow:
 *  1. useMinimumBid(auctionId) → { grossBid, buyerTotal }
 *  2. approveErc20(paymentToken, buyerTotal)
 *  3. placeBidERC20(auctionId, grossBid)
 *
 * Cancel: only possible when highestBidder == address(0) (no bids placed yet).
 * Settle: callable by anyone once block.timestamp > auction.endTime.
 *
 * Anti-sniping: if a bid arrives within 5 minutes of endTime, the contract
 * extends endTime by 5 minutes. The BidPlaced event contains the new endTime.
 */
export function useAuction() {
  const addrs = useAddresses();
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  /** Approve marketplace on an ERC-721 or ERC-1155 contract before creating an auction. */
  async function approveAll(nftContract: `0x${string}`, isErc1155 = false) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Approving marketplace…", { id: "auction-approve" });
      const abi = isErc1155 ? erc1155Abi : erc721Abi;
      const txHash = await writeContractAsync({
        address: nftContract,
        abi,
        functionName: "setApprovalForAll",
        args: [addrs.marketplace, true],
      });
      toast.loading("Waiting for approval…", { id: "auction-approve" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "auction-approve" });
      throw err;
    }
  }

  /** Approve ERC-20 before placeBidERC20. */
  async function approveErc20(paymentToken: `0x${string}`, amount: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Approving token spend…", { id: "bid-approve" });
      const txHash = await writeContractAsync({
        address: paymentToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [addrs.marketplace, amount],
      });
      toast.loading("Waiting for approval…", { id: "bid-approve" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "bid-approve" });
      throw err;
    }
  }

  /**
   * Create an auction.
   * @param paymentToken  address(0) = ETH, else ERC-20 token address
   * @param reservePrice  Minimum bid to win (in wei)
   * @param startTime     Unix seconds — when bidding opens
   * @param endTime       Unix seconds — when bidding closes
   */
  async function createAuction(
    nftContract: `0x${string}`,
    tokenId: bigint,
    quantity: bigint,
    paymentToken: `0x${string}`,
    reservePrice: bigint,
    startTime: bigint,
    endTime: bigint,
  ) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Creating auction…", { id: "auction" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "createAuction",
        args: [nftContract, tokenId, quantity, paymentToken, reservePrice, startTime, endTime],
      });
      toast.loading("Waiting for confirmation…", { id: "auction" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "auction" });
      throw err;
    }
  }

  /**
   * Place an ETH bid.
   * @param amount      Gross bid amount in wei (from useMinimumBid().grossBid or higher)
   * @param buyerTotal  Exact escrow from useMinimumBid().buyerTotal — sent as msg.value
   */
  async function placeBid(auctionId: bigint, amount: bigint, buyerTotal: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Placing bid…", { id: "bid" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "placeBid",
        args: [auctionId, amount],
        value: buyerTotal,
      });
      toast.loading("Waiting for confirmation…", { id: "bid" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "bid" });
      throw err;
    }
  }

  /**
   * Place an ERC-20 bid.
   * Requires prior approveErc20(paymentToken, buyerTotal).
   * @param amount  Gross bid amount (from useMinimumBid().grossBid or higher)
   */
  async function placeBidERC20(auctionId: bigint, amount: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Placing bid…", { id: "bid" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "placeBidERC20",
        args: [auctionId, amount],
      });
      toast.loading("Waiting for confirmation…", { id: "bid" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "bid" });
      throw err;
    }
  }

  /**
   * Cancel an auction.
   * Only possible when no bids have been placed (highestBidder == address(0)).
   * Caller must be the seller or contract owner.
   */
  async function cancelAuction(auctionId: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Cancelling auction…", { id: "cancel-auction" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "cancelAuction",
        args: [auctionId],
      });
      toast.loading("Waiting for confirmation…", { id: "cancel-auction" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "cancel-auction" });
      throw err;
    }
  }

  /**
   * Settle a finished auction — callable by anyone after endTime.
   * If no valid bids (highestBid < reservePrice), escrow is refunded.
   * Otherwise, NFT transfers to winner and seller receives proceeds.
   */
  async function settleAuction(auctionId: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Settling auction…", { id: "settle" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "settleAuction",
        args: [auctionId],
      });
      toast.loading("Waiting for confirmation…", { id: "settle" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "settle" });
      throw err;
    }
  }

  return {
    approveAll,
    approveErc20,
    createAuction,
    placeBid,
    placeBidERC20,
    cancelAuction,
    settleAuction,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  };
}
