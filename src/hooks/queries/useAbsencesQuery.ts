
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { workLogsKeys } from './useWorkLogsQuery';
import type { Absence } from '@/contexts/data/types';
import type { CreateAbsenceData } from '@/contexts/data/formTypes';

export const absenceKeys = {
  all: ['absences'] as const,
  lists: () => [...absenceKeys.all, 'list'] as const,
  list: (eventId?: string) => [...absenceKeys.lists(), { eventId }] as const,
};

// Fetch absences for an event
const fetchEventAbsences = async (eventId: string, teamId: string): Promise<Absence[]> => {
  console.log('Fetching absences for event:', eventId, 'team:', teamId);
  
  const { data, error } = await supabase
    .from('absences')
    .select(`
      *,
      personnel_allocations!inner(event_id)
    `)
    .eq('team_id', teamId)
    .eq('personnel_allocations.event_id', eventId);

  if (error) {
    console.error('Error fetching absences:', error);
    throw error;
  }
  
  console.log('Fetched absences:', data);
  return data || [];
};

export const useAbsencesQuery = (eventId?: string) => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  return useQuery({
    queryKey: absenceKeys.list(eventId),
    queryFn: () => fetchEventAbsences(eventId!, activeTeam!.id),
    enabled: !!user && !!activeTeam?.id && !!eventId,
  });
};

export const useCreateAbsenceMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (absenceData: CreateAbsenceData) => {
      console.log('Creating absence with corrected structure:', absenceData);
      
      // Create absence record with the new database structure
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: absenceResult, error: absenceError } = await supabase
        .from('absences')
        .insert({
          assignment_id: absenceData.assignment_id,
          team_id: absenceData.team_id,
          work_date: absenceData.work_date,
          notes: absenceData.notes,
          logged_by_id: user?.id, // Explicitly set the logged_by_id
        })
        .select()
        .single();

      if (absenceError) {
        console.error('Error inserting absence:', absenceError);
        throw absenceError;
      }

      console.log('Absence created successfully:', absenceResult);

      // Keep `work_records` as SSOT for presença/falta
      try {
        const { data: allocation } = await supabase
          .from('personnel_allocations')
          .select('event_id, personnel_id')
          .eq('id', absenceData.assignment_id)
          .single();

        if (allocation) {
          const { error: workRecordError } = await supabase
            .from('work_records')
            .upsert([
              {
                team_id: absenceData.team_id,
                employee_id: allocation.personnel_id,
                event_id: allocation.event_id,
                work_date: absenceData.work_date,
                attendance_status: 'absent',
                check_in_time: null,
                check_out_time: null,
                hours_worked: 0,
                overtime_hours: 0,
                total_pay: 0,
                logged_by_id: user?.id,
                notes: absenceData.notes ?? null,
              },
            ], {
              onConflict: 'team_id,employee_id,event_id,work_date',
            });

          if (workRecordError) throw workRecordError;
        }
      } catch (error) {
        console.warn('Error syncing absence to work_records:', error);
      }

      return absenceResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: absenceKeys.all });
      if (activeTeam?.id) {
        queryClient.invalidateQueries({ queryKey: workLogsKeys.all, refetchType: 'active' });
      }
      toast({
        title: "Sucesso",
        description: "Falta registrada com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('Error creating absence:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao registrar falta",
        variant: "destructive"
      });
    },
  });
};

export const useDeleteAbsenceMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (absenceId: string) => {
      console.log('Deleting absence:', absenceId);

      const { data: absenceRow, error: absenceFetchError } = await supabase
        .from('absences')
        .select('id, team_id, assignment_id, work_date')
        .eq('id', absenceId)
        .single();

      if (absenceFetchError) throw absenceFetchError;
      
      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', absenceId);

      if (error) {
        console.error('Error deleting absence:', error);
        throw error;
      }
      
      try {
        const { data: allocation } = await supabase
          .from('personnel_allocations')
          .select('event_id, personnel_id')
          .eq('id', absenceRow.assignment_id)
          .single();

        if (allocation) {
          await supabase
            .from('work_records')
            .update({
              attendance_status: 'pending',
              check_in_time: null,
              check_out_time: null,
              hours_worked: 0,
              overtime_hours: 0,
              total_pay: 0,
            })
            .eq('team_id', absenceRow.team_id)
            .eq('event_id', allocation.event_id)
            .eq('employee_id', allocation.personnel_id)
            .eq('work_date', absenceRow.work_date)
            .eq('attendance_status', 'absent');
        }
      } catch (err) {
        console.warn('Error syncing absence deletion to work_records:', err);
      }

      console.log('Absence deleted successfully');
      return absenceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: absenceKeys.all });
      if (activeTeam?.id) {
        queryClient.invalidateQueries({ queryKey: workLogsKeys.all, refetchType: 'active' });
      }
      toast({
        title: "Sucesso",
        description: "Falta removida com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting absence:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover falta",
        variant: "destructive"
      });
    },
  });
};
