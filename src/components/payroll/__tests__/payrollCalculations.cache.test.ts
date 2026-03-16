// path: src/components/payroll/__tests__/payrollCalculations.cache.test.ts

import { describe, it, expect } from 'vitest';
import {
  calculateCachePay,
  calculateCacheRateSummary,
  calculateOvertimePayWithDailyConversion,
  getDailyCacheRate,
  getDailyCacheRatesByDate,
  type AllocationData,
  type PersonnelData,
  type WorkLogData,
} from '../payrollCalculations';

describe('Payroll Calculations - Cache por dia/alocação', () => {
  it('soma cachê dia a dia quando há taxas diferentes no mesmo evento', () => {
    const person: PersonnelData = {
      id: 'p1',
      name: 'Pessoa 1',
      type: 'freelancer',
      event_cache: 100,
    };

    const allocations: AllocationData[] = [
      {
        id: 'a1',
        personnel_id: 'p1',
        event_id: 'e1',
        work_days: ['2026-01-01', '2026-01-02'],
        event_specific_cache: 200,
      },
      {
        id: 'a2',
        personnel_id: 'p1',
        event_id: 'e1',
        work_days: ['2026-01-03'],
        event_specific_cache: 400,
      },
    ];

    expect(calculateCachePay(allocations, person, [])).toBe(800);

    const summary = calculateCacheRateSummary(allocations, person, []);
    expect(summary.min).toBe(200);
    expect(summary.max).toBe(400);
    expect(summary.isVariable).toBe(true);
    expect(summary.avg).toBeCloseTo((200 + 200 + 400) / 3, 6);

    expect(getDailyCacheRate(allocations, person)).toBeCloseTo(summary.avg, 6);
  });

  it('aplica conversão de HE usando cachê do dia quando fornecido por data', () => {
    const person: PersonnelData = {
      id: 'p1',
      name: 'Pessoa 1',
      type: 'freelancer',
      event_cache: 100,
      overtime_rate: 10,
    };

    const allocations: AllocationData[] = [
      {
        id: 'a1',
        personnel_id: 'p1',
        event_id: 'e1',
        work_days: ['2026-01-01', '2026-01-02'],
        event_specific_cache: 200,
      },
      {
        id: 'a2',
        personnel_id: 'p1',
        event_id: 'e1',
        work_days: ['2026-01-03'],
        event_specific_cache: 400,
      },
    ];

    const workLogs: WorkLogData[] = [
      {
        id: 'w1',
        employee_id: 'p1',
        event_id: 'e1',
        hours_worked: 0,
        overtime_hours: 9,
        work_date: '2026-01-03',
        attendance_status: 'present',
      },
    ];

    const summary = calculateCacheRateSummary(allocations, person, []);
    const dailyCacheByDate = getDailyCacheRatesByDate(allocations, person, ['2026-01-03']);

    const overtime = calculateOvertimePayWithDailyConversion(workLogs, {
      threshold: 4,
      convertEnabled: true,
      dailyCache: summary.avg,
      dailyCacheByDate,
      overtimeRate: 10,
    });

    expect(overtime.dailyCachesUsed).toBe(1);
    expect(overtime.remainingHours).toBe(1);
    expect(overtime.payAmount).toBe(410);
  });
});

