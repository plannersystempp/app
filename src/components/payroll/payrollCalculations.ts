/**
 * Funções puras para cálculo de folha de pagamento
 * 
 * Este módulo contém toda a lógica de negócio para cálculo de pagamentos,
 * isolada do React para facilitar testes e manutenção.
 */

/**
 * Interface flexível para dados de pessoal
 * Compatível com diferentes fontes de dados
 */
export interface PersonnelData {
  id: string;
  name: string;
  type: 'fixo' | 'freelancer';
  event_cache?: number;
  monthly_salary?: number;
  overtime_rate?: number;
  [key: string]: any;
}

/**
 * Representa uma alocação de pessoal em um evento
 */
export interface AllocationData {
  id: string;
  personnel_id: string;
  event_id: string;
  work_days: string[];
  event_specific_cache?: number | null;
  attendance_status?: 'pending' | 'present' | 'absent';
  [key: string]: any;
}

/**
 * Representa um registro de trabalho (horas extras)
 */
export interface WorkLogData {
  id: string;
  employee_id: string;
  event_id: string;
  hours_worked: number;
  overtime_hours: number;
  work_date?: string;
  attendance_status?: 'present' | 'absent' | 'pending';
  [key: string]: any;
}

/**
 * Representa uma ausência/falta
 */
export interface AbsenceData {
  id: string;
  assignment_id: string;
  work_date: string;
  notes?: string;
  logged_by_name?: string;
  created_at?: string;
  [key: string]: any;
}

/**
 * Representa um registro de pagamento
 */
export interface PaymentRecord {
  id: string;
  personnel_id: string;
  total_amount_paid: number;
  paid_at?: string;
  created_at?: string;
  notes?: string;
  [key: string]: any;
}

/**
 * Calcula o total de dias únicos de trabalho em todas as alocações
 * 
 * @param allocations - Array de alocações do mesmo pessoal no mesmo evento
 * @returns Número total de dias únicos (sem duplicatas)
 * 
 * @example
 * // Pessoa alocada em 2 divisões com dias sobrepostos:
 * // Divisão A: ['2024-01-15', '2024-01-16']
 * // Divisão B: ['2024-01-16', '2024-01-17']
 * // Retorna: 3 (dias únicos: 15, 16, 17)
 */
export function calculateUniqueWorkDays(allocations: AllocationData[]): number {
  const uniqueDays = new Set<string>();
  
  for (const allocation of allocations) {
    // Se o status for 'absent' (falta), ignorar dias desta alocação
    if (allocation.attendance_status === 'absent') {
      continue;
    }

    const workDays = allocation.work_days || [];
    workDays.forEach(day => uniqueDays.add(day));
  }
  
  return uniqueDays.size;
}

/**
 * Calcula o total de dias efetivamente trabalhados (descontando faltas)
 * 
 * Regra de negócio: Dias trabalhados = Dias únicos alocados - Faltas registradas
 * 
 * @param allocations - Array de alocações do pessoal
 * @param workLogs - Array de registros de trabalho (NOVO - para verificar attendance_status)
 * @returns Número de dias trabalhados (nunca negativo)
 * 
 * @example
 * // 5 dias alocados, 2 faltas = 3 dias trabalhados
 * calculateWorkedDays([allocation], [workLog1, workLog2]) // => 3
 */
export function calculateWorkedDays(
  allocations: AllocationData[],
  workLogs: WorkLogData[] = []
): number {
  const totalUniqueDays = calculateUniqueWorkDays(allocations);
  
  // Coletar datas de falta de work_records com status absent
  const absentDates = new Set<string>();
  
  workLogs.forEach(log => {
    if (log.attendance_status === 'absent' && log.work_date) {
      absentDates.add(log.work_date);
    }
  });
  
  // Garante que nunca retorna negativo
  return Math.max(0, totalUniqueDays - absentDates.size);
}

/**
 * Determina a taxa diária de cachê a ser utilizada
 * 
 * Ordem de prioridade:
 * 1. event_specific_cache (valor específico definido para este evento)
 * 2. person.event_cache (valor padrão da pessoa)
 * 
 * @param allocations - Alocações do pessoal (primeira alocação contém event_specific_cache)
 * @param person - Dados do pessoal
 * @returns Taxa diária de cachê
 */
export function getDailyCacheRate(
  allocations: AllocationData[],
  person: PersonnelData
): number {
  // 1. Verifica todas as alocações e usa o maior cachê específico definido para o evento (> 0)
  const specificRates = allocations
    .map(a => (a.event_specific_cache ?? 0))
    .filter(rate => rate > 0);

  if (specificRates.length > 0) {
    return Math.max(...specificRates);
  }

  // 2. Verifica se há cachê específico por função
  if (person.functions && allocations.length > 0) {
    const functionCaches = allocations
      .map(alloc => {
        // Tenta encontrar por ID primeiro
        if (alloc.function_id) {
          const func = person.functions?.find(f => f.id === alloc.function_id);
          if (func?.custom_cache) return func.custom_cache;
        }
        
        // Se não tiver ID ou não achar, tenta por nome
        if (alloc.function_name) {
          const func = person.functions?.find(f => f.name === alloc.function_name);
          if (func?.custom_cache) return func.custom_cache;
        }
        
        return 0;
      })
      .filter(rate => rate > 0);
    
    if (functionCaches.length > 0) {
      return Math.max(...functionCaches);
    }
  }

  // 3. Caso contrário, usa o cachê padrão da pessoa
  return person.event_cache || 0;
}

/**
 * Calcula o pagamento de cachê baseado em dias trabalhados
 * 
 * Fórmula: Cachê Total = Taxa Diária × Dias Trabalhados
 * 
 * @param allocations - Alocações do pessoal
 * @param person - Dados do pessoal
 * @param workLogs - Registros de trabalho (para verificar faltas no novo sistema)
 * @returns Valor total de cachê a pagar
 * 
 * @example
 * // Taxa: R$ 200/dia, 5 dias trabalhados
 * calculateCachePay(allocations, person, []) // => 1000
 * 
 * // Taxa: R$ 200/dia, 5 dias alocados, 1 falta
 * calculateCachePay(allocations, person, [workLogAbsence]) // => 800 (4 dias × R$ 200)
 */
export function calculateCachePay(
  allocations: AllocationData[],
  person: PersonnelData,
  workLogs: WorkLogData[] = []
): number {
  const workedDays = calculateWorkedDays(allocations, workLogs);
  const dailyRate = getDailyCacheRate(allocations, person);
  
  return workedDays * dailyRate;
}

/**
 * Calcula o total de horas extras trabalhadas
 * 
 * @param workLogs - Registros de trabalho
 * @returns Total de horas extras
 */
export function calculateTotalOvertimeHours(workLogs: WorkLogData[]): number {
  return workLogs.reduce((sum, log) => sum + (log.overtime_hours || 0), 0);
}

/**
 * Calcula o total de horas regulares trabalhadas
 * 
 * @param workLogs - Registros de trabalho
 * @returns Total de horas regulares
 */
export function calculateTotalRegularHours(workLogs: WorkLogData[]): number {
  return workLogs.reduce((sum, log) => sum + (log.hours_worked || 0), 0);
}

/**
 * Calcula o pagamento de horas extras
 * 
 * Fórmula: Pagamento HE = Total Horas Extras × Taxa Hora Extra
 * 
 * @param workLogs - Registros de trabalho
 * @param person - Dados do pessoal
 * @returns Valor total de horas extras
 * 
 * @example
 * // 10 horas extras × R$ 50/hora = R$ 500
 * calculateOvertimePay([workLog], person) // => 500
 */
export const calculateOvertimePay = (
  workLogs: WorkLogData[], 
  person: PersonnelData, 
  allocations: AllocationData[] = []
): number => {
  const totalOvertimeHours = calculateTotalOvertimeHours(workLogs);
  const rate = getOvertimeRate(allocations, person);
  return totalOvertimeHours * rate;
};

/**
 * Interface para configuração de conversão de horas extras
 */
export interface OvertimeConfig {
  threshold: number;        // Limiar de horas para conversão (ex: 8)
  convertEnabled: boolean;  // Se a conversão está ativa
  dailyCache: number;       // Valor do cachê diário
  overtimeRate: number;     // Taxa de hora extra (para horas restantes)
}

/**
 * Resultado do cálculo de horas extras com conversão
 */
export interface OvertimePaymentResult {
  payAmount: number;          // Valor total a pagar
  displayHours: number;       // Horas reais trabalhadas (sempre mostrar)
  conversionApplied: boolean; // Se conversão foi aplicada
  dailyCachesUsed: number;    // Quantos cachês completos foram pagos
  remainingHours: number;     // Horas restantes pagas avulsas
}

/**
 * Calcula pagamento de horas extras com conversão DIA A DIA para cachê diário
 * 
 * Esta função processa as horas extras diariamente, aplicando a conversão
 * apenas quando um dia específico atinge ou ultrapassa o limiar configurado.
 * 
 * @param workLogs - Registros de trabalho (com work_date e overtime_hours)
 * @param config - Configuração de conversão
 * @returns Resultado detalhado do cálculo
 * 
 * @example
 * // Config: 4h, cachê R$ 500, taxa R$ 50/h
 * // Dia 1: 5h extras → 1 cachê + 1h avulsa
 * // Dia 2: 1h extra → 1h avulsa
 * // Dia 3: 3h extras → 3h avulsas
 * // Total: 1 cachê (R$ 500) + 5h × R$ 50 (R$ 250) = R$ 750
 */
export const calculateOvertimePayWithDailyConversion = (
  workLogs: WorkLogData[],
  config: OvertimeConfig
): OvertimePaymentResult => {
  // Se conversão desativada, calcular soma simples
  if (!config.convertEnabled) {
    const totalHours = calculateTotalOvertimeHours(workLogs);
    return {
      payAmount: totalHours * config.overtimeRate,
      displayHours: totalHours,
      conversionApplied: false,
      dailyCachesUsed: 0,
      remainingHours: totalHours
    };
  }

  // Agrupar horas extras por data
  const dailyHours = new Map<string, number>();
  workLogs.forEach(log => {
    const date = log.work_date || '';
    const hours = log.overtime_hours || 0;
    dailyHours.set(date, (dailyHours.get(date) || 0) + hours);
  });

  let totalCachesUsed = 0;
  let totalRemainingHours = 0;
  let totalDisplayHours = 0;

  // Cobertura de um cachê diário sobre horas extras: até 8h no dia
  // Regra não cumulativa: no máximo 1 cachê por dia
  const OVERTIME_CACHE_COVERAGE_PER_DAY = 8;

  // Processar cada dia individualmente
  dailyHours.forEach((hoursInDay) => {
    totalDisplayHours += hoursInDay;

    if (hoursInDay >= config.threshold) {
      // Regra: atingiu/ultrapassou o limiar no dia → 1 cachê diário (não cumulativo)
      totalCachesUsed += 1;

      // Esse cachê cobre até 8h de HE no dia; acima disso, paga-se hora a hora
      const remainingForDay = Math.max(0, hoursInDay - OVERTIME_CACHE_COVERAGE_PER_DAY);
      totalRemainingHours += remainingForDay;
    } else {
      // Dia com HE < limiar → paga hora a hora
      totalRemainingHours += hoursInDay;
    }
  });

  const cachePayment = totalCachesUsed * config.dailyCache;
  const remainingPayment = totalRemainingHours * config.overtimeRate;

  return {
    payAmount: cachePayment + remainingPayment,
    displayHours: totalDisplayHours,
    conversionApplied: totalCachesUsed > 0,
    dailyCachesUsed: totalCachesUsed,
    remainingHours: totalRemainingHours
  };
};

/**
 * Calcula o salário base para funcionários fixos
 * 
 * Regra: Apenas funcionários do tipo 'fixo' têm salário base
 * 
 * @param person - Dados do pessoal
 * @returns Salário base (0 para freelancers)
 */
export function calculateBaseSalary(person: PersonnelData): number {
  if (person.type === 'fixo') {
    return person.monthly_salary || 0;
  }
  return 0;
}

/**
 * Calcula o pagamento total bruto
 * 
 * Fórmula: Total = Salário Base + Cachê + Horas Extras
 * 
 * Componentes:
 * - Salário Base: Apenas para funcionários fixos
 * - Cachê: Dias trabalhados × Taxa diária
 * - Horas Extras: Total de horas × Taxa hora extra (com conversão diária se config fornecida)
 * 
 * @param allocations - Alocações do pessoal
 * @param person - Dados do pessoal
 * @param workLogs - Registros de trabalho
 * @param overtimeConfig - Configuração opcional de conversão de HE (se fornecida, usa cálculo dia a dia)
 * @returns Valor total bruto a pagar
 */
export function calculateTotalPay(
  allocations: AllocationData[],
  person: PersonnelData,
  workLogs: WorkLogData[],
  overtimeConfig?: OvertimeConfig
): number {
  const baseSalary = calculateBaseSalary(person);
  const cachePay = calculateCachePay(allocations, person, workLogs);
  
  // Usar conversão diária se config fornecida, caso contrário usar cálculo simples
  let overtimePay: number;
  if (overtimeConfig) {
    const result = calculateOvertimePayWithDailyConversion(workLogs, overtimeConfig);
    overtimePay = result.payAmount;
  } else {
    overtimePay = calculateOvertimePay(workLogs, person, allocations);
  }
  
  return baseSalary + cachePay + overtimePay;
}

/**
 * Calcula o total já pago baseado nos registros de pagamento
 * 
 * @param paymentRecords - Registros de pagamentos realizados
 * @returns Total já pago
 */
export function calculateTotalPaid(paymentRecords: PaymentRecord[]): number {
  return paymentRecords.reduce(
    (sum, record) => sum + (record.total_amount_paid || 0),
    0
  );
}

/**
 * Calcula o valor pendente a pagar
 * 
 * Fórmula: Pendente = Total Bruto - Total Pago
 * 
 * @param totalPay - Valor total bruto
 * @param totalPaid - Valor já pago
 * @returns Valor pendente (nunca negativo)
 */
export function calculatePendingAmount(
  totalPay: number,
  totalPaid: number
): number {
  return Math.max(0, totalPay - totalPaid);
}

/**
 * Verifica se o pagamento está completo
 * 
 * Critérios:
 * - Algum pagamento foi realizado (totalPaid > 0)
 * - Não há valor pendente (pendingAmount = 0)
 * 
 * @param totalPaid - Total já pago
 * @param pendingAmount - Valor pendente
 * @returns true se o pagamento está completo
 */
export function isPaymentComplete(
  totalPaid: number,
  pendingAmount: number
): boolean {
  return pendingAmount === 0 && totalPaid > 0;
}

/**
 * Processa ausências para formato de exibição
 * 
 * @param absences - Ausências brutas do banco
 * @returns Ausências formatadas para exibição
 */
export function processAbsences(absences: AbsenceData[]): Array<{
  id: string;
  work_date: string;
  logged_by_name: string;
  notes: string;
  created_at: string;
}> {
  return absences.map(absence => ({
    id: absence.id.toString(),
    work_date: absence.work_date,
    logged_by_name: absence.logged_by_name || 'Sistema',
    notes: absence.notes || '',
    created_at: absence.created_at || ''
  }));
}

/**
 * Processa histórico de pagamentos para formato de exibição
 * 
 * @param paymentRecords - Registros de pagamento do banco
 * @returns Histórico formatado para exibição
 */
export function processPaymentHistory(paymentRecords: PaymentRecord[]): Array<{
  id: string;
  amount: number;
  paidAt: string;
  notes: string;
}> {
  return paymentRecords.map(record => ({
    id: record.id,
    amount: record.total_amount_paid || 0,
    paidAt: record.paid_at || record.created_at || '',
    notes: record.notes || ''
  }));
}

/**
 * Verifica se há cachê específico definido para o evento
 * 
 * @param allocations - Alocações do pessoal
 * @returns true se há event_specific_cache definido
 */
export function hasEventSpecificCache(allocations: AllocationData[]): boolean {
  // Verdadeiro se qualquer alocação tiver cachê específico definido (> 0)
  return allocations.some(a => (a.event_specific_cache ?? 0) > 0);
}

/**
 * Determina a taxa de hora extra a ser usada com prioridade por função
 * 
 * Ordem de prioridade:
 * 1. Taxa específica por função (custom_overtime) encontrada nas alocações
 *    - procura por `function_id` e fallback por `function_name`
 *    - usa o MAIOR valor encontrado (> 0) entre as funções alocadas
 * 2. `person.overtime_rate` (valor padrão da pessoa)
 */
export function getOvertimeRate(
  allocations: AllocationData[],
  person: PersonnelData
): number {
  let explicitRate = 0;

  // 1. Tenta encontrar taxa específica por função
  if (person.functions && allocations.length > 0) {
    const functionRates = allocations
      .map(alloc => {
        // ID tem prioridade
        if ((alloc as any).function_id) {
          const func = person.functions?.find((f: any) => f.id === (alloc as any).function_id);
          if (func?.custom_overtime) return Number(func.custom_overtime);
        }
        // Fallback por nome
        if ((alloc as any).function_name) {
          const func = person.functions?.find((f: any) => f.name === (alloc as any).function_name);
          if (func?.custom_overtime) return Number(func.custom_overtime);
        }
        return 0;
      })
      .filter(rate => rate > 0);

    if (functionRates.length > 0) {
      explicitRate = Math.max(...functionRates);
    }
  }

  // 2. Fallback para taxa padrão da pessoa
  if (explicitRate === 0) {
    explicitRate = Number(person.overtime_rate || 0);
  }

  // 3. Calcular taxa implícita baseada no cachê diário
  // Assume jornada de 12h (padrão eventos) para garantir que HE seja proporcional ao cachê
  const dailyRate = getDailyCacheRate(allocations, person);
  const DEFAULT_WORK_HOURS = 12;
  const implicitRate = dailyRate > 0 ? (dailyRate / DEFAULT_WORK_HOURS) : 0;

  // Retorna o maior valor entre a taxa explícita e a implícita
  return Math.max(explicitRate, implicitRate);
}
