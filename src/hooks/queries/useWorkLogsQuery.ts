import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { useBroadcastInvalidation } from './useBroadcastInvalidation';
import { supabase } from '@/integrations/supabase/client';
import type { WorkRecord } from '@/contexts/EnhancedDataContext';
import { payrollKeys } from './usePayrollQuery';
import { toWorkRecordWrite, type WorkRecordWrite } from '@/services/workRecordWrite';

// Query keys for consistent caching
export const workLogsKeys = {
  all: ['workLogs'] as const,
  list: (teamId?: string) => ['workLogs', 'list', teamId] as const,
  byEvent: (eventId?: string) => ['workLogs', 'event', eventId] as const,
};

// Fetch work logs for a team
const fetchWorkLogs = async (teamId: string): Promise<WorkRecord[]> => {
  const { data, error } = await supabase
    .from('work_records')
    .select(`
      *,
      user_profiles:logged_by_id(
        name
      )
    `)
    .eq('team_id', teamId);

  if (error) throw error;

  return (data || []).map((row: any) => {
    const { user_profiles, ...workRecord } = row || {};
    return {
      ...(workRecord as WorkRecord),
      logged_by_name: user_profiles?.name ?? null,
    };
  }) as WorkRecord[];
};

// Hook to get work logs for the active team
export const useWorkLogsQuery = () => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: workLogsKeys.list(activeTeam?.id),
    queryFn: () => fetchWorkLogs(activeTeam!.id),
    enabled: !!user && !!activeTeam?.id,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!activeTeam?.id) return;
    const channel = supabase
      .channel(`realtime-work_records-${activeTeam.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'work_records',
        filter: `team_id=eq.${activeTeam.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: workLogsKeys.list(activeTeam.id), refetchType: 'active' });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeTeam?.id, queryClient]);

  return query;
};

// Hook to create new work log
export const useCreateWorkLogMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (workLogData: Omit<WorkRecord, 'id' | 'created_at' | 'team_id' | 'logged_by_name'>) => {
      if (!activeTeam) throw new Error('No active team');

      const payload: WorkRecordWrite & { team_id: string } = {
        ...(toWorkRecordWrite(workLogData) as WorkRecordWrite),
        team_id: activeTeam.id,
      };

      const { data, error } = await supabase
        .from('work_records')
        .upsert([
          payload
        ], {
          onConflict: 'team_id,employee_id,event_id,work_date'
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkRecord;
    },
    onSuccess: (data) => {
      const workRecord = data as WorkRecord;
      queryClient.setQueryData(workLogsKeys.list(activeTeam!.id), (old: any) => {
        const arr = Array.isArray(old) ? [...old] : [];
        const idx = arr.findIndex((r: WorkRecord) => r.employee_id === workRecord.employee_id && r.event_id === workRecord.event_id && r.work_date === workRecord.work_date);
        if (idx >= 0) arr[idx] = { ...(arr[idx] as WorkRecord), ...workRecord }; else arr.push(workRecord);
        return arr;
      });
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: workLogsKeys.all,
        refetchType: 'active'
      });
      
      // ✅ CRÍTICO: Invalidar cache de payroll do evento afetado
      if (workRecord.event_id) {
        queryClient.invalidateQueries({ 
          queryKey: payrollKeys.event(workRecord.event_id),
          refetchType: 'active'
        });
        console.log('♻️ [WorkLogs] Invalidated payroll cache for event:', workRecord.event_id);
      }
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(workLogsKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Registro de horas criado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Error creating work log:', error);
      const message = error instanceof Error ? error.message : 'Falha ao criar registro de horas';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: workLogsKeys.all,
        refetchType: 'none'
      });
    },
  });
};

// Hook to update work log
export const useUpdateWorkLogMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (workLog: WorkRecord) => {
      const payload = toWorkRecordWrite({
        employee_id: workLog.employee_id,
        event_id: workLog.event_id,
        work_date: workLog.work_date,
        hours_worked: workLog.hours_worked,
        overtime_hours: workLog.overtime_hours,
        total_pay: workLog.total_pay,
        logged_by_id: workLog.logged_by_id,
        date_logged: workLog.date_logged,
        attendance_status: workLog.attendance_status,
        notes: workLog.notes,
        check_in_time: workLog.check_in_time,
        check_out_time: workLog.check_out_time,
      });

      const { data, error } = await supabase
        .from('work_records')
        .update(payload)
        .eq('id', workLog.id)
        .eq('team_id', activeTeam!.id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkRecord;
    },
    onSuccess: (data) => {
      const workRecord = data as WorkRecord;
      queryClient.setQueryData(workLogsKeys.list(activeTeam!.id), (old: any) => {
        const arr = Array.isArray(old) ? [...old] : [];
        const idx = arr.findIndex((r: WorkRecord) => r.id === workRecord.id);
        if (idx >= 0) arr[idx] = { ...(arr[idx] as WorkRecord), ...workRecord };
        return arr;
      });
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: workLogsKeys.all,
        refetchType: 'active'
      });
      
      // ✅ CRÍTICO: Invalidar cache de payroll do evento afetado
      if (workRecord.event_id) {
        queryClient.invalidateQueries({ 
          queryKey: payrollKeys.event(workRecord.event_id),
          refetchType: 'active'
        });
        console.log('♻️ [WorkLogs] Invalidated payroll cache for event:', workRecord.event_id);
      }
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(workLogsKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Registro de horas atualizado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Error updating work log:', error);
      const message = error instanceof Error ? error.message : 'Falha ao atualizar registro de horas';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: workLogsKeys.all,
        refetchType: 'none'
      });
    },
  });
};

// Hook to delete work log
export const useDeleteWorkLogMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (workLogId: string) => {
      // Buscar o registro antes de deletar para obter o event_id
      const { data: workLog } = await supabase
        .from('work_records')
        .select('event_id')
        .eq('id', workLogId)
        .single();
      
      const { error } = await supabase
        .from('work_records')
        .delete()
        .eq('id', workLogId)
        .eq('team_id', activeTeam!.id);

      if (error) throw error;
      return { workLogId, eventId: workLog?.event_id };
    },
    onSuccess: ({ workLogId, eventId }) => {
      queryClient.setQueryData(workLogsKeys.list(activeTeam!.id), (old: any) => {
        const arr = Array.isArray(old) ? [...old] : [];
        return arr.filter((r: WorkRecord) => r.id !== workLogId);
      });
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: workLogsKeys.all,
        refetchType: 'active'
      });
      
      // ✅ CRÍTICO: Invalidar cache de payroll do evento afetado
      if (eventId) {
        queryClient.invalidateQueries({ 
          queryKey: payrollKeys.event(eventId),
          refetchType: 'active'
        });
        console.log('♻️ [WorkLogs] Invalidated payroll cache for event:', eventId);
      }
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(workLogsKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Registro de horas excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao excluir registro de horas",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: workLogsKeys.all,
        refetchType: 'none'
      });
    },
  });
};
