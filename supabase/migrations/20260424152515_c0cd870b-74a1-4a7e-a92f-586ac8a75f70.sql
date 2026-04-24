-- Fonction atomique pour réordonner les catégories d'un même parent
-- Garantit l'unicité et la séquentialité des sort_order via une seule transaction
CREATE OR REPLACE FUNCTION public.reorder_categories(
  _parent_id uuid,
  _ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
BEGIN
  -- Vérifier que toutes les catégories ont bien le même parent (sécurité)
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = ANY(_ordered_ids)
      AND COALESCE(parent_id::text, '') <> COALESCE(_parent_id::text, '')
  ) THEN
    RAISE EXCEPTION 'Toutes les catégories doivent avoir le même parent';
  END IF;

  -- Vérifier le compte (anti-doublon dans le tableau)
  IF (SELECT COUNT(DISTINCT x) FROM unnest(_ordered_ids) AS x) <> array_length(_ordered_ids, 1) THEN
    RAISE EXCEPTION 'Doublons détectés dans la liste ordonnée';
  END IF;

  -- Étape 1 : décaler temporairement (évite collisions sur d'éventuels uniques futurs)
  FOR i IN 1 .. array_length(_ordered_ids, 1) LOOP
    UPDATE public.categories
       SET sort_order = -1 * i,
           updated_at = now()
     WHERE id = _ordered_ids[i];
  END LOOP;

  -- Étape 2 : appliquer les valeurs finales 0..N-1
  FOR i IN 1 .. array_length(_ordered_ids, 1) LOOP
    UPDATE public.categories
       SET sort_order = i - 1,
           updated_at = now()
     WHERE id = _ordered_ids[i];
  END LOOP;
END;
$$;

-- Fonction pour déplacer une catégorie sous un nouveau parent
-- Vérifie qu'on ne crée pas de cycle (parent ne peut pas devenir descendant)
CREATE OR REPLACE FUNCTION public.move_category(
  _category_id uuid,
  _new_parent_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cursor uuid;
  v_max_order integer;
BEGIN
  IF _category_id = _new_parent_id THEN
    RAISE EXCEPTION 'Une catégorie ne peut pas être son propre parent';
  END IF;

  -- Anti-cycle : le nouveau parent ne doit pas être un descendant de la catégorie déplacée
  IF _new_parent_id IS NOT NULL THEN
    v_cursor := _new_parent_id;
    WHILE v_cursor IS NOT NULL LOOP
      IF v_cursor = _category_id THEN
        RAISE EXCEPTION 'Cycle détecté : impossible d''imbriquer une catégorie sous l''un de ses descendants';
      END IF;
      SELECT parent_id INTO v_cursor FROM public.categories WHERE id = v_cursor;
    END LOOP;
  END IF;

  -- Calculer le sort_order = fin de la liste du nouveau parent
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_max_order
  FROM public.categories
  WHERE COALESCE(parent_id::text, '') = COALESCE(_new_parent_id::text, '');

  UPDATE public.categories
     SET parent_id = _new_parent_id,
         sort_order = v_max_order,
         updated_at = now()
   WHERE id = _category_id;
END;
$$;

-- Normaliser les sort_order existants (élimine doublons/trous actuels)
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(parent_id::text, '__root__')
           ORDER BY sort_order, nom
         ) - 1 AS new_order
  FROM public.categories
)
UPDATE public.categories c
   SET sort_order = n.new_order
  FROM numbered n
 WHERE c.id = n.id
   AND c.sort_order <> n.new_order;