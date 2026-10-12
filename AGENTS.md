# Architecture rules

- Operation lists and details share UserAttribution and userDisplayName so missing creators and alternate user relationships resolve consistently without extra requests.

- Category drag gestures use stable draggable rows with non-overlapping drop zones and shared pure hierarchy validation; desktop drops and mobile arrow moves share existing persistence RPCs to avoid divergent ordering behavior.
- Category movement rules are tested with Bun's test runner next to their implementation so hierarchy and hit-zone constraints can be checked without altering live inventory.- Inventory workflow writes (open, count, close, abandon) go through SECURITY DEFINER RPCs that check staff role and maintenance mode, so stock adjustments and audit entries stay atomic and consistent.
