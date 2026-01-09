import { describe, it, expect } from 'vitest';
import { getEventsInProgress, getUpcomingPayments, computeDashboardKpis, EventItem, getAverageEventsPerWeek, getAverageEventsPerMonth, getAverageEventsPerYear } from '../dashboardData';

const baseEvents: EventItem[] = [
  { id: 'e1', status: 'em_andamento', start_date: '2025-11-01', end_date: '2025-11-10' },
  { id: 'e2', status: 'planejado', start_date: '2025-11-20', end_date: '2025-11-22' },
  { id: 'e3', status: 'cancelado', start_date: '2025-10-01', end_date: '2025-10-05' },
  { id: 'e4', status: 'concluido', start_date: '2025-10-10', end_date: '2025-10-12', payment_due_date: '2025-11-05' },
  { id: 'e5', status: 'concluido_pagamento_pendente', start_date: '2025-10-15', end_date: '2025-10-16' },
];

describe('getEventsInProgress', () => {
  it('retorna eventos em andamento na data atual', () => {
    const now = new Date('2025-11-05T10:00:00');
    const res = getEventsInProgress(baseEvents, now);
    expect(res.map(e => e.id)).toEqual(['e1']);
  });

  it('ignora eventos sem start/end date', () => {
    const events: EventItem[] = [
      { id: 'a', status: 'em_andamento', start_date: '2025-11-01' },
      { id: 'b', status: 'em_andamento', end_date: '2025-11-12' },
    ];
    const res = getEventsInProgress(events, new Date('2025-11-05'));
    expect(res.length).toBe(0);
  });
});

describe('getUpcomingPayments', () => {
  it('exclui cancelados e eventos com pagamentos completos', () => {
    const completed = ['e4'];
    const res = getUpcomingPayments(baseEvents, completed, new Date('2025-11-01'));
    // e3 cancelado deve sair, e4 completo deve sair, e5 entra sempre, e1 pode entrar se end_date <= D+15 (10/11)
    expect(res.map(e => e.id)).toContain('e5');
    expect(res.find(e => e.id === 'e3')).toBeUndefined();
    expect(res.find(e => e.id === 'e4')).toBeUndefined();
  });

  it('inclui sempre concluiu_pagamento_pendente e ordena corretamente', () => {
    const events: EventItem[] = [
      { id: 'x1', status: 'concluido', end_date: '2025-11-04' },
      { id: 'x2', status: 'concluido_pagamento_pendente', end_date: '2025-10-01' },
      { id: 'x3', status: 'concluido', payment_due_date: '2025-11-03' },
    ];
    const res = getUpcomingPayments(events, [], new Date('2025-11-01'));
    expect(res[0].id).toBe('x2'); // pendente primeiro
    // Depois por dueDate/endDate ascendente -> x3 (03/11) antes de x1 (04/11)
    expect(res.slice(1).map(e => e.id)).toEqual(['x3', 'x1']);
  });

  it('inclui atrasados (vencidos) dentro da janela', () => {
    const events: EventItem[] = [
      { id: 'y1', status: 'concluido', payment_due_date: '2025-10-20' },
      { id: 'y2', status: 'concluido', payment_due_date: '2025-11-10' },
    ];
    const res = getUpcomingPayments(events, [], new Date('2025-11-01'));
    expect(res.map(e => e.id)).toEqual(['y1', 'y2']);
  });
});

describe('computeDashboardKpis', () => {
  it('calcula KPIs básicos', () => {
    const res = computeDashboardKpis({
      events: baseEvents,
      personnelCount: 10,
      functionsCount: 5,
    });
    expect(res.eventsCount).toBe(baseEvents.length);
    expect(res.personnelCount).toBe(10);
    expect(res.functionsCount).toBe(5);
  });
});

describe('event averages', () => {
  it('calcula média por mês', () => {
    const events: EventItem[] = [
      { id: 'm1', status: 'planejado', start_date: '2025-01-10' },
      { id: 'm2', status: 'planejado', start_date: '2025-01-20' },
      { id: 'm3', status: 'planejado', start_date: '2025-02-05' },
    ];
    const avg = getAverageEventsPerMonth(events);
    expect(avg).toBe(1.5);
  });

  it('calcula média por semana', () => {
    const events: EventItem[] = [
      { id: 'w1', status: 'planejado', start_date: '2025-01-05' },
      { id: 'w2', status: 'planejado', start_date: '2025-01-06' },
      { id: 'w3', status: 'planejado', start_date: '2025-01-15' },
    ];
    const avg = getAverageEventsPerWeek(events);
    expect(avg).toBeGreaterThan(1);
  });

  it('calcula média por ano', () => {
    const events: EventItem[] = [
      { id: 'y1', status: 'planejado', start_date: '2024-12-31' },
      { id: 'y2', status: 'planejado', start_date: '2025-01-01' },
      { id: 'y3', status: 'planejado', start_date: '2025-06-01' },
    ];
    const avg = getAverageEventsPerYear(events);
    expect(avg).toBe(1.5);
  });
});
