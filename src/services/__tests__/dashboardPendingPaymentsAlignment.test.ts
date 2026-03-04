// path: src/services/__tests__/dashboardPendingPaymentsAlignment.test.ts

import {
  calculateCachePay,
  calculateOvertimePayWithDailyConversion,
  calculatePendingAmount,
  calculateTotalPaid,
  getDailyCacheRate,
  getOvertimeRate,
  isPaymentComplete,
  type AllocationData,
  type PaymentRecord,
  type PersonnelData,
  type WorkLogData,
} from '@/components/payroll/payrollCalculations';

describe('Dashboard: consistência de pago vs pendente', () => {
  it('considera cachê por função, conversão diária e faltas ao decidir se está pago', () => {
    const person: PersonnelData = {
      id: 'p1',
      name: 'Pessoa 1',
      type: 'freelancer',
      event_cache: 200,
      overtime_rate: 10,
      functions: [
        {
          id: 'f1',
          name: 'Garçom',
          custom_cache: 300,
          custom_overtime: 30,
        },
      ],
    };

    const allocations: AllocationData[] = [
      {
        id: 'a1',
        personnel_id: 'p1',
        event_id: 'e1',
        work_days: ['2026-01-01', '2026-01-02'],
        event_specific_cache: null,
        function_id: 'f1',
        function_name: 'Garçom',
      },
    ];

    const workLogs: WorkLogData[] = [
      {
        id: 'w_absent',
        employee_id: 'p1',
        event_id: 'e1',
        hours_worked: 0,
        overtime_hours: 0,
        work_date: '2026-01-02',
        attendance_status: 'absent',
      },
      {
        id: 'w_overtime',
        employee_id: 'p1',
        event_id: 'e1',
        hours_worked: 0,
        overtime_hours: 9,
        work_date: '2026-01-01',
        attendance_status: 'present',
      },
    ];

    const dailyCache = getDailyCacheRate(allocations, person);
    const overtimeRate = getOvertimeRate(allocations, person);
    const cachePay = calculateCachePay(allocations, person, workLogs);
    const overtime = calculateOvertimePayWithDailyConversion(workLogs, {
      threshold: 4,
      convertEnabled: true,
      dailyCache,
      overtimeRate,
    });

    expect(dailyCache).toBe(300);
    expect(overtimeRate).toBe(30);
    expect(cachePay).toBe(300);
    expect(overtime.payAmount).toBe(330);

    const totalPay = cachePay + overtime.payAmount;

    const payments: PaymentRecord[] = [
      {
        id: 'pay1',
        personnel_id: 'p1',
        total_amount_paid: totalPay,
        paid_at: '2026-01-03T10:00:00.000Z',
      },
    ];

    const totalPaid = calculateTotalPaid(payments);
    const pending = calculatePendingAmount(totalPay, totalPaid);
    const isPaid = isPaymentComplete(totalPaid, pending);

    expect(pending).toBe(0);
    expect(isPaid).toBe(true);
  });
});

