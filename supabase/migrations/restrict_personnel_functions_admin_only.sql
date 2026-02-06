DROP POLICY IF EXISTS "Team members can manage personnel functions" ON public.personnel_functions;

CREATE POLICY "Team members can view personnel functions"
ON public.personnel_functions
FOR SELECT
TO authenticated
USING (
  is_team_member(team_id)
  OR is_super_admin()
);

CREATE POLICY "Admins can insert personnel functions"
ON public.personnel_functions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR get_user_role_in_team(team_id) = 'admin'
);

CREATE POLICY "Admins can update personnel functions"
ON public.personnel_functions
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR get_user_role_in_team(team_id) = 'admin'
)
WITH CHECK (
  is_super_admin()
  OR get_user_role_in_team(team_id) = 'admin'
);

CREATE POLICY "Admins can delete personnel functions"
ON public.personnel_functions
FOR DELETE
TO authenticated
USING (
  is_super_admin()
  OR get_user_role_in_team(team_id) = 'admin'
);
