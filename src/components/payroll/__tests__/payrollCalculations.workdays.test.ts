import { describe, it, expect } from 'vitest';
import {
  calculateWorkedDays,
  calculateWorkedDaysList,
  type AllocationData,
  type WorkLogData,
} from '../payrollCalculations';

describe('Payroll Calculations - Workdays', () => {
  it('deduplica e ordena dias de trabalho a partir das alocações', () => {
    const allocations: AllocationData[] = [
      {
        id: 'a1',
        personnel_id: 'p1',
        event_id: 'e1',
        work_days: ['2026-02-05', '2026-02-04'],
      },
      {
        id: 'a2',
        personnel_id: 'p1',
        event_id: 'e1',
        work_days: ['2026-02-04', '2026-02-07'],
      },
    ];

    const list = calculateWorkedDaysList(allocations, []);
    expect(list).toEqual(['2026-02-04', '2026-02-05', '2026-02-07']);
    expect(calculateWorkedDays(allocations, [])).toBe(3);
  });

  it('remove dias marcados como falta (attendance_status=absent) nos workLogs', () => {
    const allocations: AllocationData[] = [
      {
        id: 'a1',
        personnel_id: 'p1',
        event_id: 'e1',
        work_days: ['2026-02-04', '2026-02-05', '2026-02-06'],
      },
    ];

    const workLogs: WorkLogData[] = [
      {
        id: 'w1',
        employee_id: 'p1',
        event_id: 'e1',
        hours_worked: 0,
        overtime_hours: 0,
        work_date: '2026-02-05',
        attendance_status: 'absent',
      },
    ];

    const list = calculateWorkedDaysList(allocations, workLogs);
    expect(list).toEqual(['2026-02-04', '2026-02-06']);
    expect(calculateWorkedDays(allocations, workLogs)).toBe(2);
  });
});

