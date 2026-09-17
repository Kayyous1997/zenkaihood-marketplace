import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Copy, Grid2X2, List, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountShell, InfoCard, PageHead, SelectBox, Tabs } from "@/components/zenkai";
import { SellDialog } from "@/components/dialogs";
import { useWallet } from "@/lib/wallet";
import { gqlClient } from "@/indexer/client";
import {
  GET_TOKENS_BY_OWNER,
  GET_ERC1155_BALANCES,
  type TokensByOwnerResult,
  type Erc1155BalancesResult,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS } from "@/indexer/events";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { resolveImageUri } from "@/lib/metadata";

export const Route = createFileRoute("/my-nfts")({
  head: () => ({ meta: [
    { title: "My NFTs — Zenkaihood" },
    { name: "description", content: "View, manage, and list the digital collectibles you own on the Zenkaihood marketplace." },
    { property: "og:title", content: "My NFTs — Zenkaihood" },
    { property: "og:description", content: "All the collectibles you own, ready to manage or list." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: MyNftsPage,
});

const PAGE_SIZE = 24;

function MyNftsPage() {
  const { wallet } = useWallet();
  const [tab, setTab] = useState("Owned");
  const [page, setPage] = useState(0);

  const { data: erc721Data, isLoading: erc721Loading } = useQuery({
    queryKey: ["owned-721", wallet, page],
    queryFn: () =>
      gqlClient.request<TokensByOwnerResult>(GET_TOKENS_BY_OWNER, {
        owner: wallet as `0x${string}`,
        first: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      }),
    enabled: !!wallet,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const { data: erc1155Data, isLoading: erc1155Loading } = useQuery({
    queryKey: ["owned-1155", wallet, page],
    queryFn: () =>
      gqlClient.request<Erc1155BalancesResult>(GET_ERC1155_BALANCES, {
        account: wallet as `0x${string}`,
        first: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      }),
    enabled: !!wallet,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const erc721Tokens = erc721Data?.tokens ?? [];
  const erc1155Balances = erc1155Data?.erc1155Balances ?? [];
  const isLoading = erc721Loading || erc1155Loading;
  const totalCount = erc721Tokens.length + erc1155Balances.length;

  const addrShort = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Not connected";

  return (
    <AccountShell>
      <PageHead title="My NFTs" description="Here are all the NFTs you own. View, manage, and list them on the marketplace." />
      <div className="page-section grid gap-5 xl:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          {/* Wallet header */}
          <section className="flex flex-col gap-5 rounded-md border border-border bg-surface/90 p-4 sm:flex-row sm:items-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-muted font-display text-2xl">
              {wallet ? wallet.slice(2, 4).toUpperCase() : "?"}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold">My NFTs</h2>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {addrShort}
                {wallet && (
                  <button type="button" onClick={() => navigator.clipboard.writeText(wallet)} aria-label="Copy address">
                    <Copy className="size-3" />
                  </button>
                )}
              </p>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 sm:border-l sm:border-border sm:pl-5">
              <div><b className="font-display text-lg">{erc721Tokens.length}</b><p className="text-[11px] text-muted-foreground">ERC-721 NFTs</p></div>
              <div><b className="font-display text-lg">{erc1155Balances.length}</b><p className="text-[11px] text-muted-foreground">ERC-1155 Types</p></div>
              <div><b className="font-display text-lg">{totalCount}</b><p className="text-[11px] text-muted-foreground">Total Items</p></div>
            </div>
          </section>

          <div className="mt-5"><Tabs items={[["Owned"], ["ERC-1155"]]} value={tab} onChange={setTab} /></div>

          <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">
              {tab === "Owned" ? "ERC-721 Tokens" : "ERC-1155 Balances"}
              {" "}<small className="font-body text-xs font-normal text-muted-foreground">({tab === "Owned" ? erc721Tokens.length : erc1155Balances.length})</small>
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-44"><SelectBox placeholder="Sort by: Recently Added" items={["Recently Added"]} /></div>
              <Button variant="outline" size="icon" aria-label="Grid view"><Grid2X2 /></Button>
              <Button variant="outline" size="icon" aria-label="List view"><List /></Button>
            </div>
          </div>

          {!wallet ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground">Connect your wallet to see your NFTs.</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : tab === "Owned" ? (
            erc721Tokens.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted-foreground">No ERC-721 NFTs found for this wallet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                {erc721Tokens.map((token, index) => (
                  <TokenCard
                    key={token.id}
                    collectionId={token.collection.id}
                    tokenId={token.tokenId}
                    tokenStandard="ERC-721"
                    index={index}
                  />
                ))}
              </div>
            )
          ) : (
            erc1155Balances.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted-foreground">No ERC-1155 tokens found for this wallet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                {erc1155Balances.map((bal, index) => (
                  <TokenCard
                    key={bal.id}
                    collectionId={bal.collection.id}
                    tokenId={bal.tokenId}
                    tokenStandard="ERC-1155"
                    quantity={bal.balance}
                    index={index}
                  />
                ))}
              </div>
            )
          )}

          {/* Pagination */}
          {wallet && totalCount > 0 && (
            <div className="mt-6 flex items-center justify-center gap-1">
              <Button size="icon" variant="outline" className="size-8 text-xs" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>←</Button>
              <Button size="icon" variant="default" className="size-8 text-xs">{page + 1}</Button>
              <Button size="icon" variant="outline" className="size-8 text-xs" onClick={() => setPage(page + 1)} disabled={totalCount < PAGE_SIZE}>→</Button>
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-md border border-border bg-surface/90 p-4">
            <h2 className="font-display text-base font-semibold">Wallet Address</h2>
            <p className="mt-3 flex items-center gap-2 text-xs">{addrShort}<Copy className="size-3.5 text-muted-foreground" /></p>
            <p className="mt-2 text-[11px] text-muted-foreground"><span className="mr-2 rounded-sm bg-muted px-1.5 py-0.5">ENS</span>Not set</p>
          </div>
          <InfoCard title="Collection Stats" rows={[["ERC-721 NFTs", String(erc721Tokens.length)], ["ERC-1155 Types", String(erc1155Balances.length)], ["Total Items", String(totalCount)]]} />
          <div className="rounded-md border border-border bg-surface/90 p-4">
            <h2 className="font-display text-base font-semibold">Quick Actions</h2>
            <Button asChild variant="ghost" className="mt-2 w-full justify-start text-xs"><Link to="/create"><Plus className="size-4" />Register Collection</Link></Button>
          </div>
        </aside>
      </div>
    </AccountShell>
  );
}

// ─── Token Card with per-token metadata + SellDialog ───────────────────────

function TokenCard({
  collectionId,
  tokenId,
  tokenStandard,
  quantity,
  index,
}: {
  collectionId: string;
  tokenId: string;
  tokenStandard: "ERC-721" | "ERC-1155";
  quantity?: string;
  index: number;
}) {
  const { imageUri, name, isLoading: metaLoading } = useTokenMetadata(
    collectionId as `0x${string}`,
    tokenId,
  );
  const resolvedImage = imageUri ? resolveImageUri(imageUri) : null;

  return (
    <div
      className="card-hover animate-fade-in-up group relative overflow-hidden rounded-md border border-border bg-surface/90"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link to="/nfts/$id" params={{ id: `${collectionId}-${tokenId}` }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {resolvedImage ? (
            <img
              src={resolvedImage}
              alt={name}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className={`size-full bg-muted ${metaLoading ? "animate-pulse" : ""}`} />
          )}
        </div>
        <div className="p-2">
          <p className="truncate font-display text-xs font-semibold">{name}</p>
          <p className="truncate text-[10px] text-muted-foreground">{collectionId.slice(0, 8)}…</p>
          {quantity && <p className="text-[10px] text-muted-foreground">Qty: {quantity}</p>}
        </div>
      </Link>
      {/* Sell button — appears on hover */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full p-2 transition-transform duration-200 group-hover:translate-y-0">
        <SellDialog
          nftContract={collectionId as `0x${string}`}
          tokenId={tokenId}
          tokenStandard={tokenStandard}
          label="List for Sale"
          variant="default"
          className="w-full text-[10px]"
        />
      </div>
    </div>
  );
}
