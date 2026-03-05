import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/contexts/TeamContext';
import { logger } from '@/utils/logger';
import { personnelPaymentsKeys } from './usePersonnelPaymentsQuery';
import { personnelHistoryKeys } from './usePersonnelHistoryQuery';

export const usePersonnelPaymentsRealtime = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();

  useEffect(() => {
    if (!activeTeam?.id) return;

    const channel = supabase
      .channel('personnel-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnel_payments',
          filter: `team_id=eq.${activeTeam.id}`,
        },
        (payload) => {
          logger.realtime.change(payload.eventType as any, { id: (payload.new as any)?.id });
          const nextPersonnelId =
            (payload.new as { personnel_id?: string } | null)?.personnel_id ??
            (payload.old as { personnel_id?: string } | null)?.personnel_id;

          // ⚡ Invalidar queries em vez de setQueryData
          logger.cache.invalidate('personnelPaymentsKeys.all');

          queryClient.invalidateQueries({
            queryKey: personnelPaymentsKeys.all,
            refetchType: 'active'
          });

          if (nextPersonnelId) {
            queryClient.invalidateQueries({
              queryKey: personnelHistoryKeys.all(nextPersonnelId),
              refetchType: 'active'
            });
          }

          // ✅ TAREFA 2: Also invalidate team-pending-payments so PendingPaymentsDashboard syncs
          queryClient.invalidateQueries({
            queryKey: ['team-pending-payments'],
            refetchType: 'active'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeam?.id, queryClient]);
};
