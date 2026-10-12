ALTER TABLE public.stock_entries ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.stock_exits ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Regression assertions: new entry/exit creators default to the authenticated user.
DO $$
DECLARE target text; creator_default text;
BEGIN
  FOREACH target IN ARRAY ARRAY['stock_entries', 'stock_exits', 'stock_movements'] LOOP
    SELECT pg_get_expr(d.adbin, d.adrelid) INTO creator_default
    FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    WHERE d.adrelid = format('public.%I', target)::regclass AND a.attname = 'created_by';
    IF creator_default IS DISTINCT FROM 'auth.uid()' THEN
      RAISE EXCEPTION 'Creator attribution regression on %: %', target, creator_default;
    END IF;
  END LOOP;
END $$;