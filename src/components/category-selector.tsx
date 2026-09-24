import { Check, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_COLLECTION_CATEGORIES,
  getCategoryById,
} from "@/lib/categories";
import { useCategories } from "@/hooks/useCategories";
import { Badge } from "@/components/ui/badge";

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  max?: number;
  className?: string;
  disabled?: boolean;
}

export function CategorySelector({
  selectedCategories,
  onChange,
  max = MAX_COLLECTION_CATEGORIES,
  className,
  disabled = false,
}: CategorySelectorProps) {
  const { data: categories = [] } = useCategories();
  const isMaxReached = selectedCategories.length >= max;

  const toggleCategory = (id: string) => {
    if (disabled) return;
    const exists = selectedCategories.includes(id);
    if (exists) {
      onChange(selectedCategories.filter((catId) => catId !== id));
    } else {
      if (selectedCategories.length < max) {
        onChange([...selectedCategories, id]);
      }
    }
  };

  const removeCategory = (id: string) => {
    if (disabled) return;
    onChange(selectedCategories.filter((catId) => catId !== id));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </label>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
              selectedCategories.length > 0
                ? isMaxReached
                  ? "bg-amber-500/15 text-amber-500"
                  : "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {selectedCategories.length} / {max} selected
          </span>
        </div>

        {selectedCategories.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected Tags Preview */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <span className="text-[11px] text-muted-foreground mr-1">Active:</span>
          {selectedCategories.map((catId) => {
            const cat = getCategoryById(catId);
            const Icon = cat?.icon;
            return (
              <Badge
                key={catId}
                variant="secondary"
                className="gap-1.5 py-1 pl-2 pr-1.5 text-xs font-medium bg-background border border-border text-foreground hover:bg-muted/80 shadow-xs"
              >
                {Icon && <Icon className="size-3 text-primary" />}
                <span>{cat?.label ?? catId}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCategory(catId);
                    }}
                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${cat?.label ?? catId}`}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Category Pills Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {categories.map((cat) => {
          const isSelected = selectedCategories.includes(cat.id);
          const Icon = cat.icon;
          const isDisabled = !isSelected && isMaxReached;

          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled || isDisabled}
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "group relative flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                  : isDisabled
                    ? "cursor-not-allowed border-border/40 bg-muted/20 text-muted-foreground/50 opacity-60"
                    : "border-border bg-card/60 text-muted-foreground hover:border-primary/50 hover:bg-card hover:text-foreground"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div
                  className={cn(
                    "grid size-7 place-content-center rounded-lg transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                </div>
                {isSelected ? (
                  <span className="grid size-4 place-content-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="size-3.5 rounded-full border border-border group-hover:border-primary/50" />
                )}
              </div>

              <div className="mt-2.5 min-w-0">
                <p className="text-xs font-semibold leading-none truncate text-foreground">
                  {cat.label}
                </p>
                <p className="mt-1 text-[10px] leading-tight text-muted-foreground line-clamp-1">
                  {cat.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {isMaxReached && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-500/90 font-medium">
          <Info className="size-3.5 shrink-0" />
          You've reached the maximum limit of {max} categories for this collection.
        </p>
      )}
    </div>
  );
}
