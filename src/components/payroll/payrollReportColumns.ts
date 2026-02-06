export type PayrollReportColumnId =
  | 'name'
  | 'role'
  | 'cpf'
  | 'rg'
  | 'birthDate'
  | 'mothersName'
  | 'dailyCache'
  | 'workDays'
  | 'workDaysCount'
  | 'overtimeHours'
  | 'overtimePay'
  | 'totalPay';

export type PayrollReportColumnDefinition = {
  id: PayrollReportColumnId;
  label: string;
  defaultVisible: boolean;
  locked?: boolean;
};

export const PAYROLL_REPORT_COLUMNS: PayrollReportColumnDefinition[] = [
  { id: 'name', label: 'Nome', defaultVisible: true, locked: true },
  { id: 'role', label: 'Função', defaultVisible: true },
  { id: 'cpf', label: 'CPF', defaultVisible: false },
  { id: 'rg', label: 'RG', defaultVisible: false },
  { id: 'birthDate', label: 'Data de Nascimento', defaultVisible: false },
  { id: 'mothersName', label: 'Nome da Mãe', defaultVisible: false },
  { id: 'dailyCache', label: 'Cachê dia (R$)', defaultVisible: true },
  { id: 'workDays', label: 'Dias de trabalho', defaultVisible: true },
  { id: 'workDaysCount', label: 'Qtd Dias', defaultVisible: true },
  { id: 'overtimeHours', label: 'H. Extras (h)', defaultVisible: true },
  { id: 'overtimePay', label: 'H. Extras (R$)', defaultVisible: true },
  { id: 'totalPay', label: 'Total (R$)', defaultVisible: true },
];

export const getDefaultVisiblePayrollReportColumns = (): PayrollReportColumnId[] =>
  PAYROLL_REPORT_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);

export const sanitizePayrollReportColumns = (value: unknown): PayrollReportColumnId[] => {
  const allowed = new Set<PayrollReportColumnId>(PAYROLL_REPORT_COLUMNS.map(c => c.id));
  const locked = PAYROLL_REPORT_COLUMNS.filter(c => c.locked).map(c => c.id);

  const raw = Array.isArray(value) ? value : [];
  const sanitized = raw.filter((v): v is PayrollReportColumnId => typeof v === 'string' && allowed.has(v as PayrollReportColumnId));

  const merged = [...locked, ...sanitized.filter(id => !locked.includes(id))];
  const unique = Array.from(new Set(merged));

  return unique.length ? unique : getDefaultVisiblePayrollReportColumns();
};

export const getPayrollReportColumnLabel = (id: PayrollReportColumnId): string => {
  const col = PAYROLL_REPORT_COLUMNS.find(c => c.id === id);
  return col?.label ?? id;
};

export const isLockedPayrollReportColumn = (id: PayrollReportColumnId): boolean =>
  !!PAYROLL_REPORT_COLUMNS.find(c => c.id === id)?.locked;

