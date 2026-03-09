-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create immutable unaccent wrapper for indexing (optional but good practice)
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
  RETURNS text AS
$func$
SELECT public.unaccent('public.unaccent', $1)
$func$  LANGUAGE sql IMMUTABLE;

-- Create computed column function for PostgREST
-- This allows us to query "search_text" on the personnel table via the API
CREATE OR REPLACE FUNCTION search_text(personnel) RETURNS text AS $$
  SELECT immutable_unaccent($1.name) || ' ' || immutable_unaccent(COALESCE($1.email, ''));
$$ LANGUAGE sql IMMUTABLE;

-- Update get_personnel_stats to be accent insensitive
CREATE OR REPLACE FUNCTION get_personnel_stats(
  p_team_id UUID,
  p_search TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_function_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_count BIGINT,
  fixed_count BIGINT,
  freelancer_count BIGINT,
  avg_cache NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_personnel AS (
    SELECT DISTINCT p.id, p.type, p.event_cache
    FROM personnel p
    LEFT JOIN personnel_functions pf ON p.id = pf.personnel_id
    WHERE p.team_id = p_team_id
    AND (
      p_search IS NULL OR p_search = '' 
      OR immutable_unaccent(p.name) ILIKE '%' || immutable_unaccent(p_search) || '%' 
      OR immutable_unaccent(COALESCE(p.email, '')) ILIKE '%' || immutable_unaccent(p_search) || '%'
    )
    AND (p_type IS NULL OR p_type = 'all' OR p.type = p_type)
    AND (
      p_function_id IS NULL 
      OR pf.function_id = p_function_id
    )
  )
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE type = 'fixo')::BIGINT,
    COUNT(*) FILTER (WHERE type = 'freelancer')::BIGINT,
    COALESCE(AVG(event_cache), 0)::NUMERIC
  FROM filtered_personnel;
END;
$$;
