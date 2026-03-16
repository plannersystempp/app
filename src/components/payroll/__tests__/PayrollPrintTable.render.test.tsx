// @vitest-environment node
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PayrollPrintTable } from '../PayrollPrintTable';

describe('PayrollPrintTable', () => {
  it('renderiza cabeçalho completo e colunas esperadas', () => {
    const event = {
      name: 'Evento Teste',
      location: 'São Paulo',
      start_date: '2025-11-01',
      end_date: '2025-11-02',
      setup_start_date: '2025-10-30',
      setup_end_date: '2025-10-31',
      payment_due_date: '2025-11-10',
      status: 'concluido'
    };

    const details = [
      {
        personName: 'João Silva',
        personType: 'freelancer',
        workDays: ['2025-11-01','2025-11-02'],
        totalOvertimeHours: 4,
        cachePay: 500,
        overtimePay: 120,
        totalPay: 620,
        paidAmount: 300,
        pendingAmount: 320,
      }
    ];

    const html = renderToStaticMarkup(
      <PayrollPrintTable teamName="Equipe X" event={event} details={details} showPartialPaid />
    );

    expect(html).toContain('by PlannerSystem');
    expect(html).toContain('Uso interno');
    expect(html).toContain('Evento:');
    expect(html).toContain('Local:');
    expect(html).toContain('H. Extras (h)');
    expect(html).toContain('Cachê dia (R$)');
    expect(html).toContain('Total (R$)');
    expect(html).toContain('João Silva');
  });
});
