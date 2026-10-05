import type { SVGProps } from "react";
import { cn } from "@/lib/utils";
import { getChainName, getChainShortName, robinhoodTestnet } from "@/lib/chains";
import robinhoodIconSrc from "@/assets/robinhood-icon.webp";

// Re-exported so chains.ts and the wallet modal can use the real image URL
export const ROBINHOOD_ICON_DATA_URL: string = robinhoodIconSrc;

/**
 * Base Chain Official Icon (Blue circle with white stylized cutout)
 */
export function BaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="16" cy="16" r="16" fill="#0052FF" />
      <path
        d="M16 6.5C10.7533 6.5 6.5 10.7533 6.5 16C6.5 21.2467 10.7533 25.5 16 25.5C21.0567 25.5 25.1867 21.56 25.4867 16.58H16.88V15.42H25.4867C25.1867 10.44 21.0567 6.5 16 6.5Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Robinhood Chain Official Icon — uses the real brand asset.
 * Accepts a className for sizing (treated as img class).
 */
export function RobinhoodIcon({ className }: { className?: string }) {
  return (
    <img
      src={robinhoodIconSrc}
      alt="Robinhood Testnet"
      className={cn("object-contain", className)}
      loading="eager"
    />
  );
}

export const BASE_ICON_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Ccircle cx='16' cy='16' r='16' fill='%230052FF'/%3E%3Cpath d='M16 6.5C10.7533 6.5 6.5 10.7533 6.5 16C6.5 21.2467 10.7533 25.5 16 25.5C21.0567 25.5 25.1867 21.56 25.4867 16.58H16.88V15.42H25.4867C25.1867 10.44 21.0567 6.5 16 6.5Z' fill='white'/%3E%3C/svg%3E";

/**
 * Render the appropriate chain icon for a given chainId.
 */
export function ChainIcon({
  chainId,
  className = "size-4",
}: {
  chainId?: number | null;
  className?: string;
}) {
  if (chainId === robinhoodTestnet.id) {
    return <RobinhoodIcon className={className} />;
  }
  return <BaseIcon className={className} />;
}

/**
 * Reusable visual badge to display chain / network differentiation.
 */
export function ChainBadge({
  chainId,
  size = "sm",
  short = false,
  className,
}: {
  chainId?: number | null;
  size?: "xs" | "sm" | "md";
  short?: boolean;
  className?: string;
}) {
  const isRobinhood = chainId === robinhoodTestnet.id;
  const name = short ? getChainShortName(chainId) : getChainName(chainId);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium tracking-tight shadow-sm backdrop-blur-md transition-all",
        size === "xs" && "px-1.5 py-0.5 text-[9px]",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        isRobinhood
          ? "border border-emerald-500/30 bg-black/80 text-emerald-400 dark:bg-emerald-950/40"
          : "border border-blue-500/30 bg-blue-950/80 text-blue-300 dark:bg-blue-950/50",
        className
      )}
    >
      <ChainIcon chainId={chainId} className={cn(size === "xs" ? "size-3" : size === "sm" ? "size-3.5" : "size-4")} />
      <span>{name}</span>
    </span>
  );
}
