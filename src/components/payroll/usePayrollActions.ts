
import { useQueryClient } from '@tanstack/react-query';
import { payrollKeys } from '@/hooks/queries/usePayrollQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';
import { invalidateCache } from './eventStatusCache';
import { notificationService } from '@/services/notificationService';

export const usePayrollActions = (
  selectedEventId: string
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const { toast } = useToast();

  const handleRegisterPayment = async (personnelId: string, totalAmount: number, notes?: string) => {
    if (!user || !activeTeam) return;

    // VALIDAÇÃO: Verificar se a pessoa está alocada no evento
    const { data: allocations, error: allocError } = await supabase
      .from('personnel_allocations')
      .select('id')
      .eq('event_id', selectedEventId)
      .eq('personnel_id', personnelId);

    if (allocError) {
      console.error('Error checking allocation:', allocError);
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
          paid_by_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: payrollKeys.event(selectedEventId) });
      await queryClient.invalidateQueries({ queryKey: ['event-payment-status'], refetchType: 'active' });


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
      console.error('Error registering payment:', error);
      toast({
        title: "Erro",
        description: "Falha ao registrar pagamento",
        variant: "destructive"
      });
    }
  };

  const handleRegisterPartialPayment = async (personnelId: string, amount: number, notes: string) => {
    if (!user || !activeTeam) return;

    // VALIDAÇÃO: Verificar se a pessoa está alocada no evento
    const { data: allocations, error: allocError } = await supabase
      .from('personnel_allocations')
      .select('id')
      .eq('event_id', selectedEventId)
      .eq('personnel_id', personnelId);

    if (allocError) {
      console.error('Error checking allocation:', allocError);
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
          paid_by_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: payrollKeys.event(selectedEventId) });
      await queryClient.invalidateQueries({ queryKey: ['event-payment-status'], refetchType: 'active' });


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
      console.error('Error registering partial payment:', error);
      toast({
        title: "Erro",
        description: "Falha ao registrar pagamento parcial",
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

      // Diagnóstico: checar se o registro está visível antes de apagar
      const { data: closingRow } = await supabase
        .from('payroll_closings')
        .select('id, event_id, team_id, personnel_id, paid_by_id')
        .eq('id', paymentId)
        .maybeSingle();

      // Deletar pelo id apenas, para evitar mismatch de filtros
      const { data: deletedRows, error } = await supabase
        .from('payroll_closings')
        .delete()
        .eq('id', paymentId)
        .select();

      if (error) throw error;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('Nenhum registro foi removido. Verifique políticas de acesso (RLS).');
      }

      await queryClient.invalidateQueries({ queryKey: payrollKeys.event(selectedEventId) });
      await queryClient.invalidateQueries({ queryKey: ['event-payment-status'], refetchType: 'active' });

      toast({
        title: "Sucesso",
        description: `Pagamento de ${personName} foi cancelado com sucesso`,
      });

      // Invalidar cache para forçar atualização nos dashboards
      invalidateCache();
    } catch (error: any) {
      console.error('Error canceling payment:', error);
      toast({
        title: "Erro",
        description: error?.message ? String(error.message) : "Falha ao cancelar pagamento",
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
