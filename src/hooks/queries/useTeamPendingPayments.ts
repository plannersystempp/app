import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/contexts/TeamContext';
import { payrollDataService } from '@/services/payrollDataService';

export interface TeamPendingPaymentItem {
  personnelId: string;
  personnelName: string;
  eventId: string;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  pendingAmount: number;
  totalAmount: number;
  paidAmount: number;
}

export const useTeamPendingPayments = () => {
  const { activeTeam } = useTeam();

  // 1. Fetch team config for overtime rules (same as usePayrollQuery)
  const { data: teamConfig } = useQuery({
    queryKey: ['team-config', activeTeam?.id],
    queryFn: async () => {
      if (!activeTeam?.id) return null;
      
      const { data, error } = await supabase
        .from('teams')
        .select('default_overtime_threshold_hours, default_convert_overtime_to_daily')
        .eq('id', activeTeam.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeTeam?.id,
    staleTime: 5 * 60 * 1000, 
  });

  return useQuery({
    queryKey: ['team-pending-payments', activeTeam?.id, teamConfig?.default_convert_overtime_to_daily, teamConfig?.default_overtime_threshold_hours],
    queryFn: async (): Promise<TeamPendingPaymentItem[]> => {
      if (!activeTeam?.id) return [];

      const config = teamConfig ? {
        default_convert_overtime_to_daily: teamConfig.default_convert_overtime_to_daily,
        default_overtime_threshold_hours: teamConfig.default_overtime_threshold_hours
      } : undefined;

      return payrollDataService.getTeamPendingPayments(activeTeam.id, config);
    },
    enabled: !!activeTeam?.id
  });
};
