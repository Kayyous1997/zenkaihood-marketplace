import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Copy, Grid2X2, List, Twitter, MessageCircle, Globe2, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet";
import { AccountShell, InfoCard, InkHero, OwnedCard, SelectBox, Tabs, Verified } from "@/components/zenkai";
import { gqlClient } from "@/indexer/client";
import {
  GET_TOKENS_BY_OWNER,
  GET_LISTINGS_BY_SELLER,
  GET_USER_ACTIVITY,
  type TokensByOwnerResult,
  type ListingsBySellerResult,
  type UserActivityResult,
} from "@/indexer/queries";
import { DEFAULT_REFETCH_MS } from "@/indexer/events";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "My Profile — Zenkaihood" },
    { name: "description", content: "View your Zenkaihood profile: owned and listed collectibles, activity, and wallet stats." },
    { property: "og:title", content: "My Profile — Zenkaihood" },
    { property: "og:description", content: "Collector profile with owned works, listings and activity." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ProfilePage,
});

const tabs = [["Owned"], ["Listed"], ["Activity"]] as const;

function ProfilePage() {
  const [tab, setTab] = useState("Owned");
  const { wallet, chainName } = useWallet();

  const addrShort = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Not connected";

  const { data: ownedData, isLoading: ownedLoading } = useQuery({
    queryKey: ["profile-owned", wallet],
    queryFn: () => gqlClient.request<TokensByOwnerResult>(GET_TOKENS_BY_OWNER, {
      owner: wallet as `0x${string}`,
      first: 12,
      skip: 0,
    }),
    enabled: !!wallet,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["profile-listings", wallet],
    queryFn: () => gqlClient.request<ListingsBySellerResult>(GET_LISTINGS_BY_SELLER, {
      seller: wallet as `0x${string}`,
      first: 12,
      skip: 0,
    }),
    enabled: !!wallet,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["profile-activity", wallet],
    queryFn: () => gqlClient.request<UserActivityResult>(GET_USER_ACTIVITY, {
      account: wallet as `0x${string}`,
      first: 20,
      skip: 0,
    }),
    enabled: !!wallet,
    refetchInterval: DEFAULT_REFETCH_MS,
  });

  const ownedTokens = ownedData?.tokens ?? [];
  const listings = listingsData?.listings ?? [];
  const activity = activityData?.activities ?? [];
  const activeListings = listings.filter((l) => l.active);

  const isLoading = tab === "Owned" ? ownedLoading : tab === "Listed" ? listingsLoading : activityLoading;

  const stats = [
    ["Owned NFTs", String(ownedTokens.length)],
    ["Active Listings", String(activeListings.length)],
    ["Total Listings", String(listings.length)],
    ["Activity Events", String(activity.length)],
  ] as [string, string][];

  return (
    <AccountShell>
      <div className="page-section">
        <section className="overflow-hidden rounded-md border border-border bg-surface/90">
          <InkHero compact>
            <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
              <div className="flex size-28 items-center justify-center rounded-md border-4 border-surface bg-muted font-display text-4xl shadow-art">
                {wallet ? wallet.slice(2, 4).toUpperCase() : "?"}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-4xl font-semibold">
                  {addrShort} {wallet && <Verified />}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {wallet ?? "Connect your wallet"}
                  {wallet && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(wallet)}
                      aria-label="Copy address"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  )}
                  {chainName && <span className="rounded-sm bg-muted px-2 py-0.5 text-[10px]">{chainName}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline"><Pencil />Edit Profile</Button>
              </div>
            </div>
          </InkHero>

          {/* Stats bar */}
          <div className="grid grid-cols-2 divide-border border-t border-border sm:grid-cols-5 sm:divide-x">
            {stats.map(([label, value]) => (
              <div key={label} className="p-4">
                <b className="font-display text-xl">{value}</b>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
            <div className="flex items-center gap-2 p-4">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                Joined<b className="block text-xs text-foreground">Base Sepolia</b>
              </span>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_280px]">
          <section className="min-w-0">
            <Tabs items={tabs} value={tab} onChange={setTab} />
            <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                {tab} <small className="font-body text-xs font-normal text-muted-foreground">
                  {tab === "Owned" ? `${ownedTokens.length} items` :
                   tab === "Listed" ? `${listings.length} items` :
                   `${activity.length} events`}
                </small>
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-44"><SelectBox placeholder="Recently Added" items={["Recently Added"]} /></div>
                <Button variant="outline" size="icon" aria-label="Grid view"><Grid2X2 /></Button>
                <Button variant="outline" size="icon" aria-label="List view"><List /></Button>
              </div>
            </div>

            {!wallet ? (
              <div className="flex min-h-60 flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground">Connect your wallet to see your profile.</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />)}
              </div>
            ) : tab === "Owned" ? (
              ownedTokens.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No NFTs owned yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {ownedTokens.map((token, i) => (
                    <div key={token.id} className="card-hover animate-fade-in-up overflow-hidden rounded-md border border-border bg-surface/90" style={{ animationDelay: `${i * 0.04}s` }}>
                      <div className="aspect-square bg-muted" />
                      <div className="p-2">
                        <p className="truncate font-display text-xs font-semibold">#{token.tokenId}</p>
                        <p className="text-[10px] text-muted-foreground">{token.collection.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : tab === "Listed" ? (
              listings.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No listings yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {listings.map((listing, i) => (
                    <div key={listing.id} className="card-hover animate-fade-in-up overflow-hidden rounded-md border border-border bg-surface/90" style={{ animationDelay: `${i * 0.04}s` }}>
                      <div className="aspect-square bg-muted" />
                      <div className="p-2">
                        <p className="truncate font-display text-xs font-semibold">#{listing.tokenId}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${listing.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                          {listing.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              activity.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border bg-surface/90">
                  {activity.slice(0, 12).map((row) => (
                    <div key={row.id} className="flex items-center gap-3 p-3 text-xs">
                      <span className="rounded-full bg-muted px-2 py-1">{row.type}</span>
                      <span className="text-muted-foreground">
                        {row.collection?.id ? `${row.collection.id.slice(0, 8)}…` : "—"}
                        {row.tokenId ? ` #${row.tokenId}` : ""}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(Number(row.timestamp) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>

          <aside className="space-y-3">
            <div className="rounded-md border border-border bg-surface/90 p-4">
              <h2 className="font-display text-base font-semibold">Wallet Address</h2>
              <p className="mt-3 flex items-center gap-2 text-xs">
                {wallet ?? "Not connected"}
                {wallet && <Copy className="size-3.5 text-muted-foreground" />}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground"><span className="mr-2 rounded-sm bg-muted px-1.5 py-0.5">ENS</span>Not set</p>
            </div>
            <InfoCard title="Social Links" rows={[["X", "@handle"], ["Discord", "Not set"], ["Website", "Not set"]]} />
            <InfoCard
              title="Stats"
              rows={[
                ["Total Owned", String(ownedTokens.length)],
                ["Active Listings", String(activeListings.length)],
                ["Total Activity", String(activity.length)],
              ]}
            />
          </aside>
        </div>
      </div>
    </AccountShell>
  );
}
