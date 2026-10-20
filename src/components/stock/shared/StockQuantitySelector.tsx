import { forwardRef, useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stockQuantityState, stepStockQuantity } from "@/lib/stockQuantity";

interface Props {
  id: string;
  value: number;
  onChange: (value: number) => void;
  available?: number;
  disabled?: boolean;
  onEnter?: () => void;
}

export const StockQuantitySelector = forwardRef<HTMLInputElement, Props>(
  ({ id, value, onChange, available, disabled = false, onEnter }, ref) => {
    const [draft, setDraft] = useState(String(value));
    useEffect(() => setDraft(String(value)), [value]);
    const state = stockQuantityState(value, available);
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-12 w-12" aria-label="Diminuer la quantité" disabled={disabled || state.decreaseDisabled} onClick={() => onChange(stepStockQuantity(value, -1, available))}>
            <Minus className="h-5 w-5" />
          </Button>
          <Input id={id} ref={ref} type="text" inputMode="numeric" pattern="[0-9]*" value={draft} disabled={disabled}
            className="h-12 min-w-0 text-center text-xl md:text-xl font-bold tabular-nums"
            aria-describedby={available !== undefined ? `${id}-stock` : undefined}
            onChange={(e) => {
              const text = e.target.value;
              if (!/^\d*$/.test(text)) return;
              setDraft(text);
              if (text && Number.isSafeInteger(Number(text))) onChange(Math.max(1, Number(text)));
            }}
            onBlur={() => { const next = Math.max(1, Number(draft) || 1); setDraft(String(next)); onChange(next); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter?.(); } }} />
          <Button type="button" variant="outline" size="icon" className="h-12 w-12" aria-label="Augmenter la quantité" disabled={disabled || state.increaseDisabled} onClick={() => onChange(stepStockQuantity(value, 1, available))}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        {available !== undefined && <p id={`${id}-stock`} className="text-xs text-muted-foreground text-center">Stock disponible : {available}</p>}
        {state.exceedsStock && <p role="status" className="text-sm text-warning">⚠️ Quantité supérieure au stock disponible ({available})</p>}
      </div>
    );
  },
);
StockQuantitySelector.displayName = "StockQuantitySelector";