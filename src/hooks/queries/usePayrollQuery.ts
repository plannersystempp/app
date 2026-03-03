import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { useMemo } from 'react';
import { payrollDataService } from '@/services/payrollDataService';
import type { PayrollDetails } from '@/components/payroll/types';

export const payrollKeys = {
  all: ['payroll'] as const,
  event: (eventId: string) => ['payroll', 'event', eventId] as const,
};

/**
 * Hook otimizado para buscar dados de folha de pagamento com cache inteligente
 * Centraliza a lógica de cálculo via payrollDataService para garantir SSOT.
 */
export const usePayrollQuery = (eventId: string) => {
  const { personnel, divisions } = useEnhancedData();
  const { activeTeam, userRole } = useTeam();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  // Buscar configuração de HE da equipe
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

  // Query principal: Busca e calcula dados de payroll via serviço centralizado
  const { data, isLoading, error } = useQuery({
    queryKey: [...payrollKeys.event(eventId), teamConfig?.default_convert_overtime_to_daily, teamConfig?.default_overtime_threshold_hours],
    queryFn: async () => {
      const config = teamConfig ? {
        default_convert_overtime_to_daily: teamConfig.default_convert_overtime_to_daily,
        default_overtime_threshold_hours: teamConfig.default_overtime_threshold_hours
      } : undefined;

      return payrollDataService.getEventPayroll(eventId, config, personnel, divisions);
    },
    enabled: !!eventId && !!personnel.length,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });


  const eventData = data?.rawData;
  const payrollDetails = data?.details || [];

  // Buscar PIX keys para admins
  const personnelIds = useMemo(() => {
    if (!eventData?.allocations) return [];
    return [...new Set(eventData.allocations.map(a => a.personnel_id))];
  }, [eventData]);

  const { data: pixKeysData } = useQuery({
    queryKey: ['pix-keys', personnelIds],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('pix-key/get', {
        body: { personnel_ids: personnelIds }
      });

      if (error) throw error;
      return data?.pix_keys || {};
    },
    enabled: isAdmin && personnelIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  return {
    eventData: eventData || { allocations: [], workLogs: [], closings: [], absences: [], payments: [] },
    payrollDetails,
    pixKeys: pixKeysData || {},
    loading: isLoading,
    error,
  };
};
