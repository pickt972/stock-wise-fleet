# Architecture rules

- Vehicle forms and displays use the pure Bun-tested vehicleFormatting helpers for SIV masking, validation and fleet labels; presentation normalization never rewrites existing records.

- Article table ordering uses a pure, Bun-tested three-state sort helper after filtering; desktop tables and existing mobile/card views consume the same result without database writes.

- Stock entry headers and items are saved through an invoker RPC; order receptions use an invoker API wrapper around a private, staff/maintenance-checked transaction so articles, received quantities, stock triggers and order status succeed or roll back together.
- Entry statistics are queried independently of list filters so period counts and total value remain accurate after refresh.
- Simple entry price parsing stays in a pure helper with Bun tests so optional prices and invalid input are handled before any stock write.
- Quick creation in simple entries inserts an authenticated, RLS-protected zero-stock article and selects its returned row before the user validates the entry; draft completion stays in the existing private checked transaction. Only entry triggers add stock, preventing duplicate quantities.
- Entries and exits share StockArticleSearch and QuickArticleFields, with pure Bun-tested funnel and stock-state helpers, so filtering, creation fields and result rendering stay consistent.
- Manual exits use a pure tested payload helper to store plate/brand/model in the existing exit notes column and force a null fleet ID without fleet lookup; this preserves traceability without adding external-schema columns.
- Simple entries and new exits share StockQuantitySelector with pure tested quantity rules; step controls respect availability while direct overstock input only warns, leaving database stock safeguards unchanged.

- Operation lists and details share UserAttribution and userDisplayName so missing creators and alternate user relationships resolve consistently without extra requests.

- Category drag gestures use stable draggable rows with non-overlapping drop zones and shared pure hierarchy validation; desktop drops and mobile arrow moves share existing persistence RPCs to avoid divergent ordering behavior.
- Category movement rules are tested with Bun's test runner next to their implementation so hierarchy and hit-zone constraints can be checked without altering live inventory.- Inventory workflow writes (open, count, close, abandon) go through SECURITY DEFINER RPCs that check staff role and maintenance mode, so stock adjustments and audit entries stay atomic and consistent.

- Realtime listeners use createPostgresChannel with schema-typed table names and a unique channel per subscription, registering callbacks before subscribe to avoid collisions between hook instances; useRealtimeChannel handles debounced refetch/status/cleanup, while maintenance keeps its payload handler. Tables must be in the supabase_realtime publication to receive events.
