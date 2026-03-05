// Idioma: pt-BR
export type ForecastKind = 'evento' | 'avulso';

export interface ForecastItem {
  kind: ForecastKind;
  id: string;
  name: string;
  location?: string | null;
  dueDate: string; // ISO YYYY-MM-DD
  amount: number;
  notes?: string | null;
  personnelName?: string | null;
}

export interface WeekForecast {
  weekStart: string; // YYYY-MM-DD (segunda)
  weekEnd: string;   // YYYY-MM-DD (domingo)
  items: ForecastItem[];
  totalAmount: number;
}

// Helper puro: obtém segunda-feira para uma data (local, fixando meio-dia)
export const getWeekRangeForDate = (dateStr: string): { start: string; end: string } => {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const toIso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { start: toIso(start), end: toIso(end) };
};

// Agrupa itens por semana de vencimento
export const groupItemsByWeek = (items: ForecastItem[]): WeekForecast[] => {
  const map = new Map<string, WeekForecast>();
  
  // Primeiro, agrupa os itens existentes
  for (const item of items) {
    const { start, end } = getWeekRangeForDate(item.dueDate);
    const key = `${start}_${end}`;
    if (!map.has(key)) {
      map.set(key, { weekStart: start, weekEnd: end, items: [], totalAmount: 0 });
    }
    const wk = map.get(key)!;
    wk.items.push(item);
    wk.totalAmount += item.amount;
  }
  
  // Se não houver itens, retorna array vazio
  if (items.length === 0) {
    return [];
  }
  
  // Se houver itens, garante que todas as semanas do intervalo sejam incluídas
  const sortedWeeks = Array.from(map.values()).sort((a, b) => 
    a.weekStart < b.weekStart ? -1 : a.weekStart > b.weekStart ? 1 : 0
  );
  
  if (sortedWeeks.length === 0) {
    return [];
  }
  
  // Cria semanas vazias para preencher o intervalo completo
  const startDate = new Date(`${sortedWeeks[0].weekStart}T12:00:00`);
  const endDate = new Date(`${sortedWeeks[sortedWeeks.length - 1].weekEnd}T12:00:00`);
  
  const completeWeeks: WeekForecast[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const { start, end } = getWeekRangeForDate(
      `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
    );
    
    const existingWeek = sortedWeeks.find(w => w.weekStart === start && w.weekEnd === end);
    
    if (existingWeek) {
      completeWeeks.push(existingWeek);
    } else {
      completeWeeks.push({
        weekStart: start,
        weekEnd: end,
        items: [],
        totalAmount: 0
      });
    }
    
    // Avança para a próxima semana
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return completeWeeks;
};