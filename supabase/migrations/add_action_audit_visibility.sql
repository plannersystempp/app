-- Rastreabilidade de ações (visibilidade para equipe)

CREATE OR REPLACE FUNCTION public.work_records_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.logged_by_id IS NULL THEN
      NEW.logged_by_id := auth.uid();
    END IF;
    IF NEW.date_logged IS NULL THEN
      NEW.date_logged := now();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (
      NEW.attendance_status IS DISTINCT FROM OLD.attendance_status OR
      NEW.check_in_time IS DISTINCT FROM OLD.check_in_time OR
      NEW.check_out_time IS DISTINCT FROM OLD.check_out_time OR
      NEW.hours_worked IS DISTINCT FROM OLD.hours_worked OR
      NEW.overtime_hours IS DISTINCT FROM OLD.overtime_hours OR
      NEW.notes IS DISTINCT FROM OLD.notes
    ) THEN
      NEW.logged_by_id := auth.uid();
      NEW.date_logged := now();
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_records_set_defaults_trg ON public.work_records;
CREATE TRIGGER work_records_set_defaults_trg
BEFORE INSERT OR UPDATE ON public.work_records
FOR EACH ROW
EXECUTE FUNCTION public.work_records_set_defaults();

CREATE OR REPLACE FUNCTION public.freelancer_ratings_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.rated_by_id IS NULL THEN
    NEW.rated_by_id := auth.uid();
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS freelancer_ratings_set_defaults_trg ON public.freelancer_ratings;
CREATE TRIGGER freelancer_ratings_set_defaults_trg
BEFORE INSERT ON public.freelancer_ratings
FOR EACH ROW
EXECUTE FUNCTION public.freelancer_ratings_set_defaults();

CREATE OR REPLACE VIEW public.freelancer_ratings_enriched AS
SELECT
  fr.id,
  fr.team_id,
  fr.event_id,
  fr.freelancer_id,
  fr.rating,
  fr.rated_by_id,
  fr.created_at,
  up.name AS rated_by_name
FROM public.freelancer_ratings fr
LEFT JOIN public.user_profiles up
  ON up.user_id = fr.rated_by_id;

GRANT SELECT ON public.freelancer_ratings_enriched TO authenticated;
