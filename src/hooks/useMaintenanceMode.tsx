import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceState {
  active: boolean;
  message: string;
}

const DEFAULT_STATE: MaintenanceState = { active: false, message: "" };

function parseValue(value: unknown): MaintenanceState {
  if (!value || typeof value !== "object") return DEFAULT_STATE;
  const v = value as Record<string, unknown>;
  return {
    active: v.active === true,
    message: typeof v.message === "string" ? v.message : "",
  };
}

/**
 * Lit le drapeau de maintenance (app_settings.key = 'maintenance') et s'abonne
 * aux changements via Supabase Realtime pour un blocage immédiat sans refresh.
 */
export function useMaintenanceMode() {
  const [state, setState] = useState<MaintenanceState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const fetchState = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("app_settings")
      .select("value")
      .eq("key", "maintenance")
      .maybeSingle();

    if (!error && data) setState(parseValue(data.value));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchState();

    const channel = supabase
      .channel("app_settings_maintenance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          const row = payload.new as { key?: string; value?: unknown } | null;
          if (row?.key === "maintenance") {
            setState(parseValue(row.value));
          } else {
            fetchState();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchState]);

  const setMaintenance = useCallback(
    async (active: boolean, message: string) => {
      const { error } = await (supabase as any)
        .from("app_settings")
        .update({ value: { active, message }, updated_at: new Date().toISOString() })
        .eq("key", "maintenance");
      if (error) throw error;
      setState({ active, message });
    },
    []
  );

  return { ...state, isLoading, refresh: fetchState, setMaintenance };
}
