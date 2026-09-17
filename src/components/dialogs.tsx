/**
 * Phase 5 — Action Dialogs
 * All buy/offer/sell/bid/auction/sweep flows connected to real contract hooks.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useListing } from "@/hooks/useListing";
import { useListingQuote, useSaleQuote } from "@/hooks/useListingQuote";
import { usePurchase } from "@/hooks/usePurchase";
import { useOffer } from "@/hooks/useOffer";
import { useAuction } from "@/hooks/useAuction";
import { useSweep, useSweepTotal, type CartItem } from "@/hooks/useSweep";
import { parseContractError } from "@/lib/contract-errors";
import { formatEth, formatEthCompact, formatBps } from "@/lib/token-format";
import { gqlClient } from "@/indexer/client";
import {
  GET_TOKENS_BY_OWNER,
  GET_MARKETPLACE_CONFIG,
  type TokensByOwnerResult,
  type MarketplaceConfigResult,
} from "@/indexer/queries";
import { SLOW_REFETCH_MS } from "@/indexer/events";
import { cn } from "@/lib/utils";

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

function TxStatus({ isPending, isConfirming, isSuccess }: { isPending: boolean; isConfirming: boolean; isSuccess: boolean }) {
  if (isSuccess) return <p className="rounded-md bg-success/10 p-2 text-center text-xs text-success">✓ Transaction confirmed!</p>;
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
      if (isEth) {
        const buyerTotal = (quote as { buyerTotal: bigint } | null)?.buyerTotal ?? pricePerItem * quantity;
        await buy(listingId, quantity, buyerTotal);
      } else {
        if (needsApproval) {
          await approveErc20(paymentToken as `0x${string}`, pricePerItem * quantity, addresses.marketplace);
          setNeedsApproval(false);
          return; // user needs to click again after approving
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
          {platformFee != null && <FeeRow label="Platform Fee" value={formatEth(platformFee)} />}
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
}

export function SellDialog({
  nftContract,
  tokenId,
  tokenStandard,
  royaltyBps = 0,
  label = "List for Sale",
  variant = "outline",
  className,
}: SellDialogProps) {
  const [open, setOpen] = useState(false);
  const [priceText, setPriceText] = useState("0.1");
  const [duration, setDuration] = useState(604800); // 7 days default
  const { wallet } = useWallet();
  const addresses = useAddresses();

  const { approveAll, approve721, createListing, isApproved721, isApproved1155, isPending, isConfirming, isSuccess } = useListing();

  const priceEth = parseFloat(priceText) || 0;
  const priceWei = BigInt(Math.round(priceEth * 1e18));
  const endTime = BigInt(Math.floor(Date.now() / 1000) + duration);

  const isERC721 = tokenStandard === "ERC-721";
  const isApproved = isERC721 ? isApproved721 : isApproved1155;

  // Live sale quote (platform fee + royalty preview)
  const { data: saleQuote } = useSaleQuote(nftContract, tokenId, priceWei);

  const platformFee = priceEth * 0.025;
  const royaltyAmt = priceEth * (royaltyBps / 10000);
  const sellerReceives = priceEth - platformFee - royaltyAmt;

  async function handleList() {
    if (!wallet || !addresses) {
      toast.error("Connect your wallet first.");
      return;
    }
    try {
      // Step 1: approve if needed
      if (!isApproved) {
        if (isERC721) {
          await approve721(nftContract, BigInt(tokenId), addresses.marketplace);
        } else {
          await approveAll(nftContract, addresses.marketplace, true);
        }
        return; // User must click again after approval
      }
      // Step 2: create listing
      await createListing(
        nftContract,
        BigInt(tokenId),
        isERC721 ? 0 : 1,
        priceWei,
        1n,          // quantity (1 for ERC721; can expose UI for ERC1155)
        ETH_ADDRESS, // payment token
        endTime,
      );
      toast.success("Listing created!", { id: "sell" });
      setOpen(false);
    } catch (err) {
      toast.error(parseContractError(err), { id: "sell" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={cn("press", className)}><Tag />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isSuccess ? "Listing Created ✓" : `Sell Token #${tokenId}`}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Your NFT is now listed on the marketplace."
              : "Set your price. Your NFT stays in your wallet until it sells."}
          </DialogDescription>
        </DialogHeader>

        {!isSuccess && (
          <div className="space-y-4">
            <div>
              <label className="field-label mt-0" htmlFor="sell-price">Price</label>
              <div className="flex">
                <input
                  id="sell-price"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  inputMode="decimal"
                  className="control min-w-0 flex-1 rounded-r-none"
                  placeholder="0.1"
                />
                <span className="flex items-center rounded-r-md border border-l-0 border-border px-3 text-sm">◆ ETH</span>
              </div>
            </div>

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

            <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <FeeRow label="Platform Fee (2.5%)" value={`${platformFee.toFixed(4)} ETH`} />
              <FeeRow
                label={`Creator Royalty (${formatBps(royaltyBps)})`}
                value={`${royaltyAmt.toFixed(4)} ETH`}
              />
              <div className="border-t border-border pt-3">
                <FeeRow label="You'll Receive" value={`${sellerReceives.toFixed(4)} ETH`} strong />
              </div>
            </div>

            {!isApproved && (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                ⓘ You'll first be asked to approve the marketplace to transfer your NFT.
              </p>
            )}
          </div>
        )}

        <TxStatus isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} />

        <DialogFooter>
          {isSuccess ? (
            <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <Button
              onClick={handleList}
              disabled={!wallet || priceEth <= 0 || isPending || isConfirming}
            >
              {!wallet ? "Connect Wallet" :
                !isApproved ? "Approve NFT Transfer" :
                isPending ? "Confirm in wallet…" :
                isConfirming ? "Processing…" :
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
  label?: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function OfferDialog({
  nftContract,
  tokenId,
  tokenStandard,
  label = "Make Offer",
  variant = "outline",
  className,
}: OfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [amountText, setAmountText] = useState("0.05");
  const [duration, setDuration] = useState(604800);
  const { wallet } = useWallet();
  const addresses = useAddresses();

  const { createOffer, approveErc20, isPending, isConfirming, isSuccess } = useOffer();

  const amountEth = parseFloat(amountText) || 0;
  const amountWei = BigInt(Math.round(amountEth * 1e18));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + duration);
  const quantity = tokenStandard === "ERC-721" ? 1n : 1n;

  async function handleOffer() {
    if (!wallet || !addresses) {
      toast.error("Connect your wallet first.");
      return;
    }
    try {
      await createOffer(
        nftContract,
        BigInt(tokenId),
        quantity,
        ETH_ADDRESS,
        amountWei,
        deadline,
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
              : "Set the amount you're willing to pay. Funds will be held until the offer is accepted or expires."}
          </DialogDescription>
        </DialogHeader>

        {!isSuccess && (
          <div className="space-y-4">
            <div>
              <label className="field-label mt-0">Offer Amount</label>
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

            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <FeeRow label="Offer Amount" value={`${amountEth.toFixed(4)} ETH`} strong />
              <p className="mt-2 text-[11px] text-muted-foreground">
                ⓘ Funds are transferred only when the owner accepts your offer.
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
              onClick={handleOffer}
              disabled={!wallet || amountEth <= 0 || isPending || isConfirming}
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
  minBid: bigint;
  paymentToken?: string;
  tokenId: string;
  endsAt: bigint;
  label?: string;
}

export function BidDialog({
  auctionId,
  minBid,
  paymentToken = ETH_ADDRESS,
  tokenId,
  endsAt,
  label = "Place Bid",
}: BidDialogProps) {
  const [open, setOpen] = useState(false);
  const [bidText, setBidText] = useState(formatEth(minBid));
  const { wallet } = useWallet();
  const { placeBid, placeBidERC20, approveErc20, isPending, isConfirming, isSuccess } = useAuction();
  const addresses = useAddresses();

  const isEth = paymentToken === ETH_ADDRESS;
  const bidWei = BigInt(Math.round((parseFloat(bidText) || 0) * 1e18));
  const tooLow = bidWei < minBid;

  const endsIn = Number(endsAt) * 1000 - Date.now();
  const endsInMin = Math.max(0, Math.floor(endsIn / 60000));

  async function handleBid() {
    if (!wallet || !addresses) { toast.error("Connect your wallet first."); return; }
    if (tooLow) { toast.error(`Bid must be at least ${formatEth(minBid)}`); return; }
    try {
      if (isEth) {
        await placeBid(auctionId, bidWei);
      } else {
        await approveErc20(paymentToken as `0x${string}`, bidWei, addresses.marketplace);
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
                  Minimum bid: {formatEth(minBid)}
                </p>
              )}
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <FeeRow label="Your Bid" value={`${parseFloat(bidText) || 0} ETH`} strong />
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
}

export function CreateAuctionDialog({
  nftContract,
  tokenId,
  tokenStandard,
  royaltyBps = 0,
  label = "Start Auction",
}: CreateAuctionDialogProps) {
  const [open, setOpen] = useState(false);
  const [startPriceText, setStartPriceText] = useState("0.01");
  const [duration, setDuration] = useState(86400); // 1 day default
  const { wallet } = useWallet();
  const { approveAll, approve721, createAuction, isPending, isConfirming, isSuccess } = useAuction();
  const addresses = useAddresses();

  const startPriceWei = BigInt(Math.round((parseFloat(startPriceText) || 0) * 1e18));
  const endTime = BigInt(Math.floor(Date.now() / 1000) + duration);
  const isERC721 = tokenStandard === "ERC-721";

  async function handleCreate() {
    if (!wallet || !addresses) { toast.error("Connect your wallet first."); return; }
    try {
      // Approve NFT transfer first
      if (isERC721) {
        await approve721(nftContract, BigInt(tokenId), addresses.marketplace);
      } else {
        await approveAll(nftContract, addresses.marketplace, true);
      }
      // Create auction
      await createAuction(
        nftContract,
        BigInt(tokenId),
        isERC721 ? 0 : 1,
        startPriceWei,
        1n,          // quantity
        ETH_ADDRESS, // payment token
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

  async function handleSweep() {
    if (!wallet) { toast.error("Connect your wallet first."); return; }
    if (items.length === 0) { toast.error("Cart is empty."); return; }
    try {
      await execute(items);
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
                    <p className="truncate font-semibold">Token #{String(item.tokenId)}</p>
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
                value={total ? formatEthCompact(total) : "Calculating…"}
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


