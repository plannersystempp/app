
import { useQueryClient } from '@tanstack/react-query';
import { payrollKeys } from '@/hooks/queries/usePayrollQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';
import { invalidateCache } from './eventStatusCache';
import { notificationService } from '@/services/notificationService';
import { personnelPaymentsKeys } from '@/hooks/queries/usePersonnelPaymentsQuery';
import { personnelHistoryKeys } from '@/hooks/queries/usePersonnelHistoryQuery';
import { monthlyPayrollKeys } from '@/hooks/queries/useMonthlyPayrollQuery';

type FullPaymentSnapshot = {
  cacheRate?: number;
  overtimeRate?: number;
};

type PostgrestErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const getErrorMessage = (error: unknown): string => {
  const e = error as PostgrestErrorLike | { message?: unknown } | null | undefined;
  const code = typeof (e as PostgrestErrorLike | undefined)?.code === 'string'
    ? (e as PostgrestErrorLike).code
    : undefined;
  const message = typeof (e as { message?: unknown } | undefined)?.message === 'string'
    ? (e as { message?: string }).message
    : undefined;

  if (code === '23505') return 'Pagamento já registrado (duplicado).';

  const lower = (message || '').toLowerCase();
  if (code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'Sem permissão para registrar pagamento nesta equipe.';
  }

  return message || 'Falha inesperada ao executar a operação.';
};

export const invalidateAfterPayrollClosingChange = (
  queryClient: {
    invalidateQueries: (args: { queryKey: readonly unknown[]; refetchType?: 'active' | 'all' | 'none' }) => unknown;
  },
  eventId: string,
  personnelId?: string
) => {
  queryClient.invalidateQueries({ queryKey: payrollKeys.event(eventId), refetchType: 'active' });
  queryClient.invalidateQueries({ queryKey: payrollKeys.all, refetchType: 'active' });
  queryClient.invalidateQueries({ queryKey: monthlyPayrollKeys.all, refetchType: 'active' });
  if (personnelId) {
    queryClient.invalidateQueries({ queryKey: personnelHistoryKeys.all(personnelId), refetchType: 'active' });
  } else {
    queryClient.invalidateQueries({ queryKey: ['personnel-history'], refetchType: 'active' });
  }
};

export const usePayrollActions = (
  selectedEventId: string
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const { toast } = useToast();

  const resolveUserId = async (): Promise<string | null> => {
    if (user?.id) return user.id;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id) return null;
    return data.user.id;
  };

  const handleRegisterPayment = async (
    personnelId: string,
    totalAmount: number,
    notes?: string,
    snapshot?: FullPaymentSnapshot
  ) => {
    if (!selectedEventId) {
      toast({
        title: "Erro",
        description: "Evento não definido para registrar pagamento.",
        variant: "destructive"
      });
      return;
    }

    if (!activeTeam) {
      toast({
        title: "Erro",
        description: "Equipe não definida para registrar pagamento.",
        variant: "destructive"
      });
      return;
    }

    const userId = await resolveUserId();
    if (!userId) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para registrar pagamentos.",
        variant: "destructive"
      });
      return;
    }

    // VALIDAÇÃO: Verificar se a pessoa está alocada no evento
    const { data: allocations, error: allocError } = await supabase
      .from('personnel_allocations')
      .select('id')
      .eq('event_id', selectedEventId)
      .eq('personnel_id', personnelId);

    if (allocError) {
      console.error('[Payroll] Error checking allocation', {
        eventId: selectedEventId,
        personnelId,
        teamId: activeTeam.id,
        error: allocError
      });
      toast({
        title: "Erro",
        description: "Falha ao verificar alocação",
        variant: "destructive"
      });
      return;
    }

    if (!allocations || allocations.length === 0) {
      toast({
        title: "Erro de Validação",
        description: "Esta pessoa não está alocada neste evento. Não é possível registrar pagamento.",
        variant: "destructive"
      });
      return;
    }

    // Removal of native browser confirmation to use UI dialogs instead

    try {
      const { data, error } = await supabase
        .from('payroll_closings')
        .insert([{
          event_id: selectedEventId,
          personnel_id: personnelId,
          total_amount_paid: totalAmount,
          team_id: activeTeam.id,
          notes: notes || null,
          paid_by_id: userId
        }])
        .select()
        .single();

      if (error) throw error;

      const freezePayload: { event_specific_cache?: number; event_specific_overtime?: number } = {};
      const cacheRate = Number(snapshot?.cacheRate || 0);
      const overtimeRate = Number(snapshot?.overtimeRate || 0);

      if (Number.isFinite(cacheRate) && cacheRate > 0) {
        freezePayload.event_specific_cache = Number(cacheRate.toFixed(4));
      }
      if (Number.isFinite(overtimeRate) && overtimeRate > 0) {
        freezePayload.event_specific_overtime = Number(overtimeRate.toFixed(4));
      }

      if (Object.keys(freezePayload).length > 0) {
        const { error: freezeError } = await supabase
          .from('personnel_allocations')
          .update(freezePayload)
          .eq('event_id', selectedEventId)
          .eq('personnel_id', personnelId);

        if (freezeError) {
          const rollback = await supabase
            .from('payroll_closings')
            .delete()
            .eq('id', data.id)
            .eq('team_id', activeTeam.id);
          if (rollback.error) {
            console.error('[Payroll] Rollback failed after freeze error', {
              eventId: selectedEventId,
              personnelId,
              teamId: activeTeam.id,
              closingId: data.id,
              freezeError,
              rollbackError: rollback.error
            });
          }
          throw freezeError;
        }
      }

      invalidateAfterPayrollClosingChange(queryClient, selectedEventId, personnelId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-payment-status'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['team-pending-payments'], refetchType: 'active' }),
      ]);


      // Obter nome do evento para notificação
      const { data: eventData } = await supabase
        .from('events')
        .select('name')
        .eq('id', selectedEventId)
        .single();

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso",
      });

      // Enviar notificação
      if (eventData && activeTeam?.id) {
        await notificationService.notifyPaymentReceived(
          totalAmount,
          eventData.name,
          activeTeam.id
        );
      }

      // Invalidar cache para forçar atualização nos dashboards
      invalidateCache();
    } catch (error) {
      console.error('[Payroll] Error registering full payment', {
        eventId: selectedEventId,
        personnelId,
        teamId: activeTeam?.id,
        totalAmount,
        error
      });
      toast({
        title: "Erro",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleRegisterPartialPayment = async (personnelId: string, amount: number, notes: string) => {
    if (!selectedEventId) {
      toast({
        title: "Erro",
        description: "Evento não definido para registrar pagamento.",
        variant: "destructive"
      });
      return;
    }

    if (!activeTeam) {
      toast({
        title: "Erro",
        description: "Equipe não definida para registrar pagamento.",
        variant: "destructive"
      });
      return;
    }

    const userId = await resolveUserId();
    if (!userId) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para registrar pagamentos.",
        variant: "destructive"
      });
      return;
    }

    // VALIDAÇÃO: Verificar se a pessoa está alocada no evento
    const { data: allocations, error: allocError } = await supabase
      .from('personnel_allocations')
      .select('id')
      .eq('event_id', selectedEventId)
      .eq('personnel_id', personnelId);

    if (allocError) {
      console.error('[Payroll] Error checking allocation (partial)', {
        eventId: selectedEventId,
        personnelId,
        teamId: activeTeam.id,
        error: allocError
      });
      toast({
        title: "Erro",
        description: "Falha ao verificar alocação",
        variant: "destructive"
      });
      return;
    }

    if (!allocations || allocations.length === 0) {
      toast({
        title: "Erro de Validação",
        description: "Esta pessoa não está alocada neste evento. Não é possível registrar pagamento.",
        variant: "destructive"
      });
      return;
    }

    // Removal of native browser confirmation to use UI dialogs instead

    try {
      const { data, error } = await supabase
        .from('payroll_closings')
        .insert([{
          event_id: selectedEventId,
          personnel_id: personnelId,
          total_amount_paid: amount,
          team_id: activeTeam.id,
          notes: notes || null,
          paid_by_id: userId
        }])
        .select()
        .single();

      if (error) throw error;

      invalidateAfterPayrollClosingChange(queryClient, selectedEventId, personnelId);
      await queryClient.invalidateQueries({ queryKey: ['event-payment-status'], refetchType: 'active' });


      // Obter nome do evento para notificação
      const { data: eventData } = await supabase
        .from('events')
        .select('name')
        .eq('id', selectedEventId)
        .single();

      // Enviar notificação
      if (eventData && activeTeam?.id) {
        await notificationService.notifyPaymentReceived(
          amount,
          eventData.name,
          activeTeam.id
        );
      }

      // Invalidar cache para forçar atualização nos dashboards
      invalidateCache();
    } catch (error) {
      console.error('[Payroll] Error registering partial payment', {
        eventId: selectedEventId,
        personnelId,
        teamId: activeTeam?.id,
        amount,
        error
      });
      toast({
        title: "Erro",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleCancelPayment = async (paymentId: string, personName: string) => {
    try {
      if (!activeTeam?.id || !selectedEventId) {
        toast({
          title: "Erro",
          description: "Equipe ou evento não definidos para cancelar pagamento.",
          variant: "destructive"
        });
        return;
      }

      const [closingLookup, directPaymentLookup] = await Promise.all([
        supabase
          .from('payroll_closings')
          .select('id, personnel_id')
          .eq('id', paymentId)
          .eq('team_id', activeTeam.id)
          .maybeSingle(),
        supabase
          .from('personnel_payments')
          .select('id, personnel_id')
          .eq('id', paymentId)
          .eq('team_id', activeTeam.id)
          .maybeSingle(),
      ]);

      if (closingLookup.error) throw closingLookup.error;
      if (directPaymentLookup.error) throw directPaymentLookup.error;

      let affectedPersonnelId: string | null = null;

      if (closingLookup.data) {
        affectedPersonnelId = closingLookup.data.personnel_id;
        const { data: deletedRows, error } = await supabase
          .from('payroll_closings')
          .delete()
          .eq('id', paymentId)
          .eq('team_id', activeTeam.id)
          .select('id');

        if (error) throw error;
        if (!deletedRows || deletedRows.length === 0) {
          throw new Error('Nenhum fechamento foi removido. Verifique permissões.');
        }
      } else if (directPaymentLookup.data) {
        affectedPersonnelId = directPaymentLookup.data.personnel_id;
        const { data: deletedRows, error } = await supabase
          .from('personnel_payments')
          .delete()
          .eq('id', paymentId)
          .eq('team_id', activeTeam.id)
          .select('id');

        if (error) throw error;
        if (!deletedRows || deletedRows.length === 0) {
          throw new Error('Nenhum pagamento avulso foi removido. Verifique permissões.');
        }
      } else {
        throw new Error('Registro não encontrado para exclusão nesta equipe.');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['event-payment-status'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: personnelPaymentsKeys.all, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['team-pending-payments'], refetchType: 'active' }),
      ]);
      invalidateAfterPayrollClosingChange(queryClient, selectedEventId, affectedPersonnelId || undefined);

      toast({
        title: "Sucesso",
        description: `Pagamento de ${personName} foi cancelado com sucesso`,
      });

      // Invalidar cache para forçar atualização nos dashboards
      invalidateCache();
    } catch (error: unknown) {
      console.error('[Payroll] Error canceling payment', {
        eventId: selectedEventId,
        paymentId,
        teamId: activeTeam?.id,
        error
      });
      toast({
        title: "Erro",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  return {
    handleRegisterPayment,
    handleRegisterPartialPayment,
    handleCancelPayment
  };
};
