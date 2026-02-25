DROP POLICY IF EXISTS "Admins can insert personnel functions" ON public.personnel_functions;
DROP POLICY IF EXISTS "Admins can update personnel functions" ON public.personnel_functions;
DROP POLICY IF EXISTS "Admins can delete personnel functions" ON public.personnel_functions;

CREATE POLICY "Admins and coordinators can insert personnel functions"
ON public.personnel_functions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR get_user_role_in_team(team_id) IN ('admin', 'coordinator')
);

CREATE POLICY "Admins and coordinators can update personnel functions"
ON public.personnel_functions
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR get_user_role_in_team(team_id) IN ('admin', 'coordinator')
)
WITH CHECK (
  is_super_admin()
  OR get_user_role_in_team(team_id) IN ('admin', 'coordinator')
);

CREATE POLICY "Admins and coordinators can delete personnel functions"
ON public.personnel_functions
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR get_user_role_in_team(team_id) IN ('admin', 'coordinator')
);
