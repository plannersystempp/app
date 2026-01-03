DROP POLICY IF EXISTS "Only admins can view work records" ON public.work_records;
DROP POLICY IF EXISTS "team_access_policy" ON public.work_records;
CREATE POLICY "Admins and coordinators can view work records" ON public.work_records FOR SELECT USING (is_super_admin() OR get_user_role_in_team(team_id) IN ('admin','coordinator'));
CREATE POLICY "Admins and coordinators can insert work records" ON public.work_records FOR INSERT WITH CHECK (is_super_admin() OR get_user_role_in_team(team_id) IN ('admin','coordinator'));
CREATE POLICY "Admins and coordinators can update work records" ON public.work_records FOR UPDATE USING (is_super_admin() OR get_user_role_in_team(team_id) IN ('admin','coordinator')) WITH CHECK (is_super_admin() OR get_user_role_in_team(team_id) IN ('admin','coordinator'));
CREATE POLICY "Admins and coordinators can delete work records" ON public.work_records FOR DELETE USING (is_super_admin() OR get_user_role_in_team(team_id) IN ('admin','coordinator'));
UPDATE public.team_members SET role = 'coordinator' WHERE role = 'coordenador';