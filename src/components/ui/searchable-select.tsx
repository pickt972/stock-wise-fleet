import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  const listRef = React.useRef<HTMLDivElement>(null);
  const touchYRef = React.useRef<number | null>(null);
  const [scrollState, setScrollState] = React.useState({ top: 0, height: 100, visible: false });

  const updateScrollIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const { scrollTop, scrollHeight, clientHeight } = list;
    const visible = scrollHeight > clientHeight + 1;
    const height = visible ? Math.max((clientHeight / scrollHeight) * 100, 18) : 100;
    const maxTop = 100 - height;
    const top = visible && scrollHeight > clientHeight
      ? Math.min((scrollTop / (scrollHeight - clientHeight)) * maxTop, maxTop)
      : 0;

    setScrollState({ top, height, visible });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(updateScrollIndicator);
    return () => cancelAnimationFrame(frame);
  }, [open, options.length, updateScrollIndicator]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;

    const resizeObserver = new ResizeObserver(updateScrollIndicator);
    resizeObserver.observe(list);
    if (list.firstElementChild) {
      resizeObserver.observe(list.firstElementChild);
    }

    return () => resizeObserver.disconnect();
  }, [open, updateScrollIndicator]);

  const handleTouchStart = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchYRef.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const list = listRef.current;
    const currentY = event.touches[0]?.clientY;
    if (!list || touchYRef.current === null || currentY === undefined) return;

    const canScroll = list.scrollHeight > list.clientHeight;
    if (!canScroll) return;

    list.scrollTop += touchYRef.current - currentY;
    touchYRef.current = currentY;
    updateScrollIndicator();
    event.preventDefault();
    event.stopPropagation();
  }, [updateScrollIndicator]);

  const handleTouchEnd = React.useCallback(() => {
    touchYRef.current = null;
  }, []);

  const selectedLabel = React.useMemo(() => {
    const option = options.find((opt) => opt.value === value);
    return option?.label || "";
  }, [options, value]);

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
          <span className="truncate">
            {value ? selectedLabel : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] p-0", className)}
        align="start"
        style={{ maxHeight: "var(--radix-popover-content-available-height)" }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <div className="relative">
            <CommandList
              ref={listRef}
              className="searchable-select-scroll max-h-none touch-pan-y overflow-y-auto overscroll-contain pr-3"
              onScroll={updateScrollIndicator}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              style={{
                maxHeight: "min(52vh, calc(var(--radix-popover-content-available-height) - 48px))",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value === value ? "" : option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                    {option.description && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {option.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {scrollState.visible && (
              <div className="pointer-events-none absolute right-1 top-2 bottom-2 w-1.5 rounded-full bg-border/70">
                <div
                  className="absolute left-0 w-full rounded-full bg-muted-foreground/60"
                  style={{ top: `${scrollState.top}%`, height: `${scrollState.height}%` }}
                />
              </div>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
