-- Dashboard performance aggregation functions
CREATE OR REPLACE FUNCTION public.get_dashboard_aggregates()
RETURNS TABLE(
  total_stock BIGINT,
  total_value NUMERIC,
  low_stock_count INTEGER,
  critical_stock_count INTEGER,
  recent_movements_count INTEGER,
  previous_movements_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(a.stock), 0) AS total_stock,
    COALESCE(SUM(a.stock * a.prix_achat), 0)::numeric AS total_value,
    COALESCE(SUM(CASE WHEN a.stock > 0 AND a.stock <= a.stock_min THEN 1 ELSE 0 END), 0) AS low_stock_count,
    COALESCE(SUM(CASE WHEN a.stock <= 2 THEN 1 ELSE 0 END), 0) AS critical_stock_count,
    (SELECT COUNT(*) FROM public.stock_movements sm WHERE sm.created_at >= (now() - interval '7 days')) AS recent_movements_count,
    (SELECT COUNT(*) FROM public.stock_movements sm WHERE sm.created_at >= (now() - interval '14 days') AND sm.created_at < (now() - interval '7 days')) AS previous_movements_count
  FROM public.articles a;
END;
$$;

-- Distribution counts for stock categories
CREATE OR REPLACE FUNCTION public.get_stock_distribution_counts()
RETURNS TABLE(
  excellent INTEGER,
  bon INTEGER,
  faible INTEGER,
  rupture INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN stock > stock_min * 2 THEN 1 ELSE 0 END), 0) AS excellent,
    COALESCE(SUM(CASE WHEN stock > stock_min AND stock <= stock_min * 2 THEN 1 ELSE 0 END), 0) AS bon,
    COALESCE(SUM(CASE WHEN stock > 0 AND stock <= stock_min THEN 1 ELSE 0 END), 0) AS faible,
    COALESCE(SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END), 0) AS rupture
  FROM public.articles;
END;
$$;