CREATE OR REPLACE FUNCTION get_personnel_with_functions_v2(p_team_id UUID)
RETURNS TABLE (
  id UUID,
  team_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  phone_secondary TEXT,
  type TEXT,
  cpf TEXT,
  cnpj TEXT,
  rg TEXT,
  birth_date DATE,
  mothers_name TEXT,
  monthly_salary NUMERIC,
  event_cache NUMERIC,
  overtime_rate NUMERIC,
  photo_url TEXT,
  shirt_size TEXT,
  address_zip_code TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  pix_key_encrypted TEXT,
  created_at TIMESTAMPTZ,
  functions JSONB,
  primary_function_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.team_id,
    p.name,
    p.email,
    p.phone,
    p.phone_secondary,
    p.type,
    p.cpf,
    p.cnpj,
    p.rg,
    p.birth_date,
    p.mothers_name,
    p.monthly_salary,
    p.event_cache,
    p.overtime_rate,
    p.photo_url,
    p.shirt_size,
    p.address_zip_code,
    p.address_street,
    p.address_number,
    p.address_complement,
    p.address_neighborhood,
    p.address_city,
    p.address_state,
    p.pix_key_encrypted,
    p.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'description', f.description,
          'custom_cache', pf.custom_cache,
          'custom_overtime', pf.custom_overtime
        )
        ORDER BY
          CASE WHEN pf.is_primary THEN 0 ELSE 1 END,
          f.name
      ) FILTER (WHERE f.id IS NOT NULL),
      '[]'::jsonb
    ) as functions,
    (
      SELECT pf2.function_id
      FROM personnel_functions pf2
      WHERE pf2.personnel_id = p.id AND pf2.is_primary = true
      LIMIT 1
    ) as primary_function_id
  FROM personnel p
  LEFT JOIN personnel_functions pf ON pf.personnel_id = p.id AND pf.team_id = p_team_id
  LEFT JOIN functions f ON f.id = pf.function_id
  WHERE p.team_id = p_team_id
  GROUP BY
    p.id,
    p.team_id,
    p.name,
    p.email,
    p.phone,
    p.phone_secondary,
    p.type,
    p.cpf,
    p.cnpj,
    p.rg,
    p.birth_date,
    p.mothers_name,
    p.monthly_salary,
    p.event_cache,
    p.overtime_rate,
    p.photo_url,
    p.shirt_size,
    p.address_zip_code,
    p.address_street,
    p.address_number,
    p.address_complement,
    p.address_neighborhood,
    p.address_city,
    p.address_state,
    p.pix_key_encrypted,
    p.created_at
  ORDER BY p.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_personnel_with_functions_v2(UUID) TO authenticated;
