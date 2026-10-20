/// <reference types="node" />
import { describe, expect, test } from "bun:test";
import { RealtimeClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { createPostgresChannel } from "./realtimeSubscription";

describe("Realtime subscription isolation", () => {
  test("a second alerts listener cannot reuse an already subscribed channel", () => {
    const client = new RealtimeClient("ws://localhost:54321/realtime/v1", { params: { apikey: "test-only-not-a-real-key" } });
    const first = createPostgresChannel(client, "alerts-realtime", ["articles"], () => {});
    first.state = "joining";
    // Reproduces the SDK error with the old shared topic.
    expect(() => first.on("postgres_changes", { event: "*", schema: "public", table: "articles" }, () => {})).toThrow("cannot add");
    const second = createPostgresChannel(client, "alerts-realtime", ["articles"], () => {});
    expect(second).not.toBe(first);
    expect(second.topic).not.toBe(first.topic);
  });

  test("maintenance subscriptions are independent too", () => {
    const client = new RealtimeClient("ws://localhost:54321/realtime/v1", { params: { apikey: "test-only-not-a-real-key" } });
    const first = createPostgresChannel(client, "maintenance", ["app_settings"], () => {});
    first.state = "joining";
    const second = createPostgresChannel(client, "maintenance", ["app_settings"], () => {});
    expect(second).not.toBe(first);
  });
});

test("all application listeners use tables from the actual public schema, never legacy aliases", () => {
  const schemaText = readFileSync("src/integrations/supabase/types.ts", "utf8");
  const tableSection = schemaText.split("    Tables: {")[1]?.split("    Views:")[0] ?? "";
  const schemaTables = new Set([...tableSection.matchAll(/^      (\w+): \{/gm)].map(match => match[1]));
  const listenedTables: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { walk(path); continue; }
      if (!/\.tsx?$/.test(path) || path.includes(".test.")) continue;
      const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          const name = node.expression.getText(source);
          const tableArgument = name === "useRealtimeChannel" ? node.arguments[1]
            : name === "createPostgresChannel" ? node.arguments[2] : undefined;
          if (tableArgument && ts.isArrayLiteralExpression(tableArgument)) {
            for (const item of tableArgument.elements) {
              if (ts.isStringLiteral(item)) listenedTables.push(item.text);
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  };
  walk("src");
  expect(listenedTables.length).toBeGreaterThan(0);
  for (const table of listenedTables) {
    expect(schemaTables.has(table)).toBe(true);
    expect(["items", "orders", "order_items", "alerts", "stock_transfers"].includes(table)).toBe(false);
  }
  for (const table of ["articles", "stock_entries", "stock_exits", "stock_movements", "commandes", "commande_items"]) {
    expect(listenedTables).toContain(table);
  }
});