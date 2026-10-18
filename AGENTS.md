# Architecture rules

- Stock entry headers and items are saved through an invoker RPC; order receptions use an invoker API wrapper around a private, staff/maintenance-checked transaction so articles, received quantities, stock triggers and order status succeed or roll back together.
- Entry statistics are queried independently of list filters so period counts and total value remain accurate after refresh.
- Simple entry price parsing stays in a pure helper with Bun tests so optional prices and invalid input are handled before any stock write.

- Operation lists and details share UserAttribution and userDisplayName so missing creators and alternate user relationships resolve consistently without extra requests.

- Category drag gestures use stable draggable rows with non-overlapping drop zones and shared pure hierarchy validation; desktop drops and mobile arrow moves share existing persistence RPCs to avoid divergent ordering behavior.
- Category movement rules are tested with Bun's test runner next to their implementation so hierarchy and hit-zone constraints can be checked without altering live inventory.- Inventory workflow writes (open, count, close, abandon) go through SECURITY DEFINER RPCs that check staff role and maintenance mode, so stock adjustments and audit entries stay atomic and consistent.
