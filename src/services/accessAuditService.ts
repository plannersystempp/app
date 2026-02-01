import { supabase } from '@/integrations/supabase/client';

export const logUnauthorizedRouteAttempt = async (input: {
  userId: string;
  teamId: string | null;
  path: string;
  pageLabel: string;
  userRole: string | null;
}) => {
  const { userId, teamId, path, pageLabel, userRole } = input;

  try {
    await supabase.from('audit_logs').insert({
      action: 'UNAUTHORIZED_ROUTE_ACCESS',
      table_name: 'routes',
      record_id: path,
      user_id: userId,
      team_id: teamId,
      new_values: {
        pageLabel,
        path,
        userRole,
      },
    });
  } catch (error) {
    console.error('[audit] Falha ao registrar acesso não autorizado:', error);
  }
};

