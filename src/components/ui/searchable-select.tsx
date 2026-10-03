import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  id?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  emptyMessage = "Aucun résultat.",
  className,
  triggerClassName,
  disabled = false,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  // Ref sur l'input natif — on le contrôle directement pour éviter
  // tout re-render qui fermerait le clavier sur iOS
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Remettre le focus sur l'input après chaque re-render quand le popover est ouvert
  // Ceci est le correctif principal pour iOS : le clavier ne se ferme plus
  React.useEffect(() => {
    if (open) {
      // Délai micro pour laisser le Popover finir son animation d'ouverture
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setSearch("");
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description || "").toLowerCase().includes(q)
    );
  }, [options, search]);

  const selectedLabel = React.useMemo(
    () => options.find((o) => o.value === value)?.label || "",
    [options, value]
  );

  const handleSelect = (optValue: string) => {
    onValueChange(optValue === value ? "" : optValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] p-0", className)}
        align="start"
        // Ne pas voler le focus au clic (laisse l'input le garder)
        onOpenAutoFocus={(e) => e.preventDefault()}
        // Ne pas fermer si l'interaction vient du clavier virtuel iOS
        onInteractOutside={(e) => {
          const t = e.target as Node;
          // Laisser fermer seulement si le clic est hors du popover ET hors du trigger
          if (inputRef.current?.contains(t)) e.preventDefault();
        }}
      >
        {/* Input natif — pas de cmdk CommandInput qui perd le focus sur iOS */}
        <div className="flex items-center border-b px-3 gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            // iOS : empêche le zoom auto et le reset du clavier
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); inputRef.current?.focus(); }}
              className="text-muted-foreground hover:text-foreground text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Liste des résultats */}
        <div
          className="overflow-y-auto overscroll-contain"
          style={{
            maxHeight: "min(52vh, 280px)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  value === option.value && "bg-accent/60 font-medium"
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100 text-primary" : "opacity-0"
                  )}
                />
                <span className="flex-1 truncate">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-muted-foreground truncate">
                    {option.description}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
