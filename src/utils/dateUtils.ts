// Helper: parse date strings from Supabase and various formats safely
export const parseDateSafe = (input: string): Date => {
  if (!input) return new Date(NaN);
  const s = String(input).trim();

  // Numeric timestamp
  if (/^\d+$/.test(s)) {
    const ts = parseInt(s, 10);
    return new Date(ts);
  }

  let normalized = s;

  // Replace space between date and time with 'T' (supports milliseconds: '2025-12-04 13:19:41.753+00')
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}(:\d{2})?)?$/.test(s)) {
    normalized = s.replace(' ', 'T');
  }

  // Date-only string → set midday to avoid TZ shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T12:00:00`;
  }

  // Timezone without colon (e.g., +00) → add :00
  if (/[+-]\d{2}$/.test(normalized)) {
    normalized = `${normalized}:00`;
  }

  let d = new Date(normalized);
  if (isNaN(d.getTime())) {
    // Fallback: convert +00:00 → Z
    const zAttempt = normalized.replace(/[+-]00:00$/, 'Z').replace(/[+-]00$/, 'Z');
    d = new Date(zAttempt);
  }
  return d;
};

export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = parseDateSafe(dateStr);
  if (isNaN(date.getTime())) {
    console.error('Data inválida em formatDateBR:', dateStr);
    return '';
  }
  return date.toLocaleDateString('pt-BR');
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return '';
  return `${formatDateBR(startDate)} à ${formatDateBR(endDate)}`;
};

export const generateDateArray = (startDate: string, endDate: string): string[] => {
  if (!startDate || !endDate) return [];

  const dates: string[] = [];
  const start = parseDateSafe(startDate);
  const end = parseDateSafe(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  const current = new Date(start.getTime());
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/**
 * Retorna um array de strings (YYYY-MM-DD) representando o intervalo total do evento,
 * considerando a data de início/fim e as datas de montagem (setup_start_date/setup_end_date).
 */
export const getEventFullDateRange = (event: any): string[] => {
  if (!event) return [];

  const dates = new Set<string>();

  // Datas principais
  if (event.start_date && event.end_date) {
    generateDateArray(event.start_date, event.end_date).forEach(d => dates.add(d));
  }

  // Datas de montagem
  if (event.setup_start_date && event.setup_end_date) {
    generateDateArray(event.setup_start_date, event.setup_end_date).forEach(d => dates.add(d));
  } else if (event.setup_start_date) {
    // Se só tiver início da montagem, incluímos esse dia
    dates.add(event.setup_start_date);
  }

  // Retornar ordenado
  return Array.from(dates).sort();
};

export const formatDateWithWeekday = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = parseDateSafe(dateStr);
  if (isNaN(date.getTime())) {
    console.error('Data inválida em formatDateWithWeekday:', dateStr);
    return '';
  }
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
};

export const formatDateLong = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = parseDateSafe(dateStr);
  if (isNaN(date.getTime())) {
    console.error('Data inválida em formatDateLong:', dateStr);
    return '';
  }
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = parseDateSafe(dateStr);
  if (isNaN(date.getTime())) {
    console.error('Data inválida em formatDateShort:', dateStr);
    return '';
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata uma lista de datas ISO (YYYY-MM-DD) para mostrar apenas os dias do mês separados por vírgula.
 * Ex.: ['2025-11-05','2025-11-06','2025-11-07'] -> "5,6,7"
 */
export const formatPeriodDays = (dates: string[]): string => {
  if (!dates || dates.length === 0) return '—';

  const dayNumbers = dates
    .map(d => parseDateSafe(d))
    .filter(dt => !isNaN(dt.getTime()))
    .map(dt => dt.getDate());

  if (dayNumbers.length === 0) return '—';

  // Remover duplicidades e ordenar
  const uniqueSorted = Array.from(new Set(dayNumbers)).sort((a, b) => a - b);

  // Verificar se é uma sequência contínua (dias corridos)
  const isConsecutive = uniqueSorted.every((d, i) => i === 0 || d === uniqueSorted[i - 1] + 1);

  if (isConsecutive && uniqueSorted.length > 1) {
    return `${uniqueSorted[0]} - ${uniqueSorted[uniqueSorted.length - 1]}`;
  }

  // Caso não seja contínuo, exibir lista simples
  return uniqueSorted.join(', ');
};