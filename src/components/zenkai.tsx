import { ConnectButton, useChainModal } from "@rainbow-me/rainbowkit";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Filter,
  Gem,
  Grid2X2,
  Heart,
  List,
  Menu,
  Moon,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Tag,

  PlusSquare,
  TriangleAlert,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import cyber from "@/assets/cyber.jpg";
import landscape from "@/assets/zenkai-landscape.jpg";
import lotus from "@/assets/lotus.jpg";
import moon from "@/assets/moon.jpg";
import ronin from "@/assets/ronin.jpg";
import sakura from "@/assets/sakura.jpg";
import { Button } from "@/components/ui/button";
import { useDisconnectWallet, useWallet } from "@/lib/wallet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const art = { ronin, sakura, cyber, lotus, moon };

export const collections = [
  { slug: "the-ronin", name: "The Ronin", creator: "Zenkaihood", art: ronin, floor: "1.25 ETH", volume: "24.8 ETH", items: "1.2k", supply: "777", owners: "642", chain: "Ethereum", description: "A collection of 777 lone warriors, each carrying a story of honor, loss, and the endless pursuit of a greater tomorrow." },
  { slug: "sakura-origins", name: "Sakura Origins", creator: "Sakura Studio", art: sakura, floor: "0.42 ETH", volume: "12.6 ETH", items: "850", supply: "850", owners: "510", chain: "Ethereum", description: "850 hand-drawn blooms tracing the fleeting beauty of spring across an ephemeral petal-strewn skyline." },
  { slug: "cyber-edo", name: "Cyber Edo", creator: "Digital Forge", art: cyber, floor: "0.78 ETH", volume: "18.3 ETH", items: "1.5k", supply: "1.5k", owners: "980", chain: "Base", description: "A neon-lit reimagining of the Edo period: 1,500 holographic scrolls where circuitry meets calligraphy." },
  { slug: "the-lotus", name: "The Lotus", creator: "Lotus Collective", art: lotus, floor: "0.35 ETH", volume: "9.7 ETH", items: "640", supply: "640", owners: "420", chain: "Ethereum", description: "640 meditative stillness studies â€” each lotus a quiet vow that still water runs deeper than the storm." },
  { slug: "void-samurai", name: "Void Samurai", creator: "Zero Studio", art: moon, floor: "1.08 ETH", volume: "32.1 ETH", items: "920", supply: "920", owners: "700", chain: "Arbitrum", description: "920 shadow-clad sentinels born under a red moon, bound by blood oath to the silence between worlds." },
];

export function getCollection(slug: string) {
  return collections.find((c) => c.slug === slug) ?? collections[0]!;
}

export function collectionSlugByName(name: string) {
  return collections.find((c) => c.name === name)?.slug ?? collections[0]!.slug;
}

const COLLECTION_ITEM_POOL: Record<string, { words: string[]; traits: string[] }> = {
  "The Ronin": { words: ["Shadow", "Moon", "Crimson", "Iron", "Silent", "Ember", "Twilight", "Frost", "Storm", "Ash"], traits: ["Warrior", "Red", "Hat", "Moon", "Night", "Cloak", "Wanderer", "Tattoo", "Blood", "Zen"] },
  "Sakura Origins": { words: ["Bloom", "Petal", "Breeze", "Dawn", "Spring", "Whisper", "Drift", "Garden", "Canopy", "Mist"], traits: ["Peace", "Sakura", "Wind", "Bloom", "Petal", "Spring", "Dawn", "Breeze", "Blossom", "Soft"] },
  "Cyber Edo": { words: ["Neon", "Grid", "Pulse", "Signal", "Hologram", "Rain", "Circuit", "Static", "Vector", "Overdrive"], traits: ["Temple", "Night", "Neon", "Cyber", "Edo", "Grid", "Hologram", "Rain", "Signal", "Pulse"] },
  "The Lotus": { words: ["Dream", "Path", "Pond", "Stillness", "Bloom", "Reflection", "Mist", "Reed", "Lily", "Tranquil"], traits: ["Lotus", "Nature", "Calm", "Water", "Still", "Pond", "Zen", "Bloom", "Mist", "Green"] },
  "Void Samurai": { words: ["Red", "Void", "Eclipse", "Fury", "Ash", "Wraith", "Onyx", "Abyss", "Hollow", "Dusk"], traits: ["Shadow", "Rage", "Blood", "Moon", "Void", "Dark", "Blade", "Fury", "Eclipse", "Ash"] },
};

/** Deterministic 10-item gallery for a collection page (no Math.random, so SSR/CSR match). */
export function collectionItems(slug: string): typeof nfts {
  const col = getCollection(slug);
  const pool = COLLECTION_ITEM_POOL[col.name] ?? COLLECTION_ITEM_POOL["The Ronin"]!;
  const basePrice = parseFloat(col.floor.replace(/[^0-9.]/g, "")) || 1;
  return Array.from({ length: 10 }, (_, i) => {
    const id = "#" + String(10 + i * 7 + 3).padStart(3, "0");
    const price = (basePrice * (0.55 + (((i * 37) % 100) / 100) * 1.4)).toFixed(2) + " ETH";
    const traits = [pool.traits[i % pool.traits.length]!, pool.traits[(i + 3) % pool.traits.length]!, pool.traits[(i + 6) % pool.traits.length]!];
    return {
      name: `${pool.words[i]} ${pool.words[(i + 5) % pool.words.length]}`,
      id,
      art: col.art,
      collection: col.name,
      price,
      time: `${i + 1}h ago`,
      traits,
    };
  });
}

export const nfts = [
  { name: "Shadow Walker", id: "#042", art: ronin, collection: "The Ronin", price: "1.23 ETH", time: "2h ago", traits: ["Warrior", "Red", "Hat"] },
  { name: "Sakura Bloom", id: "#118", art: sakura, collection: "Sakura Origins", price: "0.56 ETH", time: "5h ago", traits: ["Peace", "Sakura", "Wind"] },
  { name: "Neon Temple", id: "#017", art: cyber, collection: "Cyber Edo", price: "0.98 ETH", time: "7h ago", traits: ["Temple", "Night", "Neon"] },
  { name: "Lotus Dream", id: "#263", art: lotus, collection: "The Lotus", price: "0.42 ETH", time: "9h ago", traits: ["Lotus", "Nature", "Calm"] },
  { name: "Red Moon", id: "#089", art: moon, collection: "Void Samurai", price: "1.67 ETH", time: "12h ago", traits: ["Shadow", "Rage", "Blood"] },
  { name: "Petal Ronin", id: "#356", art: sakura, collection: "The Ronin", price: "0.48 ETH", time: "15h ago", traits: ["Peace", "Sakura", "Wind"] },
  { name: "Moon Sentinel", id: "#421", art: moon, collection: "The Ronin", price: "1.32 ETH", time: "18h ago", traits: ["Moon", "Night", "Cloak"] },
  { name: "Wanderer", id: "#487", art: ronin, collection: "The Ronin", price: "0.75 ETH", time: "20h ago", traits: ["Wanderer", "Tattoo", "Red"] },
  { name: "Mountain Sage", id: "#532", art: landscape, collection: "The Ronin", price: "1.18 ETH", time: "1d ago", traits: ["Mountain", "Fog", "Zen"] },
  { name: "Blood Oath", id: "#603", art: moon, collection: "The Ronin", price: "0.63 ETH", time: "1d ago", traits: ["Blood", "Warrior", "Moon"] },
];

const nav = [
  ["Explore", "/explore"],
  ["Activity", "/activity"],
] as const;

export function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Zenkaihood home">
      <span className="font-jp text-[2rem] font-black leading-none text-primary">è”µ</span>
      <span className="font-display text-xl font-semibold text-foreground">Zenkaihood</span>
    </Link>
  );
}

export function Header() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-4 sm:px-8 lg:px-14">
        <Brand />
        <nav className="hidden h-full items-center gap-8 md:flex">
          {nav.map(([label, to]) => {
            const active = path.startsWith(to.split("/").slice(0, 2).join("/"));
            return <Link key={to} to={to} className={cn("nav-link", active && "nav-link-active")}>{label}</Link>;
          })}
        </nav>
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <div className="flex h-9 w-[310px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-muted-foreground">
            <Search className="size-4" /><span className="text-xs">Search NFTs, collections, or creators...</span>
          </div>
          <ThemeToggle />
          <AccountNav />
        </div>
        <Button className="ml-auto md:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>
      <nav className={cn("grid overflow-hidden border-t border-border bg-background px-4 transition-all duration-250 ease-out md:hidden", mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}>
        {nav.map(([label, to]) => <Link key={to} to={to} onClick={() => setMobileOpen(false)} className="border-b border-border/60 py-3 text-sm last:border-0">{label}</Link>)}
        <AccountNav className="mt-3" onNavigate={() => setMobileOpen(false)} />
      </nav>
    </header>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("zenkaihood-theme");
    const isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("zenkaihood-theme", next ? "dark" : "light");
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

function AccountNav({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <div className={cn("flex items-center", className)}>
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
          const ready = mounted && authenticationStatus !== "loading";
          const connected = ready && account && chain;
          if (!ready) return <div aria-hidden="true" className="h-9 w-36" />;
          if (!connected) {
            return <Button className="gap-2" onClick={openConnectModal}><WalletCards />Connect Wallet</Button>;
          }
          if (chain.unsupported) {
            return <Button variant="destructive" className="gap-2" onClick={openChainModal}><TriangleAlert className="size-4" />Wrong network</Button>;
          }
          return (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="hidden gap-2 sm:flex" onClick={openChainModal}>
                {chain.hasIcon && chain.iconUrl && <img alt={chain.name ?? "Network"} src={chain.iconUrl} className="size-4 rounded-full" />}
                {chain.name}
              </Button>
              <Button className="gap-2" onClick={openAccountModal}>
                <UserRound className="size-4" />{account.displayName}
                {account.displayBalance && <span className="hidden text-xs opacity-75 xl:inline">{account.displayBalance}</span>}
              </Button>
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}

/** Opens the RainbowKit connect modal (real wallets, real signatures). */
export function WalletDialog({ className }: { className?: string | undefined }) {
  return <AccountNav className={className} />;
}

/** Full-width warning shown on every page while the wallet is on an unsupported network. */
function UnsupportedNetworkBanner() {
  const { connected, unsupported, ready } = useWallet();
  const { openChainModal } = useChainModal();
  if (!ready || !connected || !unsupported) return null;
  return (
    <div className="flex items-center justify-center gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
      <TriangleAlert className="size-4 shrink-0" />
      <span>Your wallet is connected to an unsupported network.</span>
      <button type="button" onClick={() => openChainModal?.()} className="font-semibold underline underline-offset-2">
        Switch network
      </button>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen"><Header /><UnsupportedNetworkBanner />{children}</div>;
}

export function InkHero({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <section className={cn("relative overflow-hidden border-b border-border", compact ? "min-h-40" : "min-h-[390px]") }>
      <img src={landscape} alt="Ink-wash mountains and a pagoda" width={1920} height={704} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-hero-wash" />
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="font-jp text-2xl font-black text-primary">è”µ</span>
      <h2 className="font-display text-2xl font-semibold">{children}</h2>
      <div className="h-px flex-1 bg-border" />
      {action}
    </div>
  );
}

export function Verified() { return <BadgeCheck className="inline size-3.5 fill-info text-info" aria-label="Verified" />; }

export function CollectionCard({ item, index = 0 }: { item: (typeof collections)[number]; index?: number }) {
  return (
    <Link to="/collections/$slug" params={{ slug: item.slug }} className="group flex min-w-0 items-center gap-4 rounded-md border border-border bg-surface/80 p-3 transition-all duration-300 hover:bg-accent card-hover animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <img src={item.art} alt={`${item.name} collection`} width={1024} height={1024} loading="lazy" className="size-20 shrink-0 rounded object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display font-semibold">{item.name} <Verified /></h3>
        <p className="mt-1 text-xs text-muted-foreground">by {item.creator}</p>
        <div className="mt-3 flex gap-4 text-[11px]"><span>â—† {item.floor}<small> Floor</small></span><span>â™¨ {item.volume}<small> Volume</small></span><span>{item.items}<small> Items</small></span></div>
      </div>
    </Link>
  );
}

export function NftCard({ item, compact = false, index = 0 }: { item: (typeof nfts)[number]; compact?: boolean; index?: number }) {
  const [liked, setLiked] = useState(false);
  return (
    <Link to="/nfts/$id" params={{ id: item.id }} className="group relative block overflow-hidden rounded-md border border-border bg-surface/90 p-2 card-hover animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className={cn("relative overflow-hidden rounded-sm", compact ? "aspect-[1.22]" : "aspect-square")}>
        <img src={item.art} alt={`${item.name} ${item.id}`} width={1024} height={1024} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1.5 top-1.5 size-7 bg-overlay text-overlay-foreground transition-transform hover:scale-110 hover:bg-overlay press"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
          aria-label={liked ? "Remove favorite" : "Add favorite"}
        >
          <Heart className={cn("size-3.5 transition-colors", liked && "fill-primary text-primary animate-heart-pop")} />
        </Button>
      </div>
      <div className="px-1 pb-1 pt-2">
        <p className="text-[11px] text-muted-foreground">â—‰ {item.collection} <Verified /></p>
        <h3 className="mt-0.5 truncate font-display text-sm font-semibold">{item.name} {item.id}</h3>
        {!compact && <div className="mt-1.5 flex flex-wrap gap-1">{item.traits.map((trait) => <span key={trait} className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{trait}</span>)}</div>}
        <p className="mt-2 text-xs font-semibold">â—† {item.price}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">Listed {item.time}</p>
      </div>
    </Link>
  );
}

export function SelectBox({ placeholder, items, onSelect }: { placeholder: string; items: string[]; onSelect?: (value: string) => void }) {
  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger className="bg-surface text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{items.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function FilterPanel() {
  return (
    <aside className="rounded-md border border-border bg-surface/90 p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Filters</h2><Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground">Clear all</Button></div>
      <FilterGroup title="Status">
        {["All", "Buy Now", "On Auction", "Has Offers"].map((label, index) => <label key={label} className="flex items-center gap-2 py-1 text-xs"><Checkbox defaultChecked={index === 0} />{label}</label>)}
      </FilterGroup>
      <FilterGroup title="Price Range"><div className="grid grid-cols-2 gap-2"><input className="control" placeholder="Min" /><input className="control" placeholder="Max" /></div></FilterGroup>
      <FilterGroup title="Collections"><SelectBox placeholder="All Collections" items={["All Collections", "The Ronin", "Sakura Origins"]} /></FilterGroup>
      <FilterGroup title="Rarity"><SelectBox placeholder="All Rarities" items={["All Rarities", "Legendary", "Rare", "Common"]} /></FilterGroup>
      <FilterGroup title="Traits"><Button variant="outline" className="w-full justify-between text-xs font-normal">Select traits<ChevronDown /></Button></FilterGroup>
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="border-t border-border py-4 first:border-t-0"><h3 className="mb-2 text-xs font-semibold">{title}</h3>{children}</div>;
}

export function Stat({ icon, label, value, sub }: { icon?: ReactNode; label: string; value: string; sub?: string }) {
  return <div className="min-w-0 px-4 py-3 text-center first:pl-0"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold">{icon}{value}</p>{sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}</div>;
}

export const featureIcons = [Gem, ShieldCheck, Users];
export const utilityIcons = { Activity, CalendarDays, ExternalLink, Filter, Grid2X2, List, Search, Settings, Share2, SlidersHorizontal, Tag, WalletCards };

export function PriceSummary({ price }: { price: number }) {
  const fee = price * 0.025;
  const royalty = price * 0.05;
  const receive = price - fee - royalty;
  const money = (value: number) => `$${(value * 2854.64).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <div className="rounded-md border border-border bg-surface/95 p-5">
      <h2 className="font-display text-lg font-semibold">Listing Summary</h2>
      <div className="my-5 flex items-center gap-4"><img src={ronin} alt="The Ronin #042" width={1024} height={1024} className="size-20 rounded object-cover" /><div><h3 className="font-display font-semibold">The Ronin #042 <Verified /></h3><p className="text-xs text-muted-foreground">Sakura Origins ðŸŒ¸</p><p className="mt-1 text-xs text-muted-foreground">Token ID: #042</p></div></div>
      <div className="space-y-4 border-y border-border py-4 text-sm">
        <SummaryRow label="Your Price" value={`${price || 0} ETH`} sub={money(price || 0)} />
        <SummaryRow label="Marketplace Fee (2.5%)" value={`${fee.toFixed(4)} ETH`} sub={money(fee)} />
        <SummaryRow label="Creator Royalty (5%)" value={`${royalty.toFixed(3)} ETH`} sub={money(royalty)} />
      </div>
      <div className="mt-4"><SummaryRow label="You'll Receive" value={`${receive.toFixed(4)} ETH`} sub={money(receive)} strong /></div>
      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">â“˜ Royalty percentage is set by the collection creator and cannot be changed by the seller.</p>
    </div>
  );
}

function SummaryRow({ label, value, sub, strong }: { label: string; value: string; sub: string; strong?: boolean }) {
  return <div className="flex justify-between gap-4"><span className={cn("text-muted-foreground", strong && "font-semibold text-foreground")}>{label}</span><span className="text-right"><b className={cn(strong && "font-display text-base")}>{value}</b><small className="block text-muted-foreground">â‰ˆ {sub}</small></span></div>;
}

export function ListingReview({ price }: { price: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button className="min-w-40">Review Listing <ArrowRight /></Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle className="font-display text-2xl">Review your listing</DialogTitle><DialogDescription>The Ronin #042 will be offered for {price || 0} ETH. This is a visual preview and no blockchain transaction will occur.</DialogDescription></DialogHeader><DialogFooter><Button>Confirm Preview</Button></DialogFooter></DialogContent>
    </Dialog>
  );
}

/** Sell / list-for-sale flow for an item the connected wallet owns. */
export function SellDialog({ itemName = "your NFT", defaultPrice = "1.0", label = "List for Sale", variant = "outline", className }: { itemName?: string; defaultPrice?: string; label?: string; variant?: "default" | "outline" | "ghost"; className?: string }) {
  const [priceText, setPriceText] = useState(defaultPrice);
  const [done, setDone] = useState(false);
  const price = Number(priceText.replace(/[^0-9.]/g, "")) || 0;
  const fee = price * 0.025;
  const royalty = price * 0.05;
  const receive = price - fee - royalty;
  const money = (value: number) => `$${(value * 2854.64).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <Dialog onOpenChange={(open) => !open && setDone(false)}>
      <DialogTrigger asChild><Button variant={variant} className={cn("press", className)}><Tag />{label}</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{done ? "Listing created" : `Sell ${itemName}`}</DialogTitle>
          <DialogDescription>{done ? `${itemName} is now offered at ${price} ETH. This is a visual preview â€” no real transaction occurred.` : "Set your asking price. Your NFT stays in your wallet until it sells."}</DialogDescription>
        </DialogHeader>
        {!done && (
          <div className="space-y-4">
            <div>
              <label className="field-label mt-0" htmlFor="sell-price">Price</label>
              <div className="flex">
                <input id="sell-price" value={priceText} onChange={(event) => setPriceText(event.target.value)} inputMode="decimal" className="control min-w-0 flex-1 rounded-r-none" />
                <span className="flex items-center rounded-r-md border border-l-0 border-border px-3 text-sm">â—† ETH</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">â‰ˆ {money(price)} (estimated)</p>
            </div>
            <div>
              <label className="field-label mt-0" htmlFor="sell-duration">Duration</label>
              <SelectBox placeholder="7 days" items={["1 day", "3 days", "7 days", "1 month", "No expiration"]} />
            </div>
            <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Marketplace Fee (2.5%)</span><b>{fee.toFixed(4)} ETH</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Creator Royalty (5%)</span><b>{royalty.toFixed(4)} ETH</b></div>
              <div className="flex justify-between border-t border-border pt-3"><span className="font-semibold">You&apos;ll Receive</span><b className="font-display text-base">{receive.toFixed(4)} ETH</b></div>
            </div>
          </div>
        )}
        <DialogFooter>{done ? <Button variant="outline">Done</Button> : <Button onClick={() => setDone(true)} disabled={price <= 0}>Complete Listing <ArrowRight /></Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useVisibleNfts() {
  const [limit, setLimit] = useState(10);
  return useMemo(() => ({ items: nfts.slice(0, limit), showMore: () => setLimit(10) }), [limit]);
}
export const accountLinks = [
  ["Profile", "/profile"],
  ["My NFTs", "/my-nfts"],
  ["Listings", "/listings"],
  ["Register Collection", "/create"],
  ["Activity", "/my-activity"],
] as const;

const accountIcons = { Profile: UserRound, "My NFTs": WalletCards, Listings: CalendarDays, "Register Collection": PlusSquare, Activity: Settings } as const;

export function AccountRail() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <aside className="hidden w-[210px] shrink-0 border-r border-border bg-surface/50 px-3 py-5 lg:block">
      {accountLinks.map(([label, to]) => {
        const Icon = accountIcons[label];
        const active = path === to;
        return (
          <Button key={to} asChild variant="ghost" className={cn("mb-1 w-full justify-start gap-3 text-xs", active && "border-l-2 border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary")}>
            <Link to={to}><Icon className="size-4" />{label}</Link>
          </Button>
        );
      })}
      <div className="mt-16 hidden flex-col items-center gap-3 opacity-70 xl:flex">
        <span className="font-jp text-4xl font-semibold leading-tight text-foreground/70">å‰<br />é€²</span>
        <span className="grid size-8 place-content-center rounded-sm bg-primary font-jp text-[10px] text-primary-foreground">ç¦…</span>
      </div>
    </aside>
  );
}

export function AccountShell({ children }: { children: ReactNode }) {
  const { connected, ready } = useWallet();
  if (!ready) return <Shell><div className="min-h-[60vh]" /></Shell>;
  if (!connected) {
    return (
      <Shell>
        <div className="mx-auto grid min-h-[60vh] max-w-md place-content-center px-4 text-center">
          <span className="mx-auto font-jp text-5xl font-black text-primary">è”µ</span>
          <h1 className="mt-4 font-display text-3xl font-semibold">Connect your wallet</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your profile, collectibles, listings and activity are available once a wallet is connected.</p>
          <div className="mt-6 flex justify-center"><WalletDialog /></div>
        </div>
      </Shell>
    );
  }
  return <Shell><div className="flex"><AccountRail /><div className="min-w-0 flex-1">{children}</div></div></Shell>;
}

export const profile = {
  name: "Akeno",
  address: "0x7a3f...9c2e",
  bio: "Building, collecting, and just vibing with the art. Zenkaihood is more than just NFTs.",
  avatar: ronin,
  stats: [["Owned", "12"], ["Created", "8"], ["Listed", "4"], ["Favorites", "23"]] as const,
};

export const owned = [
  { name: "The Ronin", id: "#042", art: ronin, collection: "Sakura Origins", price: "0.58 ETH" },
  { name: "Sakura Bloom", id: "#118", art: sakura, collection: "Sakura Origins", price: "0.56 ETH" },
  { name: "Neon Temple", id: "#017", art: cyber, collection: "Cyber Edo", price: "0.98 ETH" },
  { name: "Lotus Dream", id: "#263", art: lotus, collection: "The Lotus", price: "0.42 ETH" },
  { name: "Void Samurai", id: "#267", art: moon, collection: "The Ronin", price: "1.67 ETH" },
  { name: "Mountain Path", id: "#318", art: landscape, collection: "The Lotus", price: "1.18 ETH" },
  { name: "Cherry Blossom", id: "#142", art: sakura, collection: "Sakura Origins", price: "0.82 ETH" },
  { name: "Shadow Walker", id: "#042", art: moon, collection: "The Ronin", price: "1.23 ETH" },
  { name: "Moonlight Path", id: "#205", art: landscape, collection: "Sakura Origins", price: "0.91 ETH" },
  { name: "Crimson Blade", id: "#096", art: ronin, collection: "The Ronin", price: "1.04 ETH" },
  { name: "Eternal Shrine", id: "#133", art: sakura, collection: "The Lotus", price: "0.76 ETH" },
  { name: "Rising Sun", id: "#221", art: cyber, collection: "Cyber Edo", price: "1.21 ETH" },
];

export const listings = [
  { name: "The Ronin", id: "#042", art: ronin, collection: "Sakura Origins", price: "0.58", usd: "1,427.32", left: "2 days left", date: "Aug 22, 2025 Â· 14:30" },
  { name: "Sakura Bloom", id: "#118", art: sakura, collection: "Sakura Origins", price: "0.56", usd: "1,380.24", left: "5 days left", date: "Aug 25, 2025 Â· 10:15" },
  { name: "Lotus Dream", id: "#263", art: lotus, collection: "The Lotus", price: "0.42", usd: "1,035.12", left: "7 days left", date: "Aug 27, 2025 Â· 09:45" },
  { name: "Void Samurai", id: "#267", art: moon, collection: "The Ronin", price: "1.67", usd: "4,125.40", left: "10 days left", date: "Aug 30, 2025 Â· 16:20" },
  { name: "Mountain Path", id: "#318", art: landscape, collection: "The Lotus", price: "1.18", usd: "2,912.16", left: "12 days left", date: "Sep 1, 2025 Â· 11:50" },
];

export const userActivity = [
  { type: "Purchase", state: "Completed", date: "Aug 30, 2025 Â· 14:32", name: "The Ronin", id: "#042", art: ronin, collection: "Sakura Origins", detail: "Bought for 0.58 ETH", price: "0.58", usd: "1,427.32", hash: "0x7a3f...9c2e" },
  { type: "Sale", state: "Completed", date: "Aug 28, 2025 Â· 11:17", name: "Sakura Bloom", id: "#118", art: sakura, collection: "Sakura Origins", detail: "Sold for 0.56 ETH", price: "0.56", usd: "1,380.24", hash: "0x8f2c...6d4a" },
  { type: "Listing", state: "Active", date: "Aug 27, 2025 Â· 09:45", name: "Lotus Dream", id: "#263", art: lotus, collection: "The Lotus", detail: "Listed for 0.42 ETH", price: "0.42", usd: "1,035.12", hash: "0x9a1e...7a0c" },
  { type: "Bid", state: "Open", date: "Aug 25, 2025 Â· 18:22", name: "Void Samurai", id: "#267", art: moon, collection: "The Ronin", detail: "Placed bid of 0.35 ETH", price: "0.35", usd: "862.44", hash: "0x4b1a...d7e3" },
  { type: "Transfer", state: "Completed", date: "Aug 24, 2025 Â· 16:08", name: "Mountain Path", id: "#318", art: landscape, collection: "The Lotus", detail: "Received from 0x3f2c...9e1a", price: "", usd: "", hash: "0x3f2c...9e1a" },
  { type: "Purchase", state: "Completed", date: "Aug 22, 2025 Â· 12:36", name: "Cherry Blossom", id: "#142", art: sakura, collection: "Sakura Origins", detail: "Bought for 0.82 ETH", price: "0.82", usd: "2,012.16", hash: "0x6d7e...2c8f" },
];

export function PageHead({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <InkHero compact>
      <div className="relative mx-auto flex max-w-[1440px] flex-col justify-between gap-4 px-4 py-8 sm:px-8 lg:flex-row lg:items-end">
        <div>
          {eyebrow && <p className="eyebrow"><span />{eyebrow}</p>}
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
    </InkHero>
  );
}

export function OwnedCard({ item, badge = "Owned", index = 0 }: { item: (typeof owned)[number]; badge?: string; index?: number }) {
  const [liked, setLiked] = useState(false);
  return (
    <Link to="/nfts/$id" params={{ id: item.id }} className="group block overflow-hidden rounded-md border border-border bg-surface/90 card-hover animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="relative aspect-[1.1] overflow-hidden">
        <img src={item.art} alt={`${item.name} ${item.id}`} width={1024} height={1024} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
          aria-label={liked ? "Remove favorite" : "Add favorite"}
          className="absolute right-2 top-2 size-7 rounded-full bg-surface/90 transition-transform hover:scale-110 hover:bg-surface press"
        >
          <Heart className={cn("size-3.5 transition-colors", liked && "fill-primary text-primary animate-heart-pop")} />
        </Button>
      </div>
      <div className="p-3">
        <h3 className="truncate font-display text-sm font-semibold">{item.name} {item.id}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">âœ¿ {item.collection} <Verified /></p>
        <p className="mt-1 text-[11px] text-muted-foreground">Token ID: {item.id}</p>
        <p className="mt-1 text-xs font-semibold">{item.price}</p>
        <span className="mt-2 inline-block rounded-sm bg-success/15 px-2 py-0.5 text-[10px] text-success">{badge}</span>
      </div>
    </Link>
  );
}

export function Tabs({ items, value, onChange }: { items: readonly (readonly [string, string?])[]; value: string; onChange: (next: string) => void }) {
  return (
    <div className="flex overflow-x-auto border-b border-border">
      {items.map(([label, count]) => (
        <Button key={label} variant="ghost" onClick={() => onChange(label)} className={value === label ? "tab-active" : "tab"}>
          {label}{count && <small className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{count}</small>}
        </Button>
      ))}
    </div>
  );
}

export function InfoCard({ title, rows }: { title: string; rows: readonly (readonly [string, string])[] }) {
  return (
    <div className="rounded-md border border-border bg-surface/90 p-4">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {rows.map(([label, value]) => <div key={label} className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><b>{value}</b></div>)}
    </div>
  );
}

