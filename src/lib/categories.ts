import {
  Palette,
  Crown,
  Gamepad2,
  Camera,
  ShieldCheck,
  Music,
  Boxes,
  Globe2,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface CategoryOption {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}

export const MAX_COLLECTION_CATEGORIES = 4;

export const COLLECTION_CATEGORIES: readonly CategoryOption[] = [
  {
    id: "art",
    label: "Art",
    desc: "Digital illustrations, generative & fine art",
    icon: Palette,
  },
  {
    id: "pfps",
    label: "PFPs",
    desc: "Profile picture collections & character avatars",
    icon: Crown,
  },
  {
    id: "gaming",
    label: "Gaming",
    desc: "In-game characters, weapons, items, and passes",
    icon: Gamepad2,
  },
  {
    id: "photography",
    label: "Photography",
    desc: "Exclusive visual captures & fine art photography",
    icon: Camera,
  },
  {
    id: "memberships",
    label: "Memberships",
    desc: "Community passes & token-gated access",
    icon: ShieldCheck,
  },
  {
    id: "music",
    label: "Music",
    desc: "Audio releases, tracks & soundscapes",
    icon: Music,
  },
  {
    id: "collectibles",
    label: "Collectibles",
    desc: "Curated digital collectibles & trading cards",
    icon: Boxes,
  },
  {
    id: "virtual",
    label: "Virtual Worlds",
    desc: "Metaverse parcels, environments & 3D assets",
    icon: Globe2,
  },
  {
    id: "sports",
    label: "Sports",
    desc: "Digital sports memorabilia & fan passes",
    icon: Trophy,
  },
  {
    id: "utility",
    label: "Utility",
    desc: "Domain names, tickets & functional tokens",
    icon: Wrench,
  },
] as const;

export function getCategoryById(id: string): CategoryOption | undefined {
  const norm = id.trim().toLowerCase();
  return COLLECTION_CATEGORIES.find((cat) => cat.id.toLowerCase() === norm);
}

export function formatCategoryLabel(id: string): string {
  const match = getCategoryById(id);
  if (match) return match.label;
  return id.charAt(0).toUpperCase() + id.slice(1);
}
