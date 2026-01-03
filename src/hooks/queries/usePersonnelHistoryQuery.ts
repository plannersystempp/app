import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/contexts/TeamContext';
import { calculateWorkedDays } from '@/components/payroll/payrollCalculations';

// Types
export interface PaymentHistoryItem {
  id: string;
  amount: number;
  paidAt: string;
  notes?: string;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  eventStatus: string;
}

export interface PendingPayment {
  eventId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  paymentDueDate?: string;
  pendingAmount: number;
}

export interface EventHistoryItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  workDays: string[];
  functionName: string;
  totalPaid: number;
  totalAmount: number;
  isPaid: boolean;
}

export interface PersonnelStats {
  totalEvents: number;
  totalPaidAllTime: number;
  totalPending: number;
}

// Query Keys
export const personnelHistoryKeys = {
  all: (personnelId: string) => ['personnel-history', personnelId] as const,
  payments: (personnelId: string) => [...personnelHistoryKeys.all(personnelId), 'payments'] as const,
  pending: (personnelId: string) => [...personnelHistoryKeys.all(personnelId), 'pending'] as const,
  events: (personnelId: string) => [...personnelHistoryKeys.all(personnelId), 'events'] as const,
  stats: (personnelId: string) => [...personnelHistoryKeys.all(personnelId), 'stats'] as const,
};

// 1. Buscar histórico de pagamentos
export const usePaymentHistory = (personnelId: string) => {
  const { activeTeam } = useTeam();
  
  return useQuery({
    queryKey: personnelHistoryKeys.payments(personnelId),
    queryFn: async (): Promise<PaymentHistoryItem[]> => {
      const { data, error } = await supabase
        .from('payroll_closings')
        .select(`
          id,
          total_amount_paid,
          paid_at,
          notes,
          events!inner (
            name,
            start_date,
            end_date,
            status
          )
        `)
        .eq('personnel_id', personnelId)
        .eq('team_id', activeTeam!.id)
        .order('paid_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        amount: item.total_amount_paid,
        paidAt: item.paid_at,
        notes: item.notes || undefined,
        eventName: (item.events as any).name,
        eventStartDate: (item.events as any).start_date,
        eventEndDate: (item.events as any).end_date,
        eventStatus: (item.events as any).status,
      }));
    },
    enabled: !!personnelId && !!activeTeam?.id,
  });
};

// 2. Buscar valores pendentes
export const usePendingPayments = (personnelId: string) => {
  const { activeTeam } = useTeam();
  
  return useQuery({
    queryKey: personnelHistoryKeys.pending(personnelId),
    queryFn: async (): Promise<PendingPayment[]> => {
      // Buscar alocações em eventos concluídos
      const { data: allocations, error: allocError } = await supabase
        .from('personnel_allocations')
        .select(`
          event_id,
          events!inner (
            id,
            name,
            start_date,
            end_date,
            payment_due_date,
            status
          )
        `)
        .eq('personnel_id', personnelId)
        .eq('team_id', activeTeam!.id)
        .in('events.status', ['concluido', 'concluido_pagamento_pendente']);

      if (allocError) throw allocError;

      // Para cada evento, calcular o valor pendente
      const pendingData = await Promise.all(
        allocations.map(async (alloc) => {
          const event = alloc.events as any;
          
          // Buscar fechamentos (pagamentos realizados)
          const { data: closings } = await supabase
            .from('payroll_closings')
            .select('total_amount_paid')
            .eq('event_id', event.id)
            .eq('personnel_id', personnelId);

          const totalPaid = closings?.reduce((sum, c) => sum + Number(c.total_amount_paid), 0) || 0;

          // Buscar alocações do evento para calcular valor esperado
          const { data: workDays } = await supabase
            .from('personnel_allocations')
            .select('id, work_days, event_specific_cache')
            .eq('event_id', event.id)
            .eq('personnel_id', personnelId)
            .single();

          // Buscar dados do pessoal para calcular cache
          const { data: personnel } = await supabase
            .from('personnel')
            .select('event_cache')
            .eq('id', personnelId)
            .single();

          // Buscar ausências para descontar dos dias trabalhados
          const { data: absences } = await supabase
            .from('personnel_absences')
            .select('*')
            .eq('assignment_id', workDays?.id || '00000000-0000-0000-0000-000000000000'); // Evitar erro se workDays for null

          const cacheRate = workDays?.event_specific_cache || personnel?.event_cache || 0;
          
          // Usar a função oficial de cálculo para descontar faltas
          const allocationData = workDays ? [{
            id: workDays.id,
            personnel_id: personnelId,
            event_id: event.id,
            work_days: workDays.work_days || [],
            event_specific_cache: workDays.event_specific_cache
          }] : [];
          
          const daysWorked = calculateWorkedDays(allocationData, (absences || []) as any[]);
          const totalAmount = Number(cacheRate) * daysWorked;

          const pendingAmount = totalAmount - totalPaid;

          if (pendingAmount <= 0) return null;

          return {
            eventId: event.id,
            eventName: event.name,
            startDate: event.start_date,
            endDate: event.end_date,
            paymentDueDate: event.payment_due_date,
            pendingAmount,
          };
        })
      );

      return pendingData.filter(item => item !== null) as PendingPayment[];
    },
    enabled: !!personnelId && !!activeTeam?.id,
  });
};

// 3. Buscar histórico de eventos
export const useEventsHistory = (personnelId: string) => {
  const { activeTeam } = useTeam();
  
  return useQuery({
    queryKey: personnelHistoryKeys.events(personnelId),
    queryFn: async (): Promise<EventHistoryItem[]> => {
      const { data, error } = await supabase
        .from('personnel_allocations')
        .select(`
          event_id,
          work_days,
          function_name,
          event_specific_cache,
          events!inner (
            id,
            name,
            start_date,
            end_date,
            status
          )
        `)
        .eq('personnel_id', personnelId)
        .eq('team_id', activeTeam!.id)
        .order('events(start_date)', { ascending: false });

      if (error) throw error;

      // Buscar dados do pessoal uma vez
      const { data: personnel } = await supabase
        .from('personnel')
        .select('event_cache')
        .eq('id', personnelId)
        .single();

      // Para cada evento, buscar pagamentos
      const eventsData = await Promise.all(
        data.map(async (item) => {
          const event = item.events as any;
          
          const { data: closings } = await supabase
            .from('payroll_closings')
            .select('total_amount_paid')
            .eq('event_id', event.id)
            .eq('personnel_id', personnelId);

          const totalPaid = closings?.reduce((sum, c) => sum + Number(c.total_amount_paid), 0) || 0;

          // Calcular valor total baseado em cache
          const cacheRate = item.event_specific_cache || personnel?.event_cache || 0;
          const daysWorked = item.work_days?.length || 0;
          const totalAmount = Number(cacheRate) * daysWorked;

          return {
            id: event.id,
            name: event.name,
            startDate: event.start_date,
            endDate: event.end_date,
            status: event.status,
            workDays: item.work_days || [],
            functionName: item.function_name,
            totalPaid,
            totalAmount,
            isPaid: totalPaid >= totalAmount - 0.01, // tolerância de 1 centavo
          };
        })
      );

      return eventsData;
    },
    enabled: !!personnelId && !!activeTeam?.id,
  });
};

// 4. Buscar estatísticas
export const usePersonnelStats = (personnelId: string) => {
  const { activeTeam } = useTeam();
  
  return useQuery({
    queryKey: personnelHistoryKeys.stats(personnelId),
    queryFn: async (): Promise<PersonnelStats> => {
      // Total de eventos
      const { count: totalEvents } = await supabase
        .from('personnel_allocations')
        .select('*', { count: 'exact', head: true })
        .eq('personnel_id', personnelId)
        .eq('team_id', activeTeam!.id);

      // Total pago
      const { data: closings } = await supabase
        .from('payroll_closings')
        .select('total_amount_paid')
        .eq('personnel_id', personnelId)
        .eq('team_id', activeTeam!.id);

      const totalPaidAllTime = closings?.reduce((sum, c) => sum + Number(c.total_amount_paid), 0) || 0;

      // Total pendente - buscar eventos concluídos
      const { data: allocations } = await supabase
        .from('personnel_allocations')
        .select(`
          event_id,
          work_days,
          event_specific_cache,
          events!inner (
            status
          )
        `)
        .eq('personnel_id', personnelId)
        .eq('team_id', activeTeam!.id)
        .in('events.status', ['concluido', 'concluido_pagamento_pendente']);

      // Buscar dados do pessoal
      const { data: personnel } = await supabase
        .from('personnel')
        .select('event_cache')
        .eq('id', personnelId)
        .single();

      let totalPending = 0;
      if (allocations) {
        for (const alloc of allocations) {
          const { data: paid } = await supabase
            .from('payroll_closings')
            .select('total_amount_paid')
            .eq('event_id', alloc.event_id)
            .eq('personnel_id', personnelId);

          const totalPaidEvent = paid?.reduce((sum, c) => sum + Number(c.total_amount_paid), 0) || 0;
          const cacheRate = alloc.event_specific_cache || personnel?.event_cache || 0;
          const daysWorked = alloc.work_days?.length || 0;
          const totalAmountEvent = Number(cacheRate) * daysWorked;
          
          const pending = totalAmountEvent - totalPaidEvent;
          if (pending > 0) {
            totalPending += pending;
          }
        }
      }

      return {
        totalEvents: totalEvents || 0,
        totalPaidAllTime,
        totalPending,
      };
    },
    enabled: !!personnelId && !!activeTeam?.id,
  });
};
