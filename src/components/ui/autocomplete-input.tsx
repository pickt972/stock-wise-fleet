import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
  maxSuggestions?: number;
  inputClassName?: string;
}

/**
 * Input avec suggestions au fur et à mesure de la saisie.
 * Évite les doublons en proposant les valeurs déjà existantes.
 */
export function AutocompleteInput({
  value,
  onValueChange,
  suggestions,
  maxSuggestions = 8,
  inputClassName,
  className,
  ...inputProps
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dé-doublonne (insensible à la casse) et filtre par préfixe/contenu
  const filtered = (() => {
    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      if (!s) return false;
      const k = s.trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const q = value.trim().toLowerCase();
    const match = q
      ? unique.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      : unique;
    return match.slice(0, maxSuggestions);
  })();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (s: string) => {
    onValueChange(s);
    setOpen(false);
    setHighlight(-1);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        {...inputProps}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || filtered.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % filtered.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h <= 0 ? filtered.length - 1 : h - 1));
          } else if (e.key === "Enter" && highlight >= 0) {
            e.preventDefault();
            select(filtered[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={inputClassName}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filtered.map((s, i) => (
            <li
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                select(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
