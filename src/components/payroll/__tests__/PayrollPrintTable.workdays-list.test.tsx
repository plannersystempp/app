// @vitest-environment node
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PayrollPrintTable } from '../PayrollPrintTable';

describe('PayrollPrintTable - dias trabalhados com lista', () => {
  it('prioriza workDaysList e não cria range artificial pelo período do evento', () => {
    const details = [
      {
        personName: 'Amanda Marques Dantas',
        personType: 'freelancer',
        workDays: 4,
        workDaysList: ['2026-02-04', '2026-02-05', '2026-02-06', '2026-02-07'],
        totalOvertimeHours: 0,
        cachePay: 0,
        overtimePay: 0,
        totalPay: 0,
        pendingAmount: 0,
      },
    ];

    const html = renderToStaticMarkup(
      <PayrollPrintTable
        teamName="Equipe Z"
        event={{ name: 'Evento', start_date: '2026-02-02', end_date: '2026-02-07' }}
        details={details as any}
        showPartialPaid
      />
    );

    expect(html).toContain('Amanda Marques Dantas');
    expect(html).toContain('4 - 7');
    expect(html).not.toContain('2 - 5');
  });
});

