ALTER POLICY "Admins da equipe podem deletar fechamentos"
ON public.payroll_closings
USING (
  get_user_role_in_team(team_id) = 'admin'
  OR is_super_admin()
);

ALTER POLICY "Admins can delete personnel payments"
ON public.personnel_payments
USING (
  get_user_role_in_team(team_id) = 'admin'
  OR is_super_admin()
);
