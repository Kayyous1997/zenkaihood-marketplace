import { Link } from "@tanstack/react-router";
import {
  ArrowUp,
  ExternalLink,
  Github,
  Layers,
  Palette,
  ShieldCheck,
  Sparkles,
  Twitter,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMarketplaceConfig } from "@/hooks/useMarketplaceConfig";

export function Footer() {
  const { platformFeePercent } = useMarketplaceConfig();

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="mt-auto border-t border-border bg-card/60 backdrop-blur-md">
      {/* Top Footer Banner / Quick Stats */}
      <div className="border-b border-border/60 bg-muted/20 py-4 px-4 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1440px] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6 text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Base Sepolia &amp; Robinhood Testnet
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1">
              <Zap className="size-3.5 text-amber-500" /> {platformFeePercent} Marketplace Fee
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-primary" /> Anti-Sniping Live Auctions
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToTop}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
          >
            Back to top <ArrowUp className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Footer Links Grid */}
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="grid size-9 place-content-center rounded-xl bg-primary text-primary-foreground font-jp text-base font-bold shadow-md shadow-primary/20">
                蔵
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                Zenkai<span className="text-primary">hood</span>
              </span>
            </Link>

            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              The premier decentralized NFT marketplace and creator launchpad. Discover verified digital art, create smart contracts, and trade securely with {platformFeePercent === "0%" ? "zero" : platformFeePercent} marketplace fees.
            </p>

            <div className="flex items-center gap-2 pt-1 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="size-3" /> Web3 Digital Collectibles
              </span>
            </div>
          </div>

          {/* Marketplace Column */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
              Marketplace
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/explore" className="transition-colors hover:text-foreground">
                  Explore Collections
                </Link>
              </li>
              <li>
                <Link to="/explore" className="transition-colors hover:text-foreground">
                  Live Auctions
                </Link>
              </li>
              <li>
                <Link to="/listings" className="transition-colors hover:text-foreground">
                  Recent Listings
                </Link>
              </li>
              <li>
                <Link to="/activity" className="transition-colors hover:text-foreground">
                  Market Activity
                </Link>
              </li>
            </ul>
          </div>

          {/* Creator Studio Column */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
              Creator Studio
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/create" className="transition-colors hover:text-foreground">
                  Create Collection
                </Link>
              </li>
              <li>
                <Link to="/my-nfts" className="transition-colors hover:text-foreground">
                  List Your NFT
                </Link>
              </li>
              <li>
                <Link to="/profile" className="transition-colors hover:text-foreground">
                  Manage Collections
                </Link>
              </li>
              <li>
                <Link to="/explore" search={{ category: "art" }} className="transition-colors hover:text-foreground">
                  Browse by Category
                </Link>
              </li>
            </ul>
          </div>

          {/* Network & Account Column */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
              Account &amp; Chains
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/profile" className="transition-colors hover:text-foreground">
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/my-nfts" className="transition-colors hover:text-foreground">
                  My Collected NFTs
                </Link>
              </li>
              <li>
                <Link to="/my-activity" className="transition-colors hover:text-foreground">
                  My Activity
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60 pt-6 text-[11px] text-muted-foreground">
          <p>© {new Date().getFullYear()} Zenkaihood. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              Built on <b className="text-foreground">EVM Layer-2</b>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
