-- Corrige la fonction: remplace NEW.nom (inexistant dans articles) par NEW.designation
-- et évite l'accès à OLD sur INSERT
CREATE OR REPLACE FUNCTION public.create_stock_alert_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_type TEXT;
  v_severity TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Déterminer le type/severité selon le niveau de stock
  IF NEW.stock <= 2 THEN
    v_notification_type := 'critical_stock';
    v_severity := 'critical';
    v_title := 'Stock Critique';
    v_message := format('Article "%s" (Réf: %s) a un stock critique de %s unités',
                        NEW.designation, NEW.reference, NEW.stock);
  ELSIF NEW.stock <= 5 THEN
    v_notification_type := 'low_stock';
    v_severity := 'warning';
    v_title := 'Stock Faible';
    v_message := format('Article "%s" (Réf: %s) a un stock faible de %s unités',
                        NEW.designation, NEW.reference, NEW.stock);
  ELSE
    -- au-dessus des seuils -> pas de notification
    RETURN NEW;
  END IF;

  -- Créer la notification à l'insertion ou quand le stock diminue
  IF TG_OP = 'INSERT' OR (OLD.stock IS NULL OR OLD.stock > NEW.stock) THEN
    INSERT INTO public.notifications (
      type,
      severity,
      title,
      message,
      related_id,
      related_table,
      created_by
    ) VALUES (
      v_notification_type,
      v_severity,
      v_title,
      v_message,
      NEW.id,
      'articles',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$function$;