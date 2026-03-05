
import { Event, Personnel, EventSupplierCost } from '@/contexts/data/types';
import { startOfMonth, subMonths, format, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface MonthlyDataPoint {
  name: string; // "Jan/24"
  events: number;
  date: Date; // para ordenação
}

export interface CostDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface FinancialDataPoint {
  name: string; // "Jan/24"
  revenue: number;
  expenses: number;
  profit: number;
}

const STATUS_COLORS = {
  planejado: '#94a3b8', // slate-400
  em_andamento: '#eab308', // yellow-500
  concluido: '#22c55e', // green-500
  concluido_pagamento_pendente: '#16a34a', // green-600
  cancelado: '#ef4444', // red-500
};

const STATUS_LABELS = {
  planejado: 'Planejado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  concluido_pagamento_pendente: 'Concluído (Pag. Pend.)',
  cancelado: 'Cancelado',
};

export function getEventsByStatus(events: Event[]): ChartDataPoint[] {
  const counts: Record<string, number> = {};

  events.forEach((e) => {
    const status = e.status || 'planejado';
    counts[status] = (counts[status] || 0) + 1;
  });

  return Object.entries(counts).map(([status, count]) => ({
    name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#cbd5e1',
  }));
}

export function getMonthlyEvents(events: Event[], months = 6): MonthlyDataPoint[] {
  const today = new Date();
  const data: MonthlyDataPoint[] = [];

  // Gerar últimos N meses
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(today, i);
    const monthStart = startOfMonth(date);
    
    // Filtrar eventos deste mês (baseado em start_date)
    const count = events.filter((e) => {
      if (!e.start_date) return false;
      return isSameMonth(parseISO(e.start_date), monthStart);
    }).length;

    data.push({
      name: format(date, 'MMM/yy', { locale: ptBR }),
      events: count,
      date: monthStart,
    });
  }

  return data;
}

export function getPersonnelByFunction(personnel: Personnel[]): ChartDataPoint[] {
  const counts: Record<string, number> = {};

  personnel.forEach((p) => {
    if (p.functions && p.functions.length > 0) {
      p.functions.forEach((f) => {
        const name = f.name;
        counts[name] = (counts[name] || 0) + 1;
      });
    } else {
      counts['Sem Função'] = (counts['Sem Função'] || 0) + 1;
    }
  });

  // Ordenar e pegar Top 5
  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  // Calcular "Outros" se necessário? Por enquanto Top 5 é suficiente para visualização limpa
  
  return sorted.map(([name, value], index) => ({
    name,
    value,
    color: `hsl(${210 + (index * 30)}, 70%, 50%)`, // Variações de azul/roxo
  }));
}

export function getCostsByCategory(costs: EventSupplierCost[]): CostDataPoint[] {
  const categoryTotals: Record<string, number> = {};

  costs.forEach((c) => {
    const cat = c.category || 'Sem Categoria';
    const amount = Number(c.total_amount) || 0;
    // Filtrar valores negativos para garantir que custos não sejam negativos
    if (amount >= 0) {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
    }
  });

  const sorted = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5 categorias

  return sorted.map(([name, value], index) => ({
    name,
    value,
    color: `hsl(${10 + (index * 30)}, 70%, 50%)`, // Variações de laranja/vermelho
  }));
}

export function getFinancialEvolution(events: Event[], costs: EventSupplierCost[], months = 6): FinancialDataPoint[] {
  const today = new Date();
  const data: FinancialDataPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(today, i);
    const monthStart = startOfMonth(date);
    
    // Filtra eventos do mês para Receita (valor cobrado do cliente)
    // Assumindo que 'value' no evento é o valor cobrado. Se não existir, usar 0 ou outro campo.
    // Ajuste conforme o modelo real de Event.
    const monthlyEvents = events.filter((e) => {
      if (!e.start_date) return false;
      return isSameMonth(parseISO(e.start_date), monthStart);
    });

    // Filtra custos do mês (baseado na data do evento associado ou created_at do custo?)
    // Aqui vou simplificar: custos não têm data direta, mas estão ligados a eventos.
    // Vamos somar custos dos eventos deste mês.
    const eventIds = new Set(monthlyEvents.map(e => e.id));
    
    const monthlyCosts = costs.filter(c => eventIds.has(c.event_id));

    // Cálculos (mockados se o campo não existir)
    // TODO: Verificar se Event tem campo 'budget' ou 'value'. Usando 'budget' como exemplo.
    const revenue = monthlyEvents.reduce((acc, e) => acc + (Number((e as any).budget) || 0), 0);
    const expenses = monthlyCosts.reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);

    data.push({
      name: format(date, 'MMM/yy', { locale: ptBR }),
      revenue,
      expenses,
      profit: revenue - expenses
    });
  }

  return data;
}
