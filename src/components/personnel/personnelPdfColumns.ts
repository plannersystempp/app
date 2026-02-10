export type PersonnelPdfColumnId =
  | 'name'
  | 'type'
  | 'functions'
  | 'phone'
  | 'email'
  | 'city'
  | 'state'
  | 'cpf'
  | 'rg'
  | 'birthDate'
  | 'mothersName'
  | 'monthlySalary'
  | 'eventCache'
  | 'overtimeRate';

export type PersonnelPdfColumn = {
  id: PersonnelPdfColumnId;
  label: string;
  locked?: boolean;
};

export const PERSONNEL_PDF_COLUMNS: PersonnelPdfColumn[] = [
  { id: 'name', label: 'Nome', locked: true },
  { id: 'type', label: 'Tipo' },
  { id: 'functions', label: 'Funções' },
  { id: 'phone', label: 'Telefone' },
  { id: 'email', label: 'E-mail' },
  { id: 'city', label: 'Cidade' },
  { id: 'state', label: 'UF' },
  { id: 'cpf', label: 'CPF' },
  { id: 'rg', label: 'RG' },
  { id: 'birthDate', label: 'Nascimento' },
  { id: 'mothersName', label: 'Nome da Mãe' },
  { id: 'monthlySalary', label: 'Salário (mês)' },
  { id: 'eventCache', label: 'Cachê (evento)' },
  { id: 'overtimeRate', label: 'Hora extra' },
];

export const getDefaultVisiblePersonnelPdfColumns = (): PersonnelPdfColumnId[] => [
  'name',
  'type',
  'functions',
  'phone',
  'email',
  'city',
  'state',
];

export const isLockedPersonnelPdfColumn = (id: PersonnelPdfColumnId) => {
  return PERSONNEL_PDF_COLUMNS.some(c => c.id === id && !!c.locked);
};

export const sanitizePersonnelPdfColumns = (cols: unknown): PersonnelPdfColumnId[] => {
  if (!Array.isArray(cols)) return getDefaultVisiblePersonnelPdfColumns();
  const allowed = new Set(PERSONNEL_PDF_COLUMNS.map(c => c.id));
  const filtered = (cols as unknown[]).filter((c): c is PersonnelPdfColumnId => typeof c === 'string' && allowed.has(c as PersonnelPdfColumnId));
  const withLocked = new Set<PersonnelPdfColumnId>(filtered);
  PERSONNEL_PDF_COLUMNS.filter(c => c.locked).forEach(c => withLocked.add(c.id));
  return Array.from(withLocked);
};

export const getPersonnelPdfColumnLabel = (id: PersonnelPdfColumnId) => {
  return PERSONNEL_PDF_COLUMNS.find(c => c.id === id)?.label || id;
};
