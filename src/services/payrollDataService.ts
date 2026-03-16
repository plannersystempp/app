import { supabase } from '@/integrations/supabase/client';
import * as PayrollCalc from '@/components/payroll/payrollCalculations';
import { PayrollDetails, PaymentHistoryItem, AbsenceDetail } from '@/components/payroll/types';

// Types for raw data fetched from Supabase
export interface RawAllocation {
  id: string;
  event_id: string;
  personnel_id: string;
  division_id?: string;
  team_id?: string;
  work_days: string[];
  event_specific_cache?: number | null;
  event_specific_overtime?: number | null;
  function_name?: string;
  created_at?: string;
  events?: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  personnel?: {
    id: string;
    name: string;
    type: string;
    event_cache?: number;
    monthly_salary?: number;
    overtime_rate?: number;
  };
}

export interface RawWorkLog {
  id: string;
  event_id: string;
  employee_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours: number;
  total_pay?: number;
  team_id?: string;
  created_at?: string;
  attendance_status?: 'present' | 'absent' | 'pending';
  logged_by_id?: string;
  notes?: string;
}

export interface RawPayrollClosing {
  id: string;
  event_id: string;
  personnel_id: string;
  total_amount_paid: number;
  paid_at: string;
  paid_by_id?: string;
  team_id?: string;
  notes?: string;
  created_at: string;
}

export interface RawAbsence {
  id: string;
  assignment_id?: string; // Tornar opcional pois work_records não tem assignment_id direto
  team_id?: string;
  work_date: string;
  notes?: string;
  logged_by_id?: string;
  created_at: string;
  personnel_allocations?: {
    event_id: string;
  };
  employee_id?: string; // Adicionar para facilitar mapeamento
}

export interface RawPersonnelPayment {
  id: string;
  amount: number;
  paid_at: string;
  notes?: string;
  created_at: string;
  personnel_id: string;
  related_events?: string[];
  payment_status?: string;
  team_id?: string;
}

export interface TeamOvertimeConfig {
  default_convert_overtime_to_daily: boolean;
  default_overtime_threshold_hours: number;
}

type DivisionLookup = {
  id: string;
  name: string;
  event_id: string;
};

type DivisionsResult = {
  data: DivisionLookup[] | null;
  error: unknown | null;
};

/**
 * Service to centralize payroll data fetching and calculation.
 * Implements the Single Source of Truth for payment status.
 */
export const payrollDataService = {
  /**
   * Fetches and calculates payroll for a specific event
   */
  async getEventPayroll(
    eventId: string,
    teamConfig?: TeamOvertimeConfig,
    existingPersonnel?: any[],
    existingDivisions?: DivisionLookup[]
  ) {
    console.log('[PayrollService] Fetching data for event:', eventId);

    const divisionsPromise: Promise<DivisionsResult> = existingDivisions && existingDivisions.length > 0
      ? Promise.resolve({ data: existingDivisions.filter(d => d.event_id === eventId), error: null })
      : (supabase
          .from('event_divisions')
          .select('id, name, event_id')
          .eq('event_id', eventId) as unknown as Promise<DivisionsResult>);

    const [allocationsData, workLogsData, closingsData, paymentsData, divisionsData] = await Promise.all([
      supabase
        .from('personnel_allocations')
        .select('id, event_id, personnel_id, division_id, team_id, work_days, event_specific_cache, event_specific_overtime, function_name, created_at')
        .eq('event_id', eventId),
      supabase
        .from('work_records')
        .select('id, event_id, employee_id, work_date, hours_worked, overtime_hours, total_pay, team_id, created_at, attendance_status, logged_by_id, notes')
        .eq('event_id', eventId),
      supabase
        .from('payroll_closings')
        .select('id, event_id, personnel_id, team_id, total_amount_paid, paid_at, paid_by_id, notes, created_at')
        .eq('event_id', eventId),
      supabase
        .from('personnel_payments')
        .select('id, amount, paid_at, notes, created_at, personnel_id, related_events')
        .eq('payment_status', 'paid')
        .contains('related_events', [eventId]),
      divisionsPromise
    ]);
    
    const personnelIds = [...new Set((allocationsData.data || []).map(a => a.personnel_id))];
    
    const personnelMap = new Map<string, any>();
    
    if (existingPersonnel && existingPersonnel.length > 0) {
      existingPersonnel.forEach(p => personnelMap.set(p.id, p));
    } else if (personnelIds.length > 0) {
      const { data: personnelData } = await supabase
        .from('personnel')
        .select('id, name, type, event_cache, monthly_salary, overtime_rate, cpf, rg, mothers_name, birth_date, pix_key_encrypted')
        .in('id', personnelIds);
        
      personnelData?.forEach(p => personnelMap.set(p.id, p));
    }

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

    const rawData = {
      allocations: (allocationsData.data || []) as RawAllocation[],
      workLogs: allWorkLogs,
      closings: (closingsData.data || []) as RawPayrollClosing[],
      absences: derivedAbsences,
      payments: (paymentsData.data || []) as RawPersonnelPayment[]
    };

    const divisionLookup = (divisionsData.data || []) as DivisionLookup[];

    return {
      details: this.calculatePayrollDetails(rawData, personnelMap, teamConfig, eventId, divisionLookup),
      rawData // Return raw data as well because usePayrollQuery returns it
    };
  },

  /**
   * Fetches and calculates pending payments for the entire team
   */
  async getTeamPendingPayments(teamId: string, teamConfig?: TeamOvertimeConfig) {
    // Fetch allocations for relevant events
    const today = new Date().toISOString().split('T')[0];
    const { data: allocations, error: allocError } = await supabase
        .from('personnel_allocations')
        .select(`
          id,
          personnel_id,
          event_id,
          work_days,
          event_specific_cache,
          event_specific_overtime,
          events!inner (
            id,
            name,
            start_date,
            end_date,
            status,
            team_id
          ),
          personnel (
            id,
            name,
            type,
            event_cache,
            monthly_salary,
            overtime_rate
          )
        `)
        .eq('events.team_id', teamId)
        .neq('events.status', 'cancelado');

    if (allocError) throw allocError;
    if (!allocations || allocations.length === 0) return [];

    // Client-side filter to avoid PostgREST OR on joined columns (causes 400)
    // FIX: Expanded logic to include ongoing events (started but not finished)
    const filteredAllocations = allocations.filter(a => {
      const event = (a as any).events;
      if (!event) return false;

      const status = event.status;
      const startDate = event.start_date;
      
      // Include if:
      // 1. Explicitly marked as concluded/pending payment
      // 2. OR has already started (covers ongoing events and past events not yet marked as concluded)
      
      const isConcluded = status === 'concluido' || status === 'concluido_pagamento_pendente';
      const hasStarted = startDate && startDate <= today;

      return isConcluded || hasStarted;
    });

    if (filteredAllocations.length === 0) return [];

    const eventIds = [...new Set(filteredAllocations.map(a => a.event_id))];
    const allocationIds = filteredAllocations.map(a => a.id);

    // Fetch related data in parallel
    const [closingsData, paymentsData, workLogsData] = await Promise.all([
      supabase
        .from('payroll_closings')
        .select('id, event_id, personnel_id, total_amount_paid, paid_at, paid_by_id, notes, created_at, team_id')
        .eq('team_id', teamId),
      supabase
        .from('personnel_payments')
        .select('id, amount, paid_at, notes, created_at, personnel_id, related_events')
        .eq('team_id', teamId)
        .eq('payment_status', 'paid'),
      supabase
        .from('work_records')
        .select('id, event_id, employee_id, work_date, hours_worked, overtime_hours, total_pay, team_id, created_at, attendance_status, logged_by_id, notes')
        .in('event_id', eventIds)
    ]);

    const allWorkLogs = (workLogsData.data || []) as RawWorkLog[];
    
    // Derive absences from work_records to avoid querying deprecated 'absences' table
    const allAbsences = allWorkLogs
      .filter(log => log.attendance_status === 'absent')
      .map(log => ({
        id: log.id,
        work_date: log.work_date,
        notes: log.notes,
        logged_by_id: log.logged_by_id,
        created_at: log.created_at || new Date().toISOString(),
        team_id: log.team_id,
        employee_id: log.employee_id,
        personnel_allocations: { event_id: log.event_id }
      })) as RawAbsence[];

    // Prepare Personnel Map from the joined query
    const personnelMap = new Map<string, any>();
    filteredAllocations.forEach(a => {
        if (a.personnel) {
            personnelMap.set(a.personnel.id, a.personnel);
        }
    });

    // We need to group by Event to calculate correctly per event
    const results = [];
    
    // Group allocations by event
    const allocationsByEvent = new Map<string, RawAllocation[]>();
    filteredAllocations.forEach(a => {
        const list = allocationsByEvent.get(a.event_id) || [];
        list.push(a as any as RawAllocation); // Cast because of the joined structure
        allocationsByEvent.set(a.event_id, list);
    });

    for (const [eventId, eventAllocations] of allocationsByEvent) {
        // Filter data for this event
        const eventRawData = {
            allocations: eventAllocations,
            workLogs: allWorkLogs.filter(l => l.event_id === eventId),
            closings: (closingsData.data || []).filter(c => c.event_id === eventId) as RawPayrollClosing[],
            absences: allAbsences.filter(a => a.personnel_allocations?.event_id === eventId),
            // Payments are trickier because they can be multi-event. We pass all and let the calculator filter.
            payments: (paymentsData.data || []) as RawPersonnelPayment[]
        };

        const details = this.calculatePayrollDetails(eventRawData, personnelMap, teamConfig, eventId);
        
        // Filter only those with pending amount
        const pendingDetails = details.filter(d => d.pendingAmount > 1.0); // Tolerance
        
        // Enrich with event info
        const eventInfo = (eventAllocations[0] as any).events;
        
        results.push(...pendingDetails.map(d => ({
            personnelId: d.personnelId,
            personnelName: d.personName,
            eventId,
            eventName: eventInfo?.name || '',
            eventStartDate: eventInfo?.start_date || '',
            eventEndDate: eventInfo?.end_date || '',
            pendingAmount: d.pendingAmount,
            totalAmount: d.totalPay,
            paidAmount: d.paidAmount
        })));
    }

    return results;
  },

  /**
   * Core logic to calculate payroll details from raw data
   */
  calculatePayrollDetails(
    data: {
      allocations: RawAllocation[];
      workLogs: RawWorkLog[];
      closings: RawPayrollClosing[];
      absences: RawAbsence[];
      payments: RawPersonnelPayment[];
    },
    personnelMap: Map<string, any>,
    teamConfig: TeamOvertimeConfig | undefined,
    eventId: string,
    divisions?: DivisionLookup[]
  ): PayrollDetails[] {
    const teamOvertimeConfig = {
      default_convert_overtime_to_daily: teamConfig?.default_convert_overtime_to_daily ?? false,
      default_overtime_threshold_hours: teamConfig?.default_overtime_threshold_hours ?? 8,
    };

    // Group allocations by personnel_id
    const groupedAllocations = data.allocations.reduce((acc, allocation) => {
      const personnelId = allocation.personnel_id;
      if (!acc[personnelId]) {
        acc[personnelId] = [];
      }
      acc[personnelId].push(allocation);
      return acc;
    }, {} as Record<string, RawAllocation[]>);

    const divisionNameById = new Map<string, string>();
    (divisions || []).forEach(d => {
      if (d?.id && d?.name) divisionNameById.set(d.id, d.name);
    });

    return Object.entries(groupedAllocations).map(([personnelId, allocations]) => {
      const person = personnelMap.get(personnelId);
      if (!person) return null;

      // Filter Fixed Employees (usually paid monthly, not per event)
      if (person.type === 'fixo') return null;

      // Filter logs and absences for this person
      const personWorkLogs = data.workLogs.filter(log => log.employee_id === personnelId);
      
      // Filter absences based on employee_id (from work_records)
      const personAbsences = data.absences.filter(absence => {
        if (absence.employee_id) {
          return absence.employee_id === personnelId;
        }
        // Fallback for legacy absences structure (should not be hit if fully migrated)
        return false;
      });

      // --- UNIFIED PAYMENT LOGIC ---
      
      // 1. Historical Payments (payroll_closings)
      const historicalPayments = data.closings.filter(
        closing => closing.personnel_id === personnelId
      ).map(closing => ({
        id: closing.id,
        personnel_id: closing.personnel_id,
        total_amount_paid: Number(closing.total_amount_paid),
        paid_at: closing.paid_at,
        created_at: closing.created_at,
        notes: closing.notes
      })) as PayrollCalc.PaymentRecord[];

      // 2. New Payments (personnel_payments)
      const newPayments = data.payments.filter(
        payment => {
            // Check if this payment belongs to this person
            if (payment.personnel_id !== personnelId) return false;
            
            // Check if this payment is related to this event
            const relatedEvents = this.parseRelatedEvents(payment.related_events);
            return relatedEvents.includes(eventId);
        }
      ).map(payment => {
        // Distribute amount if multiple events
        const events = this.parseRelatedEvents(payment.related_events);
        const amount = events.length > 0 ? Number(payment.amount) / events.length : Number(payment.amount);
        
        return {
          id: payment.id,
          personnel_id: payment.personnel_id,
          total_amount_paid: amount,
          paid_at: payment.paid_at,
          created_at: payment.created_at,
          notes: payment.notes
        };
      }) as PayrollCalc.PaymentRecord[];

      const paymentRecords = [...historicalPayments, ...newPayments];

      // Cast to PayrollCalc types
      const allocationsData = allocations as unknown as PayrollCalc.AllocationData[];
      const workLogsData = personWorkLogs as unknown as PayrollCalc.WorkLogData[];
      const absencesData = personAbsences as unknown as PayrollCalc.AbsenceData[];

      // --- CALCULATIONS ---
      const workDaysList = PayrollCalc.calculateWorkedDaysList(allocationsData, workLogsData);
      const totalWorkDays = workDaysList.length;
      const regularHours = PayrollCalc.calculateTotalRegularHours(workLogsData);
      const baseSalary = PayrollCalc.calculateBaseSalary(person);
      const cachePay = PayrollCalc.calculateCachePay(allocationsData, person, workLogsData);
      const cacheSummary = PayrollCalc.calculateCacheRateSummary(allocationsData, person, workLogsData);
      
      const overtimeRate = PayrollCalc.getOvertimeRate(allocationsData, person);
      const dailyCache = cacheSummary.avg;

      const overtimeDates = Array.from(
        new Set(
          workLogsData
            .map(l => l.work_date)
            .filter((v): v is string => typeof v === 'string' && !!v.trim())
        )
      );
      const dailyCacheByDate = PayrollCalc.getDailyCacheRatesByDate(allocationsData, person, overtimeDates);
      
      const overtimeResult = PayrollCalc.calculateOvertimePayWithDailyConversion(
        workLogsData,
        {
          threshold: teamOvertimeConfig.default_overtime_threshold_hours,
          convertEnabled: teamOvertimeConfig.default_convert_overtime_to_daily,
          dailyCache,
          dailyCacheByDate,
          overtimeRate
        }
      );
      
      const totalPay = baseSalary + cachePay + overtimeResult.payAmount;
      const totalPaidAmount = PayrollCalc.calculateTotalPaid(paymentRecords);
      const pendingAmount = PayrollCalc.calculatePendingAmount(totalPay, totalPaidAmount);
      const isPaid = PayrollCalc.isPaymentComplete(totalPaidAmount, pendingAmount);

      const absenceDetails = PayrollCalc.processAbsences(absencesData);
      const paymentHistory = PayrollCalc.processPaymentHistory(paymentRecords);
      const hasEventCache = PayrollCalc.hasEventSpecificCache(allocationsData);

      const roleNames = Array.from(
        new Set(
          allocations
            .map(a => (a.function_name || '').trim())
            .filter(v => !!v)
        )
      );

      const divisionNames = Array.from(
        new Set(
          allocations
            .map(a => a.division_id)
            .filter((v): v is string => !!v)
            .map(divisionId => divisionNameById.get(divisionId) || '')
            .filter(v => !!v)
        )
      );

      return {
        id: allocations[0].id,
        personnelId: person.id,
        personName: person.name,
        personType: person.type,
        workDays: totalWorkDays,
        workDaysList,
        regularHours,
        totalOvertimeHours: overtimeResult.displayHours,
        baseSalary,
        cachePay,
        overtimePay: overtimeResult.payAmount,
        totalPay,
        cacheRate: person.event_cache || 0,
        overtimeRate: overtimeRate,
        paid: isPaid,
        paidAmount: totalPaidAmount,
        pendingAmount,
        paymentHistory,
        absencesCount: absencesData.length,
        absences: absenceDetails,
        hasEventSpecificCache: hasEventCache,
        eventSpecificCacheRate: cacheSummary.avg,
        cacheDailyRateAvg: cacheSummary.avg,
        cacheDailyRateMin: cacheSummary.min,
        cacheDailyRateMax: cacheSummary.max,
        cacheDailyRateIsVariable: cacheSummary.isVariable,
        overtimeConversionApplied: overtimeResult.conversionApplied,
        overtimeCachesUsed: overtimeResult.dailyCachesUsed,
        overtimeRemainingHours: overtimeResult.remainingHours,
        rg: person.rg,
        cpf: person.cpf,
        birthDate: person.birth_date,
        mothersName: person.mothers_name,
        eventRole: roleNames.length ? roleNames.join(', ') : undefined,
        divisions: divisionNames.length ? divisionNames.join(', ') : undefined,
        pixKey: person.pix_key_encrypted // Using the same field name convention as types
      };
    }).filter(Boolean) as PayrollDetails[];
  },

  /**
   * Helper to parse related_events (which can be string or array)
   */
  parseRelatedEvents(relatedEvents: any): string[] {
    if (!relatedEvents) return [];
    if (Array.isArray(relatedEvents)) return relatedEvents;
    if (typeof relatedEvents === 'string') {
        try {
            const parsed = JSON.parse(relatedEvents);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
  }
};
