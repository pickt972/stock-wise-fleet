import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

export type RealtimeTable = keyof Database["public"]["Tables"];

let subscriptionId = 0;

/** Register all listeners on a fresh channel before any subscribe() call. */
export function createPostgresChannel(
  client: { channel: (name: string) => RealtimeChannel },
  name: string,
  tables: readonly RealtimeTable[],
  onChange: (payload: unknown) => void,
): RealtimeChannel {
  const channel = client.channel(`${name}:${++subscriptionId}`);
  for (const table of new Set(tables)) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  return channel;
}