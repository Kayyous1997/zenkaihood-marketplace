import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { marketplaceAbi } from "@/contracts/marketplaceAbi";
import { erc20Abi } from "@/contracts/erc20Abi";
import { useAddresses } from "@/lib/deployments";
import { parseContractError } from "@/lib/contract-errors";

/**
 * Write hook: buy a single listing or sweep multiple listings.
 *
 * ETH purchase flow:
 *  1. Call useListingQuote(listingId, qty) → get quote.buyerTotal
 *  2. Call buy(listingId, qty, quote.buyerTotal)
 *
 * ERC-20 purchase flow:
 *  1. Call useListingQuote(listingId, qty) → get quote.buyerTotal
 *  2. Call approveErc20(paymentToken, quote.buyerTotal)
 *  3. Call buyERC20(listingId, qty)
 *
 * Sweep (ETH) flow:
 *  1. Call getSweepTotal(listingIds, quantities) on-chain → totalPrice
 *  2. Call buyListings(listingIds, quantities, totalPrice)
 *
 * Sweep (ERC-20) flow:
 *  1. getSweepTotal → totalPrice
 *  2. approveErc20(paymentToken, totalPrice)
 *  3. buyListingsERC20(listingIds, quantities)
 */
export function usePurchase() {
  const addrs = useAddresses();
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  /**
   * Approve an ERC-20 spend allowance on the Marketplace.
   * Call this before buyERC20 / buyListingsERC20.
   */
  async function approveErc20(paymentToken: `0x${string}`, amount: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Approving token spend…", { id: "erc20-approve" });
      const txHash = await writeContractAsync({
        address: paymentToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [addrs.marketplace, amount],
      });
      toast.loading("Waiting for approval…", { id: "erc20-approve" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "erc20-approve" });
      throw err;
    }
  }

  /**
   * Buy a single ETH-priced listing.
   * @param listingId    On-chain listing ID
   * @param quantity     Amount to buy
   * @param buyerTotal   Exact wei from getListingQuote().buyerTotal (used as msg.value)
   */
  async function buy(listingId: bigint, quantity: bigint, buyerTotal: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Buying NFT…", { id: "buy" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "buy",
        args: [listingId, quantity],
        value: buyerTotal,
      });
      toast.loading("Waiting for confirmation…", { id: "buy" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "buy" });
      throw err;
    }
  }

  /**
   * Buy a single ERC-20-priced listing.
   * Requires prior approveErc20(paymentToken, quote.buyerTotal).
   */
  async function buyERC20(listingId: bigint, quantity: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Buying NFT…", { id: "buy" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "buyERC20",
        args: [listingId, quantity],
      });
      toast.loading("Waiting for confirmation…", { id: "buy" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "buy" });
      throw err;
    }
  }

  /**
   * Sweep-buy multiple ETH-priced listings in one transaction (max 50).
   * All listings must share paymentToken = address(0).
   * @param listingIds   Array of listing IDs
   * @param quantities   Matching array of quantities
   * @param totalPrice   Sum from getSweepTotal().totalPrice (used as msg.value)
   */
  async function buyListings(
    listingIds: bigint[],
    quantities: bigint[],
    totalPrice: bigint,
  ) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading(`Buying ${listingIds.length} NFTs…`, { id: "sweep" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "buyListings",
        args: [listingIds, quantities],
        value: totalPrice,
      });
      toast.loading("Waiting for confirmation…", { id: "sweep" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "sweep" });
      throw err;
    }
  }

  /**
   * Sweep-buy multiple ERC-20-priced listings in one transaction.
   * Requires prior approveErc20(paymentToken, totalPrice).
   */
  async function buyListingsERC20(listingIds: bigint[], quantities: bigint[]) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading(`Buying ${listingIds.length} NFTs…`, { id: "sweep" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "buyListingsERC20",
        args: [listingIds, quantities],
      });
      toast.loading("Waiting for confirmation…", { id: "sweep" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "sweep" });
      throw err;
    }
  }

  return {
    approveErc20,
    buy,
    buyERC20,
    buyListings,
    buyListingsERC20,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  };
}
