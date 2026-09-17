import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSignTypedData,
} from "wagmi";
import { toast } from "sonner";
import { marketplaceAbi } from "@/contracts/marketplaceAbi";
import { erc20Abi } from "@/contracts/erc20Abi";
import { useAddresses, useAddresses as useAddrs } from "@/lib/deployments";
import { parseContractError } from "@/lib/contract-errors";
import { CHAIN_ID } from "@/contracts/addresses";

/** EIP-712 domain for the Marketplace contract. */
const SIGNED_OFFER_DOMAIN = {
  name: "Marketplace",
  version: "1",
  chainId: CHAIN_ID,
} as const;

/** EIP-712 types for SignedOffer. Must match SIGNED_OFFER_TYPEHASH in Marketplace.sol. */
const SIGNED_OFFER_TYPES = {
  SignedOffer: [
    { name: "offerer", type: "address" },
    { name: "nftContract", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "quantity", type: "uint256" },
    { name: "paymentToken", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "deadline", type: "uint64" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export interface SignedOfferMessage {
  offerer: `0x${string}`;
  nftContract: `0x${string}`;
  tokenId: bigint;
  quantity: bigint;
  paymentToken: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  nonce: bigint;
}

/**
 * Read the current EIP-712 nonce for an offerer address.
 * Must be included in signOffer() to prevent replay.
 */
export function useOfferNonce(offerer: `0x${string}` | undefined) {
  const addrs = useAddresses();
  return useReadContract({
    address: addrs?.marketplace,
    abi: marketplaceAbi,
    functionName: "offerNonces",
    args: offerer ? [offerer] : undefined,
    query: { enabled: !!addrs && !!offerer },
  });
}

/**
 * Write hook: create, cancel, accept on-chain offers + EIP-712 signed offers.
 *
 * ETH offer flow:
 *  1. useSaleQuote(nft, tokenId, amount) → quote.buyerTotal
 *  2. createOffer(nft, tokenId, qty, amount, expiration, quote.buyerTotal)
 *
 * ERC-20 offer flow:
 *  1. useSaleQuote → quote.buyerTotal
 *  2. approveErc20(paymentToken, quote.buyerTotal)
 *  3. createOfferERC20(nft, tokenId, qty, paymentToken, amount, expiration)
 *
 * Signed offer flow (buyer signs, NFT owner executes):
 *  1. Buyer: signOffer(message) → signature
 *  2. Share signature off-chain
 *  3. Seller: executeSignedOffer(message, signature, buyerTotal)
 *
 * Accept offer flow (NFT owner):
 *  1. Ensure marketplace is approved (setApprovalForAll)
 *  2. acceptOffer(offerId)
 */
export function useOffer() {
  const addrs = useAddrs();
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { signTypedDataAsync } = useSignTypedData();

  /** Approve ERC-20 spend before createOfferERC20. */
  async function approveErc20(paymentToken: `0x${string}`, amount: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Approving token spend…", { id: "offer-approve" });
      const txHash = await writeContractAsync({
        address: paymentToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [addrs.marketplace, amount],
      });
      toast.loading("Waiting for approval…", { id: "offer-approve" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "offer-approve" });
      throw err;
    }
  }

  /**
   * Create an ETH-funded on-chain offer.
   * @param buyerTotal  Exact wei from getSaleQuote().buyerTotal — sent as msg.value
   */
  async function createOffer(
    nftContract: `0x${string}`,
    tokenId: bigint,
    quantity: bigint,
    amount: bigint,
    expiration: bigint,
    buyerTotal: bigint,
  ) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Submitting offer…", { id: "offer" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "createOffer",
        args: [nftContract, tokenId, quantity, amount, expiration],
        value: buyerTotal,
      });
      toast.loading("Waiting for confirmation…", { id: "offer" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "offer" });
      throw err;
    }
  }

  /**
   * Create an ERC-20-funded on-chain offer.
   * Requires prior approveErc20(paymentToken, quote.buyerTotal).
   */
  async function createOfferERC20(
    nftContract: `0x${string}`,
    tokenId: bigint,
    quantity: bigint,
    paymentToken: `0x${string}`,
    amount: bigint,
    expiration: bigint,
  ) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Submitting offer…", { id: "offer" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "createOfferERC20",
        args: [nftContract, tokenId, quantity, paymentToken, amount, expiration],
      });
      toast.loading("Waiting for confirmation…", { id: "offer" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "offer" });
      throw err;
    }
  }

  /** Cancel an active offer and refund the escrowed funds. */
  async function cancelOffer(offerId: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Cancelling offer…", { id: "cancel-offer" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "cancelOffer",
        args: [offerId],
      });
      toast.loading("Waiting for confirmation…", { id: "cancel-offer" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "cancel-offer" });
      throw err;
    }
  }

  /** Refund an expired offer (callable by anyone once expiration has passed). */
  async function refundExpiredOffer(offerId: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Refunding expired offer…", { id: "refund-offer" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "refundExpiredOffer",
        args: [offerId],
      });
      toast.loading("Waiting for confirmation…", { id: "refund-offer" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "refund-offer" });
      throw err;
    }
  }

  /**
   * Accept an active offer as the NFT owner.
   * Caller must own the NFT and have approved the marketplace.
   */
  async function acceptOffer(offerId: bigint) {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Accepting offer…", { id: "accept-offer" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "acceptOffer",
        args: [offerId],
      });
      toast.loading("Waiting for confirmation…", { id: "accept-offer" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "accept-offer" });
      throw err;
    }
  }

  /**
   * Sign an offer off-chain using EIP-712 typed data (gasless for the buyer).
   * The resulting signature is passed to executeSignedOffer by the NFT owner.
   *
   * @param message  SignedOfferMessage — must include current nonce from useOfferNonce()
   * @returns        Hex signature string
   */
  async function signOffer(message: SignedOfferMessage): Promise<`0x${string}`> {
    if (!addrs) throw new Error("Unsupported chain.");
    try {
      toast.loading("Waiting for signature…", { id: "sign-offer" });
      const sig = await signTypedDataAsync({
        domain: {
          ...SIGNED_OFFER_DOMAIN,
          verifyingContract: addrs.marketplace,
        },
        types: SIGNED_OFFER_TYPES,
        primaryType: "SignedOffer",
        message,
      });
      toast.success("Offer signed!", { id: "sign-offer" });
      return sig;
    } catch (err) {
      toast.error(parseContractError(err), { id: "sign-offer" });
      throw err;
    }
  }

  /**
   * Execute a signed offer as the NFT owner (seller pays gas).
   * Payment is pulled from signedOffer.offerer.
   *
   * @param signedOffer  The offer message (same struct the buyer signed)
   * @param signature    Hex signature from signOffer()
   * @param buyerTotal   Exact wei from getSaleQuote() — sent as msg.value for ETH offers
   */
  async function executeSignedOffer(
    signedOffer: SignedOfferMessage,
    signature: `0x${string}`,
    buyerTotal: bigint,
  ) {
    if (!addrs) throw new Error("Unsupported chain.");
    const isEth =
      signedOffer.paymentToken === "0x0000000000000000000000000000000000000000";
    try {
      toast.loading("Executing signed offer…", { id: "exec-offer" });
      const txHash = await writeContractAsync({
        address: addrs.marketplace,
        abi: marketplaceAbi,
        functionName: "executeSignedOffer",
        args: [signedOffer, signature],
        value: isEth ? buyerTotal : 0n,
      });
      toast.loading("Waiting for confirmation…", { id: "exec-offer" });
      return txHash;
    } catch (err) {
      toast.error(parseContractError(err), { id: "exec-offer" });
      throw err;
    }
  }

  return {
    approveErc20,
    createOffer,
    createOfferERC20,
    cancelOffer,
    refundExpiredOffer,
    acceptOffer,
    signOffer,
    executeSignedOffer,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  };
}
