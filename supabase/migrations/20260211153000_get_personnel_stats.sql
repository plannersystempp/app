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
    -- Only join if we need to filter by function
    LEFT JOIN personnel_functions pf ON p.id = pf.personnel_id
    WHERE p.team_id = p_team_id
    AND (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
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

GRANT EXECUTE ON FUNCTION get_personnel_stats(UUID, TEXT, TEXT, UUID) TO authenticated;
