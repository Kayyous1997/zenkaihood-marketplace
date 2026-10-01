import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, ChevronRight, ClipboardList, Copy, Gavel, RefreshCw, ShoppingCart, Tag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountShell, InfoCard, PageHead, SelectBox, Tabs } from "@/components/zenkai";
import { useWallet } from "@/lib/wallet";
import { gqlClient } from "@/indexer/client";
import { GET_USER_ACTIVITY, type UserActivityResult, type ActivityFragment } from "@/indexer/queries";
import { DEFAULT_REFETCH_MS } from "@/indexer/events";
import {
  activityKind,
  activityLabel,
  isBidActivity,
  isListingActivity,
  isSaleActivity,
  isTransferActivity,
} from "@/indexer/activity";
import { formatEthCompact } from "@/lib/token-format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-activity")({
  head: () => ({ meta: [
    { title: "Recent Activity — NexDrop" },
    { name: "description", content: "Track your NexDrop trades, listings, bids and transfers in one place." },
    { property: "og:title", content: "Recent Activity — NexDrop" },
    { property: "og:description", content: "Your purchases, sales, listings, bids and transfers." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: MyActivityPage,
});

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
const PAGE_SIZE = 20;

const icons = {
  Sale: Tag,
  Purchase: ShoppingCart,
  Listing: ClipboardList,
  Bid: Gavel,
  Transfer: ArrowRightLeft,
} as const;

const tints: Record<string, string> = {
  Sale: "bg-primary/15 text-primary",
  Purchase: "bg-success/15 text-success",
  Listing: "bg-violet/15 text-violet",
  Bid: "bg-gold/15 text-gold",
  Transfer: "bg-info/15 text-info",
};

const TAB_TYPES: Record<string, ((type: string) => boolean) | null> = {
  All: null,
  Sales: isSaleActivity,
  Purchases: isSaleActivity,
  Listings: isListingActivity,
  Bids: isBidActivity,
  Transfers: isTransferActivity,
};

function ActivityRow({ row }: { row: ActivityFragment }) {
  const kind = activityKind(row.type);
  const Icon = icons[kind] ?? Tag;
  const price = row.listing?.pricePerItem ?? row.offer?.amount ?? row.auction?.highestBid ?? null;
  const payToken = row.listing?.paymentToken ?? row.offer?.paymentToken ?? row.auction?.paymentToken ?? null;
  const isEth = payToken === ETH_ADDRESS;

  return (
    <div className="grid items-center gap-3 border-b border-border p-2 last:border-0 sm:grid-cols-[150px_1fr_150px_auto]">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-content-center rounded-full", tints[kind] ?? "bg-muted text-muted-foreground")}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <b className="block text-xs">{activityLabel(row.type)}</b>
          <small className="mt-0.5 inline-block rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {row.type === "LISTING_CREATED" && row.listing?.active ? "Active" : "Completed"}
          </small>
          <small className="mt-1 block text-[10px] text-muted-foreground">
            {new Date(Number(row.timestamp) * 1000).toLocaleDateString()}
          </small>
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="size-14 shrink-0 rounded bg-muted" />
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold">
            {row.collection?.id
              ? `${row.collection.id.slice(0, 6)}…${row.collection.id.slice(-4)}`
              : "Unknown"}
            {row.tokenId ? ` #${row.tokenId}` : ""}
          </h3>
          <p className="text-[11px] text-muted-foreground">{row.transactionHash.slice(0, 10)}…</p>
        </div>
      </div>
      <div className="text-xs">
        {price ? (
          <>
            <b>
              {isEth ? formatEthCompact(BigInt(price)) : `${price} tokens`}
            </b>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        <small className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          {row.transactionHash.slice(0, 8)}… <Copy className="size-3" />
        </small>
      </div>
      <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
    </div>
  );
}

function MyActivityPage() {
  const { wallet, address } = useWallet();
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(0);

  const typeFilter = TAB_TYPES[tab] ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["user-activity", address, page, typeFilter],
    queryFn: () =>
      gqlClient.request<UserActivityResult>(GET_USER_ACTIVITY, {
        account: address as `0x${string}`,
        first: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      }),
    enabled: !!address,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const allActivity = data?.activities ?? [];
  const rows = typeFilter ? allActivity.filter((r) => typeFilter(r.type)) : allActivity;

  const tabCounts: [string, string][] = [
    ["All", String(allActivity.length)],
    ["Sales", String(allActivity.filter((r) => isSaleActivity(r.type)).length)],
    ["Purchases", String(allActivity.filter((r) => isSaleActivity(r.type)).length)],
    ["Listings", String(allActivity.filter((r) => isListingActivity(r.type)).length)],
    ["Bids", String(allActivity.filter((r) => isBidActivity(r.type)).length)],
    ["Transfers", String(allActivity.filter((r) => isTransferActivity(r.type)).length)],
  ];

  return (
    <AccountShell>
      <PageHead eyebrow="Your Activity" title="Recent Activity" description="Track your trades, listings, bids, and more — all in one place." />
      <div className="page-section grid gap-5 xl:grid-cols-[1fr_280px]">
        <section className="min-w-0 rounded-md border border-border bg-surface/90">
          <div className="px-4">
            <Tabs items={tabCounts} value={tab} onChange={setTab} />
          </div>
          {!wallet ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground">Connect your wallet to see your activity.</p>
            </div>
          ) : isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No {tab.toLowerCase()} yet.</p>
          ) : (
            <div className="p-3">
              {rows.map((row) => <ActivityRow key={row.id} row={row} />)}
            </div>
          )}
          <div className="flex items-center justify-center gap-1 border-t border-border p-3">
            <Button size="icon" variant="outline" className="size-8 text-xs" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>←</Button>
            <Button size="icon" variant="default" className="size-8 text-xs">{page + 1}</Button>
            <Button size="icon" variant="outline" className="size-8 text-xs" onClick={() => setPage(page + 1)} disabled={rows.length < PAGE_SIZE}>→</Button>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded-md border border-border bg-surface/90 p-4">
            <h2 className="font-display text-base font-semibold">Activity Filters</h2>
            <label className="field-label">Event Type</label>
            <SelectBox placeholder="All Events" items={Object.keys(TAB_TYPES)} />
            <label className="field-label">Date Range</label>
            <input className="control w-full" type="date" aria-label="Date range" />
            <Button variant="outline" className="mt-4 w-full text-xs">
              <RefreshCw />Clear Filters
            </Button>
          </div>
          <InfoCard
            title="Quick Stats"
            rows={[
              ["Total Sales", String(allActivity.filter((r) => isSaleActivity(r.type)).length)],
              ["Total Purchases", String(allActivity.filter((r) => isSaleActivity(r.type)).length)],
              ["Total Listings", String(allActivity.filter((r) => isListingActivity(r.type)).length)],
              ["Total Bids", String(allActivity.filter((r) => isBidActivity(r.type)).length)],
              ["Total Transfers", String(allActivity.filter((r) => isTransferActivity(r.type)).length)],
            ]}
          />
        </aside>
      </div>
    </AccountShell>
  );
}
