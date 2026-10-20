# Architecture rules

- Article table ordering uses a pure, Bun-tested three-state sort helper after filtering; desktop tables and existing mobile/card views consume the same result without database writes.

- Stock entry headers and items are saved through an invoker RPC; order receptions use an invoker API wrapper around a private, staff/maintenance-checked transaction so articles, received quantities, stock triggers and order status succeed or roll back together.
- Entry statistics are queried independently of list filters so period counts and total value remain accurate after refresh.
- Simple entry price parsing stays in a pure helper with Bun tests so optional prices and invalid input are handled before any stock write.
- Quick creation in simple entries inserts an authenticated, RLS-protected zero-stock article and selects its returned row before the user validates the entry; draft completion stays in the existing private checked transaction. Only entry triggers add stock, preventing duplicate quantities.
- Simple entry funnel options, combined filtering and stock states use a pure Bun-tested helper so all search paths apply the same rules.

- Operation lists and details share UserAttribution and userDisplayName so missing creators and alternate user relationships resolve consistently without extra requests.

- Category drag gestures use stable draggable rows with non-overlapping drop zones and shared pure hierarchy validation; desktop drops and mobile arrow moves share existing persistence RPCs to avoid divergent ordering behavior.
- Category movement rules are tested with Bun's test runner next to their implementation so hierarchy and hit-zone constraints can be checked without altering live inventory.- Inventory workflow writes (open, count, close, abandon) go through SECURITY DEFINER RPCs that check staff role and maintenance mode, so stock adjustments and audit entries stay atomic and consistent.

- Realtime listeners use createPostgresChannel with schema-typed table names and a unique channel per subscription, registering callbacks before subscribe to avoid collisions between hook instances; useRealtimeChannel handles debounced refetch/status/cleanup, while maintenance keeps its payload handler. Tables must be in the supabase_realtime publication to receive events.
