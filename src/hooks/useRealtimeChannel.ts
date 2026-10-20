import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createPostgresChannel, type RealtimeTable } from "./realtimeSubscription";

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

/**
 * S'abonne aux changements Postgres d'une ou plusieurs tables et appelle
 * onChange (débouncé) à chaque événement. La souscription est nettoyée
 * au démontage du composant (supabase.removeChannel).
 *
 * Retourne l'état réel de la connexion Realtime :
 * "connected" (SUBSCRIBED), "connecting" ou "disconnected".
 */
export function useRealtimeChannel(
  name: string,
  tables: RealtimeTable[],
  onChange: () => void,
  debounceMs = 500,
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const tablesKey = tables.join(",");
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  useEffect(() => {
    let active = true;
    setStatus("connecting");
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (!active) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), debounceMs);
    };

    const channel = createPostgresChannel(supabase, name, tablesRef.current, schedule);

    channel.subscribe((s) => {
      if (!active) return;
      if (s === "SUBSCRIBED") setStatus("connected");
      else if (s === "CLOSED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT")
        setStatus("disconnected");
      else setStatus("connecting");
    });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, tablesKey, debounceMs]);

  return status;
}
