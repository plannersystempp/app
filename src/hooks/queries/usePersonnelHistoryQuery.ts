import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/contexts/TeamContext';
import { calculateWorkedDays, calculateTotalPay } from '@/components/payroll/payrollCalculations';
import * as PayrollCalc from '@/components/payroll/payrollCalculations';

interface PendingAllocationEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  payment_due_date?: string | null;
}

interface PendingAllocationRow {
  id: string;
  event_id: string;
  work_days: string[] | null;
  event_specific_cache: number | null;
  function_name: string | null;
  events: PendingAllocationEvent;
}

interface EventAllocationEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface EventAllocationRow {
    id: string;
    event_id: string;
    work_days: string[] | null;
    function_name: string | null;
    event_specific_cache: number | null;
    events: EventAllocationEvent;
  }

interface PersonnelDirectPaymentRow {
  amount: number;
  related_events: unknown;
}

interface PersonnelFunctionRow {
  function_id: string | null;
  custom_cache: number | null;
  custom_overtime: number | null;
  functions?: {
    id?: string;
    name?: string;
  } | null;
}

const PENDING_TOLERANCE = 1.0;

const parseRelatedEventIds = (relatedEvents: unknown): string[] => {
  if (!relatedEvents) return [];
  if (Array.isArray(relatedEvents)) {
    return relatedEvents.filter((value): value is string => typeof value === 'string' && value.length > 0);
  }
  if (typeof relatedEvents === 'string') {
    try {
      const parsed = JSON.parse(relatedEvents) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
};

const getAllocatedPaymentAmountForEvent = (payment: PersonnelDirectPaymentRow, eventId: string): number => {
  const relatedEvents = parseRelatedEventIds(payment.related_events);
  if (relatedEvents.length === 0) return 0;
  if (!relatedEvents.includes(eventId)) return 0;
  return Number(payment.amount) / relatedEvents.length;
};

const calculatePendingPaymentsByEvent = async (
  teamId: string,
  personnelId: string
): Promise<PendingPayment[]> => {
  const { data: allocations, error: allocError } = await supabase
    .from('personnel_allocations')
    .select(`
      id,
      event_id,
      work_days,
      function_name,
      event_specific_cache,
      events!inner (
        id,
        name,
        start_date,
        end_date,
        payment_due_date,
        status,
        team_id
      )
    `)
    .eq('personnel_id', personnelId)
    .eq('events.team_id', teamId)
    .in('events.status', ['concluido', 'concluido_pagamento_pendente']);

  if (allocError) throw allocError;

  const typedAllocations = (allocations ?? []) as unknown as PendingAllocationRow[];
  if (typedAllocations.length === 0) return [];

  const { data: personnel, error: personnelError } = await supabase
    .from('personnel')
    .select('id, name, type, event_cache, monthly_salary, overtime_rate')
    .eq('id', personnelId)
    .single();

  if (personnelError) throw personnelError;

  const { data: personnelFunctions, error: personnelFunctionsError } = await supabase
    .from('personnel_functions')
    .select(`
      function_id,
      custom_cache,
      custom_overtime,
      functions:function_id(id, name)
    `)
    .eq('personnel_id', personnelId)
    .eq('team_id', teamId);

  if (personnelFunctionsError) throw personnelFunctionsError;

  const allocationsByEvent = typedAllocations.reduce<Map<string, PendingAllocationRow[]>>((map, allocation) => {
    const current = map.get(allocation.event_id) ?? [];
    current.push(allocation);
    map.set(allocation.event_id, current);
    return map;
  }, new Map<string, PendingAllocationRow[]>());

  const pendingData = await Promise.all(
    Array.from(allocationsByEvent.entries()).map(async ([eventId, eventAllocations]) => {
      const event = eventAllocations[0].events;

      const [closingsResult, paymentsResult, workLogsResult] = await Promise.all([
        supabase
          .from('payroll_closings')
          .select('total_amount_paid')
          .eq('event_id', eventId)
          .eq('personnel_id', personnelId),
        supabase
          .from('personnel_payments')
          .select('amount, related_events')
          .eq('team_id', teamId)
          .eq('personnel_id', personnelId)
          .eq('payment_status', 'paid')
          .contains('related_events', [eventId]),
        supabase
          .from('work_records')
          .select('id, employee_id, event_id, work_date, hours_worked, overtime_hours, attendance_status')
          .eq('event_id', eventId)
          .eq('employee_id', personnelId),
      ]);

      if (closingsResult.error) throw closingsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (workLogsResult.error) throw workLogsResult.error;

      const totalPaidClosings =
        closingsResult.data?.reduce((sum, item) => sum + Number(item.total_amount_paid), 0) ?? 0;
      const totalPaidPayments =
        ((paymentsResult.data ?? []) as unknown as PersonnelDirectPaymentRow[]).reduce(
          (sum, payment) => sum + getAllocatedPaymentAmountForEvent(payment, eventId),
          0
        );
      const totalPaid = totalPaidClosings + totalPaidPayments;

      // Preparar dados para o calculador oficial (SSOT)
      const allocationsForCalc = eventAllocations.map((allocation) => ({
        id: allocation.id,
        personnel_id: personnelId,
        event_id: eventId,
        work_days: allocation.work_days || [],
        event_specific_cache: allocation.event_specific_cache,
        function_name: allocation.function_name
      })) as PayrollCalc.AllocationData[];

      const parsedFunctions = ((personnelFunctions ?? []) as unknown as PersonnelFunctionRow[])
        .map((item) => ({
          id: item.function_id || item.functions?.id,
          name: item.functions?.name || '',
          custom_cache: item.custom_cache ? Number(item.custom_cache) : undefined,
          custom_overtime: item.custom_overtime ? Number(item.custom_overtime) : undefined
        }))
        .filter((item) => !!item.id || !!item.name);

      const personForCalc = {
        id: personnelId,
        name: personnel?.name || '',
        type: (personnel?.type || 'freelancer') as 'fixo' | 'freelancer',
        event_cache: personnel?.event_cache,
        monthly_salary: personnel?.monthly_salary,
        overtime_rate: personnel?.overtime_rate,
        functions: parsedFunctions
      } as PayrollCalc.PersonnelData;

      const workLogsForCalc = (workLogsResult.data || []).map(log => ({
        id: log.id,
        employee_id: log.employee_id,
        event_id: log.event_id,
        hours_worked: log.hours_worked,
        overtime_hours: log.overtime_hours,
        attendance_status: log.attendance_status as 'present' | 'absent' | 'pending' | undefined,
        work_date: log.work_date
      })) as PayrollCalc.WorkLogData[];

      // Usar o cálculo oficial da folha
      const totalAmount = calculateTotalPay(
        allocationsForCalc,
        personForCalc,
        workLogsForCalc
      );

      const pendingAmount = Math.max(0, totalAmount - totalPaid);

      if (pendingAmount <= PENDING_TOLERANCE) return null;

      return {
        eventId,
        eventName: event.name,
        startDate: event.start_date,
        endDate: event.end_date,
        paymentDueDate: event.payment_due_date ?? undefined,
        pendingAmount,
      };
    })
  );

  return pendingData.filter((item): item is PendingPayment => item !== null);
};

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
    queryFn: async (): Promise<PendingPayment[]> => calculatePendingPaymentsByEvent(activeTeam!.id, personnelId),
    enabled: !!personnelId && !!activeTeam?.id,
  });
};

// 3. Buscar histórico de eventos
export const useEventsHistory = (personnelId: string) => {
  const { activeTeam } = useTeam();
  
  return useQuery({
    queryKey: personnelHistoryKeys.events(personnelId),
    queryFn: async (): Promise<EventHistoryItem[]> => {
      // 1. Buscar alocações baseadas nos eventos do time (não na coluna team_id da alocação)
      const { data, error } = await supabase
        .from('personnel_allocations')
        .select(`
          id,
          event_id,
          work_days,
          function_name,
          event_specific_cache,
          events!inner (
            id,
            name,
            start_date,
            end_date,
            status,
            team_id
          )
        `)
        .eq('personnel_id', personnelId)
        .eq('events.team_id', activeTeam!.id)
        .order('events(start_date)', { ascending: false });

      if (error) throw error;

      // 2. Buscar dados completos do pessoal para cálculo correto
      const { data: personnel } = await supabase
        .from('personnel')
        .select('id, name, type, event_cache, monthly_salary, overtime_rate')
        .eq('id', personnelId)
        .single();

      const { data: personnelFunctions, error: personnelFunctionsError } = await supabase
        .from('personnel_functions')
        .select(`
          function_id,
          custom_cache,
          custom_overtime,
          functions:function_id(id, name)
        `)
        .eq('personnel_id', personnelId)
        .eq('team_id', activeTeam!.id);

      if (personnelFunctionsError) throw personnelFunctionsError;

      const typedData = (data ?? []) as unknown as EventAllocationRow[];
      const allocationsByEvent = typedData.reduce<Map<string, EventAllocationRow[]>>((map, allocation) => {
        const current = map.get(allocation.event_id) ?? [];
        current.push(allocation);
        map.set(allocation.event_id, current);
        return map;
      }, new Map<string, EventAllocationRow[]>());

      const eventsData = await Promise.all(
        Array.from(allocationsByEvent.entries()).map(async ([eventId, eventAllocations]) => {
          const event = eventAllocations[0].events;
          
          const [closingsResult, paymentsResult] = await Promise.all([
            supabase
              .from('payroll_closings')
              .select('total_amount_paid')
              .eq('event_id', eventId)
              .eq('personnel_id', personnelId),
            supabase
              .from('personnel_payments')
              .select('amount, related_events')
              .eq('team_id', activeTeam!.id)
              .eq('personnel_id', personnelId)
              .eq('payment_status', 'paid')
              .contains('related_events', [eventId]),
          ]);

          if (closingsResult.error) throw closingsResult.error;
          if (paymentsResult.error) throw paymentsResult.error;

          const totalPaidClosings =
            closingsResult.data?.reduce((sum, c) => sum + Number(c.total_amount_paid), 0) || 0;
          const totalPaidPayments =
            ((paymentsResult.data ?? []) as unknown as PersonnelDirectPaymentRow[]).reduce(
              (sum, payment) => sum + getAllocatedPaymentAmountForEvent(payment, eventId),
              0
            );
          const totalPaid = totalPaidClosings + totalPaidPayments;

          // 3. Buscar registros de trabalho completos para cálculo de horas e faltas
          const { data: workLogs } = await supabase
            .from('work_records')
            .select('id, employee_id, event_id, work_date, hours_worked, overtime_hours, attendance_status')
            .eq('event_id', eventId)
            .eq('employee_id', personnelId);

          // Preparar dados para o calculador oficial (SSOT)
          const allocationsForCalc = eventAllocations.map((allocation) => ({
            id: allocation.id,
            personnel_id: personnelId,
            event_id: eventId,
            work_days: allocation.work_days || [],
            event_specific_cache: allocation.event_specific_cache,
            function_name: allocation.function_name
          })) as PayrollCalc.AllocationData[];

          const parsedFunctions = ((personnelFunctions ?? []) as unknown as PersonnelFunctionRow[])
            .map((item) => ({
              id: item.function_id || item.functions?.id,
              name: item.functions?.name || '',
              custom_cache: item.custom_cache ? Number(item.custom_cache) : undefined,
              custom_overtime: item.custom_overtime ? Number(item.custom_overtime) : undefined
            }))
            .filter((item) => !!item.id || !!item.name);

          const personForCalc = {
            id: personnelId,
            name: personnel?.name || '',
            type: (personnel?.type || 'freelancer') as 'fixo' | 'freelancer',
            event_cache: personnel?.event_cache,
            monthly_salary: personnel?.monthly_salary,
            overtime_rate: personnel?.overtime_rate,
            functions: parsedFunctions
          } as PayrollCalc.PersonnelData;

          const workLogsForCalc = (workLogs || []).map(log => ({
            id: log.id,
            employee_id: log.employee_id,
            event_id: log.event_id,
            hours_worked: log.hours_worked,
            overtime_hours: log.overtime_hours,
            attendance_status: log.attendance_status as 'present' | 'absent' | 'pending' | undefined,
            work_date: log.work_date
          })) as PayrollCalc.WorkLogData[];

          // Usar o cálculo oficial da folha
          const totalAmount = calculateTotalPay(
            allocationsForCalc,
            personForCalc,
            workLogsForCalc
            // Sem overtimeConfig por enquanto (assume default)
          );

          // Recalcular dias trabalhados para exibição usando a mesma lógica
          const daysWorked = calculateWorkedDays(allocationsForCalc, workLogsForCalc);

          // Coletar nomes de função e dias brutos para exibição
          const workDays = Array.from(
            new Set(eventAllocations.flatMap((allocation) => allocation.work_days || []))
          );
          const functionNames = Array.from(
            new Set(
              eventAllocations
                .map((allocation) => allocation.function_name?.trim() || '')
                .filter((name) => name.length > 0)
            )
          );

          return {
            id: event.id,
            name: event.name,
            startDate: event.start_date,
            endDate: event.end_date,
            status: event.status,
            workDays,
            functionName: functionNames.join(', '),
            totalPaid,
            totalAmount,
            isPaid: totalPaid >= totalAmount - PENDING_TOLERANCE,
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

      const { data: directPaid } = await supabase
        .from('personnel_payments')
        .select('amount')
        .eq('personnel_id', personnelId)
        .eq('team_id', activeTeam!.id)
        .eq('payment_status', 'paid');

      const totalPaidAllTime =
        (closings?.reduce((sum, c) => sum + Number(c.total_amount_paid), 0) || 0) +
        (directPaid?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0);

      const pendingPayments = await calculatePendingPaymentsByEvent(activeTeam!.id, personnelId);
      const totalPending = pendingPayments.reduce((sum, pending) => sum + pending.pendingAmount, 0);

      return {
        totalEvents: totalEvents || 0,
        totalPaidAllTime,
        totalPending,
      };
    },
    enabled: !!personnelId && !!activeTeam?.id,
  });
};
