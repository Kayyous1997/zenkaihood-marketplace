import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IpfsImg } from "@/components/ipfs-img";
import { Verified } from "@/components/zenkai";
import type { CollectionMeta } from "@/hooks/useCollectionMeta";
import type { CollectionFragment } from "@/indexer/queries";
import { formatCategoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function collectionDisplayName(col: CollectionFragment, meta?: CollectionMeta | null | undefined) {
  return meta?.name?.trim() || shortAddr(col.id);
}

export function CollectionPreviewCard({
  col,
  meta,
  index = 0,
  editable = false,
}: {
  col: CollectionFragment;
  meta?: CollectionMeta | null | undefined;
  index?: number;
  editable?: boolean;
}) {
  const name = collectionDisplayName(col, meta);
  const banner = meta?.banner_url || (meta as any)?.bannerURI || meta?.logo_url || (meta as any)?.logoURI || null;
  const logo = meta?.logo_url || (meta as any)?.logoURI || null;
  const categories = meta?.categories || [];

  return (
    <div
      className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg animate-fade-in-up flex flex-col justify-between"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link
        to="/collections/$slug"
        params={{ slug: col.id }}
        className="block"
      >
        <div className="relative aspect-[2.2] overflow-hidden bg-muted">
          {banner ? (
            <IpfsImg uri={banner} alt="" className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <div className="size-full bg-gradient-to-br from-muted via-card to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          {logo ? (
            <IpfsImg
              uri={logo}
              alt=""
              className="absolute bottom-0 left-3 size-12 translate-y-1/2 rounded-full border-[3px] border-card object-cover shadow-md"
            />
          ) : (
            <div className="absolute bottom-0 left-3 grid size-12 translate-y-1/2 place-content-center rounded-full border-[3px] border-card bg-muted text-sm font-display shadow-md">
              {name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="px-3 pb-2 pt-7">
          <h3 className="truncate text-sm font-semibold flex items-center gap-1">
            {name} {col.verified && <Verified />}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">by {shortAddr(col.creator)}</p>

          {categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {categories.slice(0, 4).map((catId: string) => (
                <span
                  key={catId}
                  className="rounded-md bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 text-[9px] font-semibold"
                >
                  {formatCategoryLabel(catId)}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <Stat label="Listed" value={String(col.activeListingCount)} />
            <Stat label="Auctions" value={String(col.activeAuctionCount)} />
            <Stat label="Standard" value={col.tokenStandard} />
          </div>
        </div>
      </Link>

      {editable && (
        <div className="p-3 pt-0 mt-auto">
          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 w-full bg-surface/50 hover:bg-surface">
            <Link to="/edit-collection" search={{ contract: col.id }}>
              <Pencil className="size-3.5" /> Edit Details & Royalties
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export function CollectionPreviewRow({
  col,
  meta,
}: {
  col: CollectionFragment;
  meta?: CollectionMeta | null | undefined;
}) {
  const name = collectionDisplayName(col, meta);
  const logo = meta?.logo_url || (meta as any)?.logoURI || null;

  return (
    <Link
      to="/collections/$slug"
      params={{ slug: col.id }}
      className="grid items-center gap-3 border-b border-border px-3 py-2.5 last:border-0 hover:bg-muted/30 sm:grid-cols-[1fr_80px_80px_80px]"
    >
      <div className="flex min-w-0 items-center gap-3">
        {logo ? (
          <IpfsImg uri={logo} alt="" className="size-10 rounded-full object-cover" />
        ) : (
          <div className="grid size-10 place-content-center rounded-full bg-muted text-xs font-display">{name.slice(0, 1)}</div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {name} {col.verified && <Verified />}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{shortAddr(col.creator)}</p>
        </div>
      </div>
      <span className="hidden text-right text-xs sm:block">{col.activeListingCount}</span>
      <span className="hidden text-right text-xs sm:block">{col.activeAuctionCount}</span>
      <span className="hidden text-right text-xs sm:block">{col.activeOfferCount}</span>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide text-muted-foreground")}>{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
