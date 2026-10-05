/**
 * Phase 5 — Action Dialogs
 * All buy/offer/sell/bid/auction/sweep flows connected to real contract hooks.
 */
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight, Gavel, RefreshCw, ShoppingCart, Tag, WalletCards, X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWallet } from "@/lib/wallet";
import { useAddresses } from "@/lib/deployments";
import { useListing, useIsApproved721, useIsApproved1155 } from "@/hooks/useListing";
import { useListingQuote, useSaleQuote } from "@/hooks/useListingQuote";
import { usePurchase } from "@/hooks/usePurchase";
import { useOffer } from "@/hooks/useOffer";
import { useAuction, useMinimumBid } from "@/hooks/useAuction";
import { useSweep, useSweepTotal, type CartItem } from "@/hooks/useSweep";
import { parseContractError } from "@/lib/contract-errors";
import { txUrl } from "@/lib/basescan";
import { formatEth, formatEthCompact, formatBps, parseEthInput } from "@/lib/token-format";
import { cn } from "@/lib/utils";
import { useMarketplaceConfig } from "@/hooks/useMarketplaceConfig";

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// Duration options in seconds
const DURATIONS: [string, number][] = [
  ["1 day", 86400],
  ["3 days", 259200],
  ["7 days", 604800],
  ["14 days", 1209600],
  ["30 days", 2592000],
];

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

function FeeRow({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={cn("text-muted-foreground", strong && "font-semibold text-foreground")}>{label}</span>
      <span className="text-right">
        <b className={cn(strong && "font-display text-base")}>{value}</b>
        {sub && <small className="block text-muted-foreground">≈ {sub}</small>}
      </span>
    </div>
  );
}

function TxStatus({ isPending, isConfirming, isSuccess, txHash, chainId }: { isPending: boolean; isConfirming: boolean; isSuccess: boolean; txHash?: string | undefined; chainId?: number }) {
  if (isSuccess) return (
    <p className="rounded-md bg-success/10 p-2 text-center text-xs text-success">
      ✓ Transaction confirmed!{" "}
      {txHash && (
        <a href={txUrl(txHash, chainId)} target="_blank" rel="noreferrer" className="ml-1 underline underline-offset-2 hover:opacity-80">
          View on {chainId === 46630 ? "Robinhood Explorer" : "BaseScan"} ↗
        </a>
      )}
    </p>
  );
  if (isConfirming) return <p className="rounded-md bg-muted p-2 text-center text-xs text-muted-foreground animate-pulse">Waiting for confirmation…</p>;
  if (isPending) return <p className="rounded-md bg-muted p-2 text-center text-xs text-muted-foreground animate-pulse">Confirm in wallet…</p>;
  return null;
}

// ─────────────────────────────────────────────
// BuyDialog
// ─────────────────────────────────────────────

export interface BuyDialogProps {
  listingId: bigint;
  pricePerItem: bigint;
  quantity?: bigint;
  paymentToken?: string;
  tokenId: string;
  collectionId: string;
}

export function BuyDialog({ listingId, pricePerItem, quantity = 1n, paymentToken = ETH_ADDRESS, tokenId, collectionId }: BuyDialogProps) {
  const [open, setOpen] = useState(false);
  const { wallet } = useWallet();
  const addresses = useAddresses();
  const { platformFeePercent } = useMarketplaceConfig();

  const isEth = paymentToken === ETH_ADDRESS;
  const { data: quote, isLoading: quoteLoading } = useListingQuote(listingId, quantity);
  const { buy, buyERC20, approveErc20, isPending, isConfirming, isSuccess } = usePurchase();

  // Need ERC-20 allowance check when not ETH
  const [needsApproval, setNeedsApproval] = useState(!isEth);

  async function handleBuy() {
    if (!wallet || !addresses) {
      toast.error("Connect your wallet first.");
      return;
    }
    try {
      const quotedTotal = (quote as { buyerTotal: bigint } | undefined)?.buyerTotal;
      if (!quotedTotal) {
        toast.error("Price quote is still loading. Try again in a moment.");
        return;
      }
      if (isEth) {
        await buy(listingId, quantity, quotedTotal);
      } else {
        if (needsApproval) {
          await approveErc20(paymentToken as `0x${string}`, quotedTotal);
          setNeedsApproval(false);
          return;
        }
        await buyERC20(listingId, quantity);
      }
      toast.success("Purchase complete!", { id: "buy" });
      setOpen(false);
    } catch (err) {
      toast.error(parseContractError(err), { id: "buy" });
    }
  }

  const buyerTotal = (quote as { buyerTotal: bigint } | null)?.buyerTotal;
  const platformFee = (quote as { platformFee: bigint } | null)?.platformFee;
  const royalty = (quote as { royaltyAmount: bigint } | null)?.royaltyAmount;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="press"><WalletCards />Buy Now</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Confirm Purchase</DialogTitle>
          <DialogDescription>
            Token #{tokenId} from{" "}
            <span className="font-mono text-xs">{collectionId.slice(0, 8)}…</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-md border border-border bg-surface/90 p-4 text-sm">
          <FeeRow label="Item Price" value={formatEth(pricePerItem)} />
          {platformFee != null && <FeeRow label={`Platform Fee (${platformFeePercent})`} value={formatEth(platformFee)} />}
          {royalty != null && royalty > 0n && <FeeRow label="Creator Royalty" value={formatEth(royalty)} />}
          <div className="border-t border-border pt-3">
            <FeeRow
              label="Total"
              value={quoteLoading ? "Loading…" : buyerTotal ? formatEth(buyerTotal) : formatEth(pricePerItem * quantity)}
              strong
            />
          </div>
        </div>

        {!isEth && needsApproval && (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            ⓘ You need to approve the token spend before purchasing.
          </p>
        )}

        <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} />

        <DialogFooter>
          <Button
            onClick={handleBuy}
            disabled={!wallet || isPending || isConfirming || quoteLoading}
          >
            {!wallet ? "Connect Wallet" :
              !isEth && needsApproval ? "Approve Token Spend" :
              isPending ? "Confirm in wallet…" :
              isConfirming ? "Processing…" : "Confirm Purchase"}
            <ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// SellDialog (real transaction)
// ─────────────────────────────────────────────

export interface SellDialogProps {
  nftContract: `0x${string}`;
  tokenId: string;
  tokenStandard: "ERC-721" | "ERC-1155";
  royaltyBps?: number;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
  defaultPrice?: string;
  existingListingId?: string;
  existingAuctionId?: string;
  hasAuctionBids?: boolean;
}

export function SellDialog({
  nftContract,
  tokenId,
  tokenStandard,
  royaltyBps = 0,
  label = "List for Sale",
  variant = "outline",
  className,
  defaultPrice = "0.1",
  existingListingId,
  existingAuctionId,
  hasAuctionBids = false,
}: SellDialogProps) {
  const [open, setOpen] = useState(false);
  const [priceText, setPriceText] = useState(defaultPrice);
  const [quantityText, setQuantityText] = useState("1");
  const [duration, setDuration] = useState(604800); // 7 days default
  // "idle" | "approving" | "listing" — drives step-aware status messages
  const [step, setStep] = useState<"idle" | "approving" | "listing">("idle");
  const { wallet, address } = useWallet();
  const addresses = useAddresses();
  const { platformFeePercent } = useMarketplaceConfig();

  const {
    approveAll,
    approve721,
    createListing,
    approvePending,
    approveConfirming,
    approveSuccess,
    listingPending,
    listingConfirming,
    listingSuccess,
    listingHash,
    cancelListing,
  } = useListing();

  const { cancelAuction } = useAuction();

  const priceWei = parseEthInput(priceText);
  // Show an inline error when user has typed something but it parses to zero
  const priceInvalid = priceText.trim() !== "" && priceWei === 0n;

  const isERC721 = tokenStandard === "ERC-721";
  // ERC-1155 sellers can specify how many editions to list; ERC-721 is always 1
  const quantity = isERC721
    ? 1n
    : BigInt(Math.max(1, parseInt(quantityText, 10) || 1));

  const isApproved721 = useIsApproved721(
    isERC721 ? nftContract : undefined,
    isERC721 ? BigInt(tokenId) : undefined,
    address as `0x${string}` | undefined,
  );
  const isApproved1155 = useIsApproved1155(
    !isERC721 ? nftContract : undefined,
    !isERC721 ? address as `0x${string}` : undefined,
  );
  const isApproved = isERC721 ? isApproved721 : isApproved1155;

  const { data: saleQuote } = useSaleQuote(nftContract, BigInt(tokenId), priceWei > 0n ? priceWei : undefined);

  const quoted = saleQuote as
    | { platformFee: bigint; royaltyAmount: bigint; sellerProceeds: bigint; buyerTotal: bigint }
    | undefined;

  /** Submit the createListing TX with a freshly-computed endTime. */
  async function submitListing() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const freshEndTime = now + BigInt(duration);
    setStep("listing");
    if (existingListingId) {
      try {
        await cancelListing(BigInt(existingListingId));
      } catch (err) {
        console.warn("Cancelling active listing before updating price:", err);
      }
    }
    if (existingAuctionId && !hasAuctionBids) {
      try {
        await cancelAuction(BigInt(existingAuctionId));
      } catch (err) {
        console.warn("Cancelling active auction before creating listing:", err);
      }
    }
    await createListing(
      nftContract,
      BigInt(tokenId),
      quantity,
      ETH_ADDRESS,
      priceWei,
      now,
      freshEndTime,
    );
    toast.success(existingListingId ? "Listing price updated!" : "Listing created!", { id: "sell" });
    setOpen(false);
    setStep("idle");
  }

  /**
   * Once the approval TX confirms on-chain, automatically advance to the
   * createListing TX — no second click needed.
   */
  useEffect(() => {
    if (approveSuccess && step === "approving") {
      submitListing().catch((err) => {
        toast.error(parseContractError(err), { id: "sell" });
        setStep("idle");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  async function handleList() {
    if (!wallet || !addresses) {
      toast.error("Connect your wallet first.");
      return;
    }
    try {
      if (!isApproved) {
        // Step 1: approval — auto-continuation fires via the useEffect above
        setStep("approving");
        if (isERC721) {
          await approve721(nftContract, BigInt(tokenId));
        } else {
          await approveAll(nftContract, true);
        }
        return;
      }
      // Already approved — go straight to listing
      await submitListing();
    } catch (err) {
      toast.error(parseContractError(err), { id: "sell" });
      setStep("idle");
    }
  }

  const anyPending = approvePending || approveConfirming || listingPending || listingConfirming;

  // Step-aware status message shown while a TX is in flight
  const stepMessage =
    step === "approving"
      ? approvePending
        ? "Confirm approval in wallet…"
        : approveConfirming
        ? "Waiting for approval confirmation…"
        : null
      : step === "listing"
      ? listingPending
        ? "Confirm listing in wallet…"
        : listingConfirming
        ? "Waiting for listing confirmation…"
        : null
      : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep("idle"); }}>
      <DialogTrigger asChild>
        <Button variant={variant} className={cn("press", className)}><Tag />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {listingSuccess ? "Listing Created ✓" : `Sell Token #${tokenId}`}
          </DialogTitle>
          <DialogDescription>
            {listingSuccess
              ? "Your NFT is now listed on the marketplace."
              : "Set your price. Your NFT stays in your wallet until it sells."}
          </DialogDescription>
        </DialogHeader>

        {!listingSuccess && (
          <div className="space-y-4">
            {/* Price input with inline validation */}
            <div>
              <label className="field-label mt-0" htmlFor="sell-price">Price</label>
              <div className="flex">
                <input
                  id="sell-price"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  inputMode="decimal"
                  className={cn(
                    "control min-w-0 flex-1 rounded-r-none",
                    priceInvalid && "border-destructive focus-visible:ring-destructive",
                  )}
                  placeholder="0.1"
                />
                <span className="flex items-center rounded-r-md border border-l-0 border-border px-3 text-sm">◆ ETH</span>
              </div>
              {priceInvalid && (
                <p className="mt-1 text-[11px] text-destructive">Enter a valid price.</p>
              )}
            </div>

            {/* ERC-1155 quantity input */}
            {!isERC721 && (
              <div>
                <label className="field-label mt-0" htmlFor="sell-quantity">Quantity</label>
                <input
                  id="sell-quantity"
                  value={quantityText}
                  onChange={(e) => setQuantityText(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  className="control w-full"
                  placeholder="1"
                  min={1}
                />
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="field-label mt-0">Duration</label>
              <Select onValueChange={(v) => setDuration(Number(v))} defaultValue="604800">
                <SelectTrigger className="bg-surface text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(([label, secs]) => (
                    <SelectItem key={secs} value={String(secs)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fee breakdown */}
            <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <FeeRow label={`Platform Fee (${platformFeePercent})`} value={quoted ? formatEth(quoted.platformFee) : "—"} />
              <FeeRow
                label={`Creator Royalty (${formatBps(royaltyBps)})`}
                value={quoted ? formatEth(quoted.royaltyAmount) : "—"}
              />
              <div className="border-t border-border pt-3">
                <FeeRow
                  label="You'll Receive"
                  value={quoted ? formatEth(quoted.sellerProceeds) : "—"}
                  strong
                />
              </div>
              {quoted && (
                <p className="text-[11px] text-muted-foreground">
                  Buyer pays {formatEth(quoted.buyerTotal)} (price + fees + royalty).
                </p>
              )}
            </div>

            {/* Approval hint — only shown before approval begins */}
            {!isApproved && step === "idle" && (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                ⓘ You'll first be asked to approve the marketplace to transfer your NFT. It will then list automatically.
              </p>
            )}
          </div>
        )}

        {/* Step-aware in-flight status; falls back to the listing TX confirmation */}
        {stepMessage ? (
          <p className="rounded-md bg-muted p-2 text-center text-xs text-muted-foreground animate-pulse">
            {stepMessage}
          </p>
        ) : (
          <TxStatus
            isPending={listingPending}
            isConfirming={listingConfirming}
            isSuccess={listingSuccess}
            txHash={listingHash}
          />
        )}

        <DialogFooter>
          {listingSuccess ? (
            <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <Button
              onClick={handleList}
              disabled={!wallet || priceWei <= 0n || priceInvalid || anyPending}
            >
              {!wallet ? "Connect Wallet" :
                step === "approving" ? "Approving…" :
                step === "listing" ? "Listing…" :
                !isApproved ? "Approve & List" :
                "Create Listing"}
              <ArrowRight />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// OfferDialog
// ─────────────────────────────────────────────

export interface OfferDialogProps {
  nftContract: `0x${string}`;
  tokenId: string;
  tokenStandard: "ERC-721" | "ERC-1155";
  targetChainId?: number;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function OfferDialog({
  nftContract,
  tokenId,
  tokenStandard,
  targetChainId,
  label = "Make Offer",
  variant = "outline",
  className,
}: OfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [amountText, setAmountText] = useState("0.05");
  const [quantityText, setQuantityText] = useState("1");
  const [duration, setDuration] = useState(604800);
  const { wallet } = useWallet();
  const addresses = useAddresses();
  const queryClient = useQueryClient();

  const { createOffer, isPending, isConfirming, isSuccess } = useOffer(targetChainId);

  const isErc1155 = tokenStandard === "ERC-1155";
  const parsedQty = Math.max(1, parseInt(quantityText || "1", 10) || 1);
  const quantity = isErc1155 ? BigInt(parsedQty) : 1n;

  const unitAmountWei = parseEthInput(amountText);
  const totalAmountWei = unitAmountWei * quantity;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + duration);

  const { data: offerQuote } = useSaleQuote(
    nftContract,
    BigInt(tokenId),
    totalAmountWei > 0n ? totalAmountWei : undefined,
  );

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["asset-offers"] });
      queryClient.invalidateQueries({ queryKey: ["offers-by-collection"] });
      queryClient.invalidateQueries({ queryKey: ["profile-offers"] });
      queryClient.invalidateQueries({ queryKey: ["token"] });
    }
  }, [isSuccess, queryClient]);

  async function handleOffer() {
    if (!wallet || !addresses) {
      toast.error("Connect your wallet first.");
      return;
    }
    const buyerTotal = (offerQuote as { buyerTotal: bigint } | undefined)?.buyerTotal;
    if (!buyerTotal) {
      toast.error("Offer quote is still loading. Try again in a moment.");
      return;
    }
    try {
      await createOffer(
        nftContract,
        BigInt(tokenId),
        quantity,
        totalAmountWei,
        deadline,
        buyerTotal,
      );
      toast.success("Offer submitted!", { id: "offer" });
      setOpen(false);
    } catch (err) {
      toast.error(parseContractError(err), { id: "offer" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={cn("press", className)}><WalletCards />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isSuccess ? "Offer Placed ✓" : `Make Offer — Token #${tokenId}`}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Your offer has been recorded on-chain. The owner will be notified."
              : "Set the amount you're willing to pay. Funds will be held safely in marketplace escrow until the offer is accepted or expires."}
          </DialogDescription>
        </DialogHeader>

        {!isSuccess && (
          <div className="space-y-4">
            <div>
              <label className="field-label mt-0">
                {isErc1155 ? "Offer Price per Item" : "Offer Amount"}
              </label>
              <div className="flex">
                <input
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  inputMode="decimal"
                  className="control min-w-0 flex-1 rounded-r-none"
                  placeholder="0.05"
                />
                <span className="flex items-center rounded-r-md border border-l-0 border-border px-3 text-sm">◆ ETH</span>
              </div>
            </div>

            {isErc1155 && (
              <div>
                <label className="field-label mt-0">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantityText}
                  onChange={(e) => setQuantityText(e.target.value)}
                  className="control w-full"
                  placeholder="1"
                />
              </div>
            )}

            <div>
              <label className="field-label mt-0">Offer Expires In</label>
              <Select onValueChange={(v) => setDuration(Number(v))} defaultValue="604800">
                <SelectTrigger className="bg-surface text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(([label, secs]) => (
                    <SelectItem key={secs} value={String(secs)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1.5">
              <FeeRow
                label={isErc1155 && quantity > 1n ? `Net Offer (${quantity} items)` : "Net Offer to Seller"}
                value={formatEth(totalAmountWei)}
                strong
              />
              {offerQuote?.royaltyAmount != null && offerQuote.royaltyAmount > 0n && (
                <FeeRow
                  label="Creator Royalty"
                  value={formatEth(offerQuote.royaltyAmount)}
                />
              )}
              {offerQuote?.platformFee != null && offerQuote.platformFee > 0n && (
                <FeeRow
                  label="Platform Fee"
                  value={formatEth(offerQuote.platformFee)}
                />
              )}
              {(offerQuote as { buyerTotal: bigint } | undefined)?.buyerTotal != null && (
                <div className="border-t border-border pt-1.5 mt-1.5">
                  <FeeRow
                    label="Total Escrow Required"
                    value={formatEth((offerQuote as { buyerTotal: bigint }).buyerTotal)}
                    strong
                  />
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                ⓘ Escrowed ETH remains yours and can be cancelled and refunded at any time before acceptance.
              </p>
            </div>
          </div>
        )}

        <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} chainId={targetChainId} />

        <DialogFooter>
          {isSuccess ? (
            <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <Button
              onClick={handleOffer}
              disabled={!wallet || totalAmountWei <= 0n || isPending || isConfirming}
            >
              {!wallet ? "Connect Wallet" :
                isPending ? "Confirm in wallet…" :
                isConfirming ? "Processing…" :
                "Submit Offer"}
              <ArrowRight />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// BidDialog
// ─────────────────────────────────────────────

export interface BidDialogProps {
  auctionId: bigint;
  nftContract: `0x${string}`;
  minBid: bigint;
  paymentToken?: string;
  tokenId: string;
  endsAt: bigint;
  label?: string;
}

export function BidDialog({
  auctionId,
  nftContract,
  minBid,
  paymentToken = ETH_ADDRESS,
  tokenId,
  endsAt,
  label = "Place Bid",
}: BidDialogProps) {
  const [open, setOpen] = useState(false);
  const [bidText, setBidText] = useState(() => formatEthCompact(minBid).replace(" ETH", ""));
  const { wallet } = useWallet();
  const { placeBid, placeBidERC20, approveErc20, isPending, isConfirming, isSuccess } = useAuction();
  const addresses = useAddresses();
  const { data: minOnChain } = useMinimumBid(auctionId);

  const isEth = paymentToken === ETH_ADDRESS;
  const bidWei = parseEthInput(bidText);
  const minGross = (minOnChain as { grossBid: bigint } | undefined)?.grossBid ?? minBid;
  const tooLow = bidWei < minGross;

  const { data: bidQuote } = useSaleQuote(
    nftContract,
    BigInt(tokenId),
    bidWei > 0n ? bidWei : undefined,
  );

  const endsIn = Number(endsAt) * 1000 - Date.now();
  const endsInMin = Math.max(0, Math.floor(endsIn / 60000));

  async function handleBid() {
    if (!wallet || !addresses) { toast.error("Connect your wallet first."); return; }
    if (tooLow) { toast.error(`Bid must be at least ${formatEth(minGross)}`); return; }
    const buyerTotal =
      (bidQuote as { buyerTotal: bigint } | undefined)?.buyerTotal ??
      (minOnChain as { buyerTotal: bigint } | undefined)?.buyerTotal;
    if (!buyerTotal) {
      toast.error("Bid quote is still loading. Try again in a moment.");
      return;
    }
    try {
      if (isEth) {
        await placeBid(auctionId, bidWei, buyerTotal);
      } else {
        await approveErc20(paymentToken as `0x${string}`, buyerTotal);
        await placeBidERC20(auctionId, bidWei);
      }
      toast.success("Bid placed!", { id: "bid" });
      setOpen(false);
    } catch (err) {
      toast.error(parseContractError(err), { id: "bid" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="press"><Gavel />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isSuccess ? "Bid Placed ✓" : `Bid on Token #${tokenId}`}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Your bid has been recorded. You'll be outbid notifications are on-chain."
              : endsInMin < 5
              ? `⚠ Auction ends in ${endsInMin}m — bids in the last 5 minutes extend the auction by 5 min.`
              : `Auction ends in ~${endsInMin}m.`}
          </DialogDescription>
        </DialogHeader>

        {!isSuccess && (
          <div className="space-y-4">
            <div>
              <label className="field-label mt-0">Your Bid</label>
              <div className="flex">
                <input
                  value={bidText}
                  onChange={(e) => setBidText(e.target.value)}
                  inputMode="decimal"
                  className={cn("control min-w-0 flex-1 rounded-r-none", tooLow && "border-destructive")}
                />
                <span className="flex items-center rounded-r-md border border-l-0 border-border px-3 text-sm">◆ ETH</span>
              </div>
              {tooLow && (
                <p className="mt-1 text-[11px] text-destructive">
                  Minimum bid: {formatEth(minGross)}
                </p>
              )}
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <FeeRow label="Your Bid" value={formatEth(bidWei)} strong />
              {(bidQuote as { buyerTotal: bigint } | undefined)?.buyerTotal != null && (
                <FeeRow
                  label="You Pay (incl. fees)"
                  value={formatEth((bidQuote as { buyerTotal: bigint }).buyerTotal)}
                />
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                ⓘ Anti-sniping: bids in the last 5 minutes extend the auction by 5 minutes.
              </p>
            </div>
          </div>
        )}

        <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} />

        <DialogFooter>
          {isSuccess ? (
            <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <Button
              onClick={handleBid}
              disabled={!wallet || tooLow || isPending || isConfirming}
            >
              {!wallet ? "Connect Wallet" :
                isPending ? "Confirm in wallet…" :
                isConfirming ? "Processing…" :
                "Place Bid"}
              <ArrowRight />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// CreateAuctionDialog
// ─────────────────────────────────────────────

export interface CreateAuctionDialogProps {
  nftContract: `0x${string}`;
  tokenId: string;
  tokenStandard: "ERC-721" | "ERC-1155";
  royaltyBps?: number;
  label?: string;
  existingListingId?: string;
}

export function CreateAuctionDialog({
  nftContract,
  tokenId,
  tokenStandard,
  royaltyBps = 0,
  label = "Start Auction",
  existingListingId,
}: CreateAuctionDialogProps) {
  const [open, setOpen] = useState(false);
  const [startPriceText, setStartPriceText] = useState("0.01");
  const [duration, setDuration] = useState(86400); // 1 day default
  const { wallet } = useWallet();
  const { createAuction, isPending, isConfirming, isSuccess } = useAuction();
  const { approveAll, approve721, cancelListing } = useListing();
  const addresses = useAddresses();

  const startPriceWei = parseEthInput(startPriceText);
  const endTime = BigInt(Math.floor(Date.now() / 1000) + duration);
  const isERC721 = tokenStandard === "ERC-721";

  async function handleCreate() {
    if (!wallet || !addresses) { toast.error("Connect your wallet first."); return; }
    if (startPriceWei <= 0n) { toast.error("Set a starting price."); return; }
    try {
      if (existingListingId) {
        try {
          await cancelListing(BigInt(existingListingId));
        } catch (err) {
          console.warn("Cancelling active listing before starting auction:", err);
        }
      }
      if (isERC721) {
        await approve721(nftContract, BigInt(tokenId));
      } else {
        await approveAll(nftContract, true);
      }
      await createAuction(
        nftContract,
        BigInt(tokenId),
        1n,
        ETH_ADDRESS,
        startPriceWei,
        BigInt(Math.floor(Date.now() / 1000)),
        endTime,
      );
      toast.success("Auction created!", { id: "auction" });
      setOpen(false);
    } catch (err) {
      toast.error(parseContractError(err), { id: "auction" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="press"><Gavel />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isSuccess ? "Auction Created ✓" : `Auction Token #${tokenId}`}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Your auction is live. Bidders will be notified."
              : "Set a starting price and duration. The highest bidder wins after the auction ends."}
          </DialogDescription>
        </DialogHeader>

        {!isSuccess && (
          <div className="space-y-4">
            <div>
              <label className="field-label mt-0">Starting Price</label>
              <div className="flex">
                <input
                  value={startPriceText}
                  onChange={(e) => setStartPriceText(e.target.value)}
                  inputMode="decimal"
                  className="control min-w-0 flex-1 rounded-r-none"
                />
                <span className="flex items-center rounded-r-md border border-l-0 border-border px-3 text-sm">◆ ETH</span>
              </div>
            </div>
            <div>
              <label className="field-label mt-0">Duration</label>
              <Select onValueChange={(v) => setDuration(Number(v))} defaultValue="86400">
                <SelectTrigger className="bg-surface text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["1 hour", 3600], ["12 hours", 43200], ["1 day", 86400], ["3 days", 259200], ["7 days", 604800]].map(([l, s]) => (
                    <SelectItem key={s} value={String(s)}>{l as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ⓘ Anti-sniping: bids in the last 5 minutes extend the auction by 5 minutes automatically.
            </p>
          </div>
        )}

        <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} />

        <DialogFooter>
          {isSuccess ? (
            <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!wallet || parseFloat(startPriceText) <= 0 || isPending || isConfirming}
            >
              {isPending ? "Confirm in wallet…" : isConfirming ? "Processing…" : "Start Auction"}
              <ArrowRight />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// SweepDialog (cart + batch buy)
// ─────────────────────────────────────────────

export function useSweepCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.listingId === item.listingId)) return prev;
      if (prev.length >= 50) { toast.error("Maximum 50 items in cart."); return prev; }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((listingId: bigint) => {
    setItems((prev) => prev.filter((i) => i.listingId !== listingId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return { items, addItem, removeItem, clearCart };
}

export function SweepDialog({
  items,
  onClear,
  onRemove,
}: {
  items: CartItem[];
  onClear: () => void;
  onRemove: (id: bigint) => void;
}) {
  const [open, setOpen] = useState(false);
  const { wallet } = useWallet();
  const { execute, isPending, isConfirming, isSuccess } = useSweep();
  const { data: total } = useSweepTotal(items);
  const totalPrice =
    total && typeof total === "object" && "totalPrice" in total
      ? (total as { totalPrice: bigint }).totalPrice
      : Array.isArray(total)
        ? (total[0] as bigint)
        : typeof total === "bigint"
          ? total
          : undefined;

  async function handleSweep() {
    if (!wallet) { toast.error("Connect your wallet first."); return; }
    if (items.length === 0) { toast.error("Cart is empty."); return; }
    try {
      if (totalPrice == null) {
        toast.error("Sweep quote is still loading. Try again in a moment.");
        return;
      }
      await execute(items, totalPrice);
      toast.success(`Bought ${items.length} NFTs!`, { id: "sweep" });
      onClear();
      setOpen(false);
    } catch (err) {
      toast.error(parseContractError(err), { id: "sweep" });
    }
  }

  return (
    <>
      {/* Cart button */}
      <Button
        variant="outline"
        className="relative press"
        onClick={() => setOpen(true)}
        disabled={items.length === 0}
      >
        <ShoppingCart />
        Cart
        {items.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid size-5 place-content-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {items.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {isSuccess ? "Purchase Complete ✓" : `Cart — ${items.length} item${items.length !== 1 ? "s" : ""}`}
            </DialogTitle>
            <DialogDescription>
              {isSuccess
                ? "All NFTs have been transferred to your wallet."
                : "Review your selections before buying."}
            </DialogDescription>
          </DialogHeader>

          {!isSuccess && (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <div key={String(item.listingId)} className="flex items-center gap-3 rounded-md border border-border p-2 text-xs">
                  <div className="size-10 rounded bg-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">Listing #{String(item.listingId)}</p>
                    <p className="text-muted-foreground">{formatEthCompact(item.pricePerItem)}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => onRemove(item.listingId)}
                    aria-label="Remove from cart"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!isSuccess && items.length > 0 && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <FeeRow
                label="Total"
                value={totalPrice ? formatEthCompact(totalPrice) : "Calculating…"}
                strong
              />
            </div>
          )}

          <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} />

          <DialogFooter className="gap-2">
            {isSuccess ? (
              <Button variant="outline" onClick={() => { onClear(); setOpen(false); }}>Done</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={onClear} disabled={isPending}>
                  <RefreshCw className="size-4" />Clear
                </Button>
                <Button
                  onClick={handleSweep}
                  disabled={!wallet || items.length === 0 || isPending || isConfirming}
                >
                  {!wallet ? "Connect Wallet" :
                    isPending ? "Confirm in wallet…" :
                    isConfirming ? "Processing…" :
                    `Buy ${items.length} NFT${items.length !== 1 ? "s" : ""}`}
                  <ArrowRight />
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
