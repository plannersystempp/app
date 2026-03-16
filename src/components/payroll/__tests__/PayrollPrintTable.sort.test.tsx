// @vitest-environment node
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PayrollPrintTable } from '../PayrollPrintTable';

describe('PayrollPrintTable - ordenação alfabética', () => {
  it('ordena profissionais por nome (A→Z) usando pt-BR', () => {
    const details = [
      {
        personName: 'Bruno Souza',
        personType: 'freelancer',
        workDays: ['2025-11-01'],
        totalOvertimeHours: 1,
        cachePay: 300,
        overtimePay: 30,
        totalPay: 330,
        pendingAmount: 330,
      },
      {
        personName: 'Álvaro Lima',
        personType: 'pj',
        workDays: ['2025-11-01','2025-11-02'],
        totalOvertimeHours: 0,
        cachePay: 600,
        overtimePay: 0,
        totalPay: 600,
        pendingAmount: 600,
      },
      {
        personName: 'Ana Paula',
        personType: 'clt',
        workDays: ['2025-11-02'],
        totalOvertimeHours: 2,
        cachePay: 400,
        overtimePay: 60,
        totalPay: 460,
        pendingAmount: 460,
      },
    ];

    const html = renderToStaticMarkup(
      <PayrollPrintTable teamName="Equipe Y" event={{ name: 'Teste' }} details={details as any} showPartialPaid />
    );

    // Deve aparecer em ordem: Álvaro Lima, Ana Paula, Bruno Souza
    const idxAna = html.indexOf('Ana Paula');
    const idxAlvaro = html.indexOf('Álvaro Lima');
    const idxBruno = html.indexOf('Bruno Souza');

    expect(idxAna).toBeGreaterThanOrEqual(0);
    expect(idxAlvaro).toBeGreaterThanOrEqual(0);
    expect(idxBruno).toBeGreaterThanOrEqual(0);
    expect(idxAlvaro).toBeLessThan(idxAna);
    expect(idxAna).toBeLessThan(idxBruno);
  });
});
