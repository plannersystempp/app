// Utilidades puras para derivação de dados do Dashboard
// Regra: manter funções puras e testáveis, sem dependência de contexts

export interface EventItem {
  id: string;
  name?: string;
  status: string;
  start_date?: string; // ISO date (YYYY-MM-DD)
  end_date?: string;   // ISO date (YYYY-MM-DD)
  payment_due_date?: string; // ISO date (YYYY-MM-DD)
}

// Eventos em andamento: start_date <= now <= end_date
export function getEventsInProgress(events: EventItem[], now: Date = new Date()): EventItem[] {
  return events.filter((event) => {
    if (!event.start_date || !event.end_date) return false;
    const startDate = new Date(`${event.start_date}T00:00:00`);
    const endDate = new Date(`${event.end_date}T23:59:59.999`);
    return startDate <= now && endDate >= now;
  });
}

// Pagamentos próximos: D+0 a D+15, exclui cancelados e eventos com pagamentos completos
// Inclui sempre status 'concluido_pagamento_pendente'
// Ordena com 'concluido_pagamento_pendente' primeiro e depois por data de vencimento
export function getUpcomingPayments(
  events: EventItem[],
  completedPaymentEventIds: string[],
  startDate: Date = new Date(),
  endDate: Date | null = null,
  noDateLimit: boolean = false
): EventItem[] {
  const today = new Date(startDate);
  today.setHours(0, 0, 0, 0);

  const limit = endDate ? new Date(endDate) : new Date(today);
  if (!endDate) {
    limit.setDate(today.getDate() + 15);
  }
  limit.setHours(23, 59, 59, 999);

  const filtered = events.filter((event) => {
    // Excluir cancelados
    if (event.status === 'cancelado') return false;

    // Excluir eventos com pagamentos completos
    if (completedPaymentEventIds.includes(event.id)) return false;

    // Incluir sempre concluido_pagamento_pendente
    if (event.status === 'concluido_pagamento_pendente') return true;

    // Se noDateLimit = true, incluir todos os pendentes sem filtro de data
    if (noDateLimit) return true;

    // Considerar data de vencimento ou fim do evento
    const dueDate = event.payment_due_date
      ? new Date(event.payment_due_date + 'T12:00:00')
      : event.end_date
      ? new Date(event.end_date + 'T12:00:00')
      : null;

    if (!dueDate) return false;

    // Incluir se vencimento <= limite (inclui atrasados)
    return dueDate <= limit;
  });

  return filtered.sort((a, b) => {
    const aPending = a.status === 'concluido_pagamento_pendente';
    const bPending = b.status === 'concluido_pagamento_pendente';
    if (aPending && !bPending) return -1;
    if (bPending && !aPending) return 1;

    const dateA = a.payment_due_date
      ? new Date(a.payment_due_date)
      : a.end_date
      ? new Date(a.end_date)
      : new Date('9999-12-31');
    const dateB = b.payment_due_date
      ? new Date(b.payment_due_date)
      : b.end_date
      ? new Date(b.end_date)
      : new Date('9999-12-31');
    return dateA.getTime() - dateB.getTime();
  });
}

export interface KpiInput {
  events: EventItem[];
  personnelCount: number;
  functionsCount: number;
}

export interface KpiOutput {
  eventsCount: number;
  personnelCount: number;
  functionsCount: number;
}

export function computeDashboardKpis(input: KpiInput): KpiOutput {
  return {
    eventsCount: input.events.length,
    personnelCount: input.personnelCount,
    functionsCount: input.functionsCount,
  };
}

export type PeriodKind = 'semana' | 'mes' | 'ano';

function pickEventDate(e: EventItem): Date | null {
  if (e.start_date) return new Date(e.start_date + 'T00:00:00');
  if (e.end_date) return new Date(e.end_date + 'T00:00:00');
  return null;
}

function getPeriodKey(d: Date, period: PeriodKind): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (period === 'ano') return `${y}`;
  if (period === 'mes') return `${y}-${String(m).padStart(2, '0')}`;
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}

function averageByPeriod(events: EventItem[], period: PeriodKind): number {
  let total = 0;
  const keys = new Set<string>();
  for (const e of events) {
    const d = pickEventDate(e);
    if (!d) continue;
    keys.add(getPeriodKey(d, period));
    total += 1;
  }
  const denom = keys.size;
  if (!denom) return 0;
  return Math.round((total / denom) * 10) / 10;
}

export function getAverageEventsPerWeek(events: EventItem[]): number {
  return averageByPeriod(events, 'semana');
}

export function getAverageEventsPerMonth(events: EventItem[]): number {
  return averageByPeriod(events, 'mes');
}

export function getAverageEventsPerYear(events: EventItem[]): number {
  return averageByPeriod(events, 'ano');
}
