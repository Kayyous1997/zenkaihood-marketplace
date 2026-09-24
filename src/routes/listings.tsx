import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Info, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountShell, PageHead, SelectBox, Tabs, Verified } from "@/components/zenkai";
import { useWallet } from "@/lib/wallet";
import { gqlClient } from "@/indexer/client";
import { GET_LISTINGS_BY_SELLER, type ListingsBySellerResult } from "@/indexer/queries";
import { DEFAULT_REFETCH_MS } from "@/indexer/events";
import { formatEthCompact } from "@/lib/token-format";
import { useListing } from "@/hooks/useListing";
import { parseContractError } from "@/lib/contract-errors";
import { toast } from "sonner";

export const Route = createFileRoute("/listings")({
  head: () => ({ meta: [
    { title: "Your Active Listings — Zenkaihood" },
    { name: "description", content: "Manage your Zenkaihood listings, update prices, or cancel them at any time." },
    { property: "og:title", content: "Your Active Listings — Zenkaihood" },
    { property: "og:description", content: "Manage the collectibles you have listed for sale." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ListingsPage,
});

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

function timeLeft(endTime: string): string {
  const diff = Number(endTime) * 1000 - Date.now();
  if (diff <= 0) return "Expired";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

function ListingsPage() {
  const { wallet, address } = useWallet();
  const [tab, setTab] = useState("Active");
  const { cancelListing, listingPending } = useListing();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-listings", address],
    queryFn: () =>
      gqlClient.request<ListingsBySellerResult>(GET_LISTINGS_BY_SELLER, {
        seller: address as `0x${string}`,
        first: 50,
        skip: 0,
      }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const allListings = data?.listings ?? [];
  const now = Math.floor(Date.now() / 1000);

  const filtered = allListings.filter((l) => {
    if (tab === "Active") return l.active && !l.cancelled && Number(l.endTime) > now;
    if (tab === "Sold") return !l.active && !l.cancelled;
    if (tab === "Cancelled") return l.cancelled;
    if (tab === "Expired") return !l.cancelled && Number(l.endTime) <= now;
    return true;
  });

  const activeCount = allListings.filter((l) => l.active && !l.cancelled && Number(l.endTime) > now).length;
  const totalValueWei = allListings
    .filter((l) => l.active && l.paymentToken === ETH_ADDRESS)
    .reduce((acc, l) => acc + BigInt(l.pricePerItem) * BigInt(l.quantity), 0n);

  async function handleCancel(listingId: string) {
    try {
      await cancelListing(BigInt(listingId));
      toast.success("Listing cancelled.", { id: "cancel-listing" });
      refetch();
    } catch (err) {
      toast.error(parseContractError(err), { id: "cancel-listing" });
    }
  }

  return (
    <AccountShell>
      <PageHead
        eyebrow="My Listings"
        title="Your Active Listings"
        description={<>Manage your NFT listings, update prices, or cancel them anytime.<br />Your items are visible to buyers on the marketplace.</>}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="default"><Link to="/my-nfts"><Plus />List an NFT</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/create"><Plus />Register Collection</Link></Button>
          </div>
        }
      />
      <div className="page-section">
        <section className="rounded-md border border-border bg-surface/90">
          <div className="flex flex-col justify-between gap-3 border-b border-border px-4 sm:flex-row sm:items-center">
            <Tabs
              items={[
                ["Active", String(allListings.filter((l) => l.active && !l.cancelled && Number(l.endTime) > now).length)],
                ["Sold", String(allListings.filter((l) => !l.active && !l.cancelled).length)],
                ["Cancelled", String(allListings.filter((l) => l.cancelled).length)],
                ["Expired", String(allListings.filter((l) => !l.cancelled && !l.active && Number(l.endTime) <= now).length)],
              ]}
              value={tab}
              onChange={setTab}
            />
            <div className="w-52 py-2"><SelectBox placeholder="Sort by: Recently Listed" items={["Recently Listed", "Price: Low to High", "Expiring Soon"]} /></div>
          </div>

          <div className="hidden grid-cols-[2fr_1fr_1.2fr_0.8fr_1.4fr] gap-3 px-4 py-3 text-[11px] text-muted-foreground lg:grid">
            <span>NFT</span><span>Price</span><span>Expiration</span><span>Status</span><span>Actions</span>
          </div>

          <div className="space-y-2 p-3 pt-0">
            {!wallet ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Connect your wallet to see your listings.</p>
            ) : isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
              ))
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No {tab.toLowerCase()} listings found.</p>
            ) : (
              filtered.map((item) => (
                <div key={item.id} className="grid items-center gap-3 rounded-md border border-border p-3 lg:grid-cols-[2fr_1fr_1.2fr_0.8fr_1.4fr]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-16 rounded bg-muted" />
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-sm font-semibold">
                        {item.collection.id.slice(0, 6)}…{item.collection.id.slice(-4)} #{item.tokenId}
                        {item.collection.tokenStandard === "ERC721" && <Verified />}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">✿ {item.collection.id.slice(0, 10)}…</p>
                      <p className="text-[11px] text-muted-foreground">Token ID: {item.tokenId}</p>
                    </div>
                  </div>
                  <div className="text-xs">
                    <b>◆ {item.paymentToken === ETH_ADDRESS
                      ? formatEthCompact(BigInt(item.pricePerItem))
                      : `${item.pricePerItem} tokens`}</b>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <CalendarDays className="mt-0.5 size-3.5 text-muted-foreground" />
                    <span>
                      <b>{timeLeft(item.endTime)}</b>
                      <small className="block text-muted-foreground">
                        {new Date(Number(item.endTime) * 1000).toLocaleDateString()}
                      </small>
                    </span>
                  </div>
                  <span className={`w-fit rounded-full px-2 py-1 text-[10px] ${item.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    ● {item.active ? "Active" : item.cancelled ? "Cancelled" : "Expired"}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      className="text-xs"
                      variant="outline"
                      disabled={!item.active || listingPending}
                      onClick={() => handleCancel(item.id)}
                    >
                      Cancel Listing
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" aria-label="More options">
                      <MoreHorizontal />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid gap-3 border-t border-border p-4 lg:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
              <span className="text-primary">✿</span>
              <span className="text-xs">
                <b>{activeCount} active listing{activeCount !== 1 ? "s" : ""}</b>
                {totalValueWei > 0n && (
                  <small className="block text-muted-foreground">
                    Total value: {formatEthCompact(totalValueWei)}
                  </small>
                )}
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              Your listings will automatically expire based on the date and time you set. You can cancel them at any time.
            </div>
          </div>
        </section>
      </div>
    </AccountShell>
  );
}
