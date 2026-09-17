import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, ChevronRight, ClipboardList, Gavel, RefreshCw, ShoppingCart, Tag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountShell, InfoCard, PageHead, SelectBox, Tabs } from "@/components/zenkai";
import { gqlClient } from "@/indexer/client";
import {
  GET_GLOBAL_ACTIVITY,
  type GlobalActivityResult,
  type ActivityFragment,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS } from "@/indexer/events";
import { formatEthCompact } from "@/lib/token-format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [
    { title: "Marketplace Activity — Zenkaihood" },
    { name: "description", content: "Track all Zenkaihood marketplace activity — sales, listings, offers, bids and transfers." },
    { property: "og:title", content: "Marketplace Activity — Zenkaihood" },
    { property: "og:description", content: "Global marketplace event feed." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ActivityPage,
});

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
const PAGE_SIZE = 25;

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

const TAB_FILTERS: Record<string, string | null> = {
  All: null,
  Sales: "Sale",
  Listings: "Listing",
  Bids: "Bid",
  Transfers: "Transfer",
};

function ActivityRow({ row }: { row: ActivityFragment }) {
  const Icon = icons[row.type as keyof typeof icons] ?? Tag;
  const price = row.listing?.pricePerItem ?? row.offer?.amount ?? row.auction?.highestBid ?? null;
  const payToken = row.listing?.paymentToken ?? row.offer?.paymentToken ?? row.auction?.paymentToken ?? null;
  const isEth = payToken === ETH_ADDRESS;

  return (
    <div className="grid items-center gap-3 border-b border-border p-2 last:border-0 sm:grid-cols-[130px_1fr_130px_auto]">
      <div className="flex items-center gap-2">
        <span className={cn("grid size-9 shrink-0 place-content-center rounded-full text-xs", tints[row.type] ?? "bg-muted text-muted-foreground")}>
          <Icon className="size-4" />
        </span>
        <span>
          <b className="block text-xs">{row.type}</b>
          <small className="block text-[10px] text-muted-foreground">
            {new Date(Number(row.timestamp) * 1000).toLocaleDateString()}
          </small>
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <div className="size-10 shrink-0 rounded bg-muted" />
        <div className="min-w-0">
          <p className="truncate font-display text-xs font-semibold">
            {row.collection?.id
              ? `${row.collection.id.slice(0, 6)}…${row.collection.id.slice(-4)}`
              : "Unknown"}
            {row.tokenId ? ` #${row.tokenId}` : ""}
          </p>
          <p className="text-[10px] text-muted-foreground">{row.account.slice(0, 8)}…</p>
        </div>
      </div>
      <div className="text-xs">
        {price ? (
          <b>{isEth ? formatEthCompact(BigInt(price)) : `${price} tokens`}</b>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        <small className="mt-0.5 block text-[10px] text-muted-foreground">
          {row.transactionHash.slice(0, 8)}…
        </small>
      </div>
      <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
    </div>
  );
}

function ActivityPage() {
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(0);

  const typeFilter = TAB_FILTERS[tab] ?? null;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["global-activity", page, typeFilter],
    queryFn: () =>
      gqlClient.request<GlobalActivityResult>(GET_GLOBAL_ACTIVITY, {
        first: PAGE_SIZE,
        skip: page * PAGE_SIZE,
        type: typeFilter,
      }),
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const rows = data?.activities ?? [];

  return (
    <AccountShell>
      <PageHead eyebrow="Marketplace" title="Activity Feed" description="Live feed of all marketplace events — sales, listings, bids, and transfers." />
      <div className="page-section grid gap-5 xl:grid-cols-[1fr_280px]">
        <section className="min-w-0 rounded-md border border-border bg-surface/90">
          <div className="flex items-center justify-between border-b border-border px-4">
            <Tabs
              items={Object.keys(TAB_FILTERS).map((k) => [k])}
              value={tab}
              onChange={(v) => { setTab(v); setPage(0); }}
            />
            <Button variant="ghost" size="icon" className="size-8" onClick={() => refetch()} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No {tab.toLowerCase()} events yet.</p>
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
            <h2 className="font-display text-base font-semibold">Filters</h2>
            <label className="field-label">Event Type</label>
            <SelectBox
              placeholder="All Events"
              items={Object.keys(TAB_FILTERS)}
            />
            <Button variant="outline" className="mt-4 w-full text-xs" onClick={() => { setTab("All"); setPage(0); }}>
              <RefreshCw />Clear Filters
            </Button>
          </div>
          <InfoCard
            title="Live Stats"
            rows={[
              ["Total Events", String(rows.length)],
              ["Sales", String(rows.filter((r) => r.type === "Sale").length)],
              ["Listings", String(rows.filter((r) => r.type === "Listing").length)],
              ["Bids", String(rows.filter((r) => r.type === "Bid").length)],
            ]}
          />
        </aside>
      </div>
    </AccountShell>
  );
}