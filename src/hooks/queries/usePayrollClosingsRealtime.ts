import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/contexts/TeamContext';
import { logger } from '@/utils/logger';
import { payrollKeys } from './usePayrollQuery';
import { monthlyPayrollKeys } from './useMonthlyPayrollQuery';
import { personnelHistoryKeys } from './usePersonnelHistoryQuery';
import { invalidateCache } from '@/components/payroll/eventStatusCache';

export const usePayrollClosingsRealtime = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();

  useEffect(() => {
    if (!activeTeam?.id) return;

    logger.realtime.connected();

    const channel = supabase
      .channel('payroll-closings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payroll_closings',
          filter: `team_id=eq.${activeTeam.id}`,
        },
        async (payload) => {
          const newRow = payload.new as Record<string, unknown> | null;
          const oldRow = payload.old as Record<string, unknown> | null;

          const closingId = (newRow?.id as string | undefined) ?? (oldRow?.id as string | undefined);
          const eventId =
            (newRow?.event_id as string | undefined) ?? (oldRow?.event_id as string | undefined);
          const personnelId =
            (newRow?.personnel_id as string | undefined) ??
            (oldRow?.personnel_id as string | undefined);

          logger.realtime.change(payload.eventType, { id: closingId });

          invalidateCache();

          if (eventId) {
            queryClient.invalidateQueries({
              queryKey: payrollKeys.event(eventId),
              refetchType: 'active',
            });
            logger.cache.invalidate(`payroll:event:${eventId}`);
          }

          queryClient.invalidateQueries({
            queryKey: payrollKeys.all,
            refetchType: 'active',
          });

          queryClient.invalidateQueries({
            queryKey: monthlyPayrollKeys.all,
            refetchType: 'active',
          });

          if (personnelId) {
            queryClient.invalidateQueries({
              queryKey: personnelHistoryKeys.all(personnelId),
              refetchType: 'active',
            });
          } else {
            queryClient.invalidateQueries({
              queryKey: ['personnel-history'],
              refetchType: 'active',
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.realtime.info('SUBSCRIBED');
        } else if (status === 'CHANNEL_ERROR') {
          logger.realtime.error('CHANNEL_ERROR');
        } else if (status === 'TIMED_OUT') {
          logger.realtime.error('TIMED_OUT');
        }
      });

    return () => {
      logger.realtime.debug('UNSUBSCRIBE');
      supabase.removeChannel(channel);
    };
  }, [activeTeam?.id, queryClient]);
};

