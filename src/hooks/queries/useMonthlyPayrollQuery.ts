import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedData } from '@/contexts/EnhancedDataContext';
import { useTeam } from '@/contexts/TeamContext';
import { useMemo } from 'react';
import * as PayrollCalc from '@/components/payroll/payrollCalculations';
import { RawWorkLog, RawAbsence } from '@/services/payrollDataService';

export const monthlyPayrollKeys = {
  all: ['monthly-payroll'] as const,
  byMonth: (teamId: string, month: number, year: number) => 
    [...monthlyPayrollKeys.all, teamId, month, year] as const,
};

interface MonthlyPayrollDetail {
  personnelId: string;
  personName: string;
  baseSalary: number;
  totalCachePay: number;
  totalOvertimePay: number;
  totalPay: number;
  eventCount: number;
  totalWorkDays: number;
  paidAmount: number;
  pendingAmount: number;
  isPaid: boolean;
  events: Array<{
    eventId: string;
    eventName: string;
    workDays: number;
    cachePay: number;
    overtimePay: number;
  }>;
}

export const useMonthlyPayrollQuery = (month: number, year: number) => {
  const { personnel, events } = useEnhancedData();
  const { activeTeam } = useTeam();

  // Datas do mês selecionado
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Último dia do mês

  // Buscar apenas funcionários fixos
  const fixedPersonnel = useMemo(() => 
    personnel.filter(p => p.type === 'fixo'), 
    [personnel]
  );

  // Buscar eventos do mês
  const monthEvents = useMemo(() => 
    events.filter(e => {
      const eventStart = e.start_date;
      const eventEnd = e.end_date || e.start_date;
      return (eventStart >= startDate && eventStart <= endDate) ||
             (eventEnd >= startDate && eventEnd <= endDate) ||
             (eventStart <= startDate && eventEnd >= endDate);
    }),
    [events, startDate, endDate]
  );

  const eventIds = useMemo(() => monthEvents.map(e => e.id), [monthEvents]);

  // Buscar dados de folha de pagamento para os eventos do mês
  const { data: payrollData, isLoading, error } = useQuery({
    queryKey: monthlyPayrollKeys.byMonth(activeTeam?.id || '', month, year),
    queryFn: async () => {
      if (!activeTeam?.id || eventIds.length === 0) {
        return { allocations: [], workLogs: [], closings: [], absences: [] };
      }

      const [allocationsData, workLogsData, closingsData] = await Promise.all([
        supabase
          .from('personnel_allocations')
          .select('*')
          .eq('team_id', activeTeam.id)
          .in('event_id', eventIds),
        supabase
          .from('work_records')
          .select('*')
          .eq('team_id', activeTeam.id)
          .in('event_id', eventIds),
        supabase
          .from('payroll_closings')
          .select('*')
          .eq('team_id', activeTeam.id)
          .in('event_id', eventIds)
      ]);

      // Derivar ausências a partir de work_records
      const allWorkLogs = (workLogsData.data || []) as RawWorkLog[];
      const derivedAbsences = allWorkLogs
        .filter(log => log.attendance_status === 'absent')
        .map(log => ({
          id: log.id,
          work_date: log.work_date,
          notes: log.notes,
          logged_by_id: log.logged_by_id,
          created_at: log.created_at || new Date().toISOString(),
          team_id: log.team_id,
          employee_id: log.employee_id,
          assignment_id: undefined // Não existe em work_records
        })) as RawAbsence[];

      return {
        allocations: allocationsData.data || [],
        workLogs: allWorkLogs,
        closings: closingsData.data || [],
        absences: derivedAbsences,
      };
    },
    enabled: !!activeTeam?.id && eventIds.length > 0,
    staleTime: 60000,
    refetchOnMount: 'always',
  });

  // Buscar pagamentos avulsos do mês
  const { data: personnelPayments } = useQuery({
    queryKey: ['personnel-payments', activeTeam?.id, month, year],
    queryFn: async () => {
      if (!activeTeam?.id) return [];

      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('personnel_payments')
        .select('*')
        .eq('team_id', activeTeam.id)
        .eq('payment_status', 'paid')
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTeam?.id,
  });

  // Buscar configuração de HE da equipe
  const { data: teamConfig } = useQuery({
    queryKey: ['team-config', activeTeam?.id],
    queryFn: async () => {
      if (!activeTeam?.id) return null;

      const { data, error } = await supabase
        .from('teams')
        .select('default_overtime_threshold_hours, default_convert_overtime_to_daily, monthly_payment_day')
        .eq('id', activeTeam.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!activeTeam?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Calcular folha mensal para cada fixo
  const monthlyPayrollDetails = useMemo((): MonthlyPayrollDetail[] => {
    if (!payrollData || !fixedPersonnel.length) return [];

    const teamOvertimeConfig = {
      default_convert_overtime_to_daily: teamConfig?.default_convert_overtime_to_daily ?? false,
      default_overtime_threshold_hours: teamConfig?.default_overtime_threshold_hours ?? 8,
    };

    return fixedPersonnel.map(person => {
      // Filtrar alocações do funcionário nos eventos do mês
      const personAllocations = payrollData.allocations.filter(
        (a: any) => a.personnel_id === person.id
      );

      // Filtrar logs de trabalho
      const personWorkLogs = payrollData.workLogs.filter(
        (log: any) => log.employee_id === person.id
      );

      // Agrupar por evento
      const eventDetails = monthEvents
        .filter(event => personAllocations.some((a: any) => a.event_id === event.id))
        .map(event => {
          const eventAllocations = personAllocations.filter((a: any) => a.event_id === event.id);
          const eventWorkLogs = personWorkLogs.filter((log: any) => log.event_id === event.id);

          const workDays = PayrollCalc.calculateWorkedDays(
            eventAllocations as any,
            eventWorkLogs as any
          );
          
          const cachePay = PayrollCalc.calculateCachePay(
            eventAllocations as any,
            person,
            eventWorkLogs as any
          );

          const dailyCache = PayrollCalc.getDailyCacheRate(eventAllocations as any, person);
          const overtimeRate = PayrollCalc.getOvertimeRate(eventAllocations as any, person);

          const overtimeResult = PayrollCalc.calculateOvertimePayWithDailyConversion(
            eventWorkLogs as any,
            {
              threshold: teamOvertimeConfig.default_overtime_threshold_hours,
              convertEnabled: teamOvertimeConfig.default_convert_overtime_to_daily,
              dailyCache,
              overtimeRate
            }
          );

          return {
            eventId: event.id,
            eventName: event.name,
            workDays,
            cachePay,
            overtimePay: overtimeResult.payAmount,
          };
        });

      // Somar totais do mês
      const baseSalary = person.monthly_salary || 0;
      const totalCachePay = eventDetails.reduce((sum, e) => sum + e.cachePay, 0);
      const totalOvertimePay = eventDetails.reduce((sum, e) => sum + e.overtimePay, 0);
      const totalPay = baseSalary + totalCachePay + totalOvertimePay;
      const totalWorkDays = eventDetails.reduce((sum, e) => sum + e.workDays, 0);

      // Calcular pagamentos já feitos (fechamentos de eventos + pagamentos avulsos)
      const eventPayments = payrollData.closings
        .filter((c: any) => c.personnel_id === person.id)
        .reduce((sum: number, c: any) => sum + Number(c.total_amount_paid), 0);

      const extraPayments = personnelPayments
        ?.filter(p => p.personnel_id === person.id)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const paidAmount = eventPayments + extraPayments;
      const pendingAmount = Math.max(totalPay - paidAmount, 0);
      const isPaid = pendingAmount <= 0.01;

      return {
        personnelId: person.id,
        personName: person.name,
        baseSalary,
        totalCachePay,
        totalOvertimePay,
        totalPay,
        eventCount: eventDetails.length,
        totalWorkDays,
        paidAmount,
        pendingAmount,
        isPaid,
        events: eventDetails,
      };
    });
  }, [payrollData, fixedPersonnel, monthEvents, teamConfig, personnelPayments]);

  return {
    monthlyPayrollDetails,
    monthlyPaymentDay: teamConfig?.monthly_payment_day || 5,
    loading: isLoading,
    error,
  };
};
