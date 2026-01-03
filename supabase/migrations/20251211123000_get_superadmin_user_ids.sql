-- Função RPC para listar user_ids de superadmins
CREATE OR REPLACE FUNCTION public.get_superadmin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_profiles WHERE role = 'superadmin';
$$;
