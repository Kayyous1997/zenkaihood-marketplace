import { useReadContract } from "wagmi";
import { marketplaceAbi } from "@/contracts/marketplaceAbi";
import { useAddresses } from "@/lib/deployments";
import { usePurchase } from "./usePurchase";

/** Maximum items allowed in a single sweep transaction (contract constant). */
export const MAX_SWEEP_ITEMS = 50;

/**
 * Cart item for the sweep/multi-buy feature.
 */
export interface CartItem {
  listingId: bigint;
  quantity: bigint;
  /** paymentToken address — must be identical for all items in the cart */
  paymentToken: string;
  /** pricePerItem in wei — for client-side total display before on-chain quote */
  pricePerItem: bigint;
}

/**
 * Read the precise sweep total from the contract.
 * Returns { totalPrice, totalPlatformFee, totalRoyalty }.
 * Use totalPrice as msg.value for buyListings().
 *
 * Only enabled when:
 *  - At least 1 item in cart
 *  - All items share the same paymentToken
 *  - No more than MAX_SWEEP_ITEMS
 */
export function useSweepTotal(items: CartItem[]) {
  const addrs = useAddresses();

  const listingIds = items.map((i) => i.listingId);
  const quantities = items.map((i) => i.quantity);

  const allSameToken =
    items.length > 0 &&
    items.every((i) => i.paymentToken === items[0]!.paymentToken);

  return useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "getSweepTotal",
    args: [listingIds, quantities],
    query: {
      enabled:
        !!addrs &&
        items.length > 0 &&
        items.length <= MAX_SWEEP_ITEMS &&
        allSameToken,
    },
  });
}

/**
 * Hook: multi-buy sweep cart + execution.
 *
 * Usage:
 *   const sweep = useSweep();
 *   sweep.addItem({ listingId: 1n, quantity: 1n, paymentToken: "0x0...", pricePerItem: parseEther("1") })
 *   const total = useSweepTotal(sweep.items)
 *   sweep.execute(total.data?.totalPrice ?? 0n)   // ETH sweep
 *
 * Validation enforced:
 *  - All items must share the same paymentToken
 *  - No duplicate listingIds
 *  - Max MAX_SWEEP_ITEMS (50) items
 */
export function useSweep() {
  const { buyListings, buyListingsERC20, isPending, isConfirming, isSuccess, reset } =
    usePurchase();

  /**
   * Execute a sweep purchase.
   * Auto-detects ETH vs ERC-20 from cart items' paymentToken.
   *
   * @param items       Cart items to purchase
   * @param totalPrice  Exact total from useSweepTotal().data.totalPrice
   *
   * For ERC-20 sweeps: caller must first call usePurchase().approveErc20()
   * with the same totalPrice before calling this.
   */
  async function execute(items: CartItem[], totalPrice: bigint) {
    const listingIds = items.map((i) => i.listingId);
    const quantities = items.map((i) => i.quantity);
    const isEth =
      items[0]?.paymentToken === "0x0000000000000000000000000000000000000000";

    if (isEth) {
      return buyListings(listingIds, quantities, totalPrice);
    } else {
      return buyListingsERC20(listingIds, quantities);
    }
  }

  /** Client-side validation before sending the transaction. */
  function validate(items: CartItem[]): string | null {
    if (items.length === 0) return "Cart is empty.";
    if (items.length > MAX_SWEEP_ITEMS)
      return `Maximum ${MAX_SWEEP_ITEMS} items per sweep.`;

    const token = items[0]!.paymentToken;
    if (!items.every((i) => i.paymentToken === token))
      return "All items must use the same payment token.";

    const ids = items.map((i) => i.listingId.toString());
    if (new Set(ids).size !== ids.length) return "Duplicate listings in cart.";

    return null;
  }

  return { execute, validate, isPending, isConfirming, isSuccess, reset };
}
