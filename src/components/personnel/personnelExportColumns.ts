export type PersonnelExportColumnId =
  | 'id'
  | 'name'
  | 'type'
  | 'functions'
  | 'primaryFunction'
  | 'email'
  | 'phone'
  | 'phoneSecondary'
  | 'cpf'
  | 'rg'
  | 'birthDate'
  | 'mothersName'
  | 'cnpj'
  | 'monthlySalary'
  | 'eventCache'
  | 'overtimeRate'
  | 'shirtSize'
  | 'photoUrl'
  | 'addressZipCode'
  | 'addressStreet'
  | 'addressNumber'
  | 'addressComplement'
  | 'addressNeighborhood'
  | 'addressCity'
  | 'addressState';

export type PersonnelExportColumnDefinition = {
  id: PersonnelExportColumnId;
  label: string;
  defaultVisible: boolean;
  locked?: boolean;
};

export const PERSONNEL_EXPORT_COLUMNS: PersonnelExportColumnDefinition[] = [
  { id: 'name', label: 'Nome', defaultVisible: true, locked: true },
  { id: 'type', label: 'Tipo', defaultVisible: true },
  { id: 'functions', label: 'Funções', defaultVisible: true },
  { id: 'phone', label: 'Telefone', defaultVisible: true },
  { id: 'email', label: 'E-mail', defaultVisible: true },
  { id: 'addressCity', label: 'Cidade', defaultVisible: true },
  { id: 'addressState', label: 'UF', defaultVisible: true },

  { id: 'cpf', label: 'CPF', defaultVisible: false },
  { id: 'rg', label: 'RG', defaultVisible: false },
  { id: 'birthDate', label: 'Nascimento', defaultVisible: false },
  { id: 'mothersName', label: 'Nome da Mãe', defaultVisible: false },
  { id: 'cnpj', label: 'CNPJ', defaultVisible: false },

  { id: 'primaryFunction', label: 'Função principal', defaultVisible: false },
  { id: 'monthlySalary', label: 'Salário mensal', defaultVisible: false },
  { id: 'eventCache', label: 'Cachê do evento', defaultVisible: false },
  { id: 'overtimeRate', label: 'Valor hora extra', defaultVisible: false },

  { id: 'phoneSecondary', label: 'Telefone secundário', defaultVisible: false },
  { id: 'shirtSize', label: 'Tamanho camisa', defaultVisible: false },
  { id: 'photoUrl', label: 'URL foto', defaultVisible: false },
  { id: 'id', label: 'ID', defaultVisible: false },

  { id: 'addressZipCode', label: 'CEP', defaultVisible: false },
  { id: 'addressStreet', label: 'Logradouro', defaultVisible: false },
  { id: 'addressNumber', label: 'Número', defaultVisible: false },
  { id: 'addressComplement', label: 'Complemento', defaultVisible: false },
  { id: 'addressNeighborhood', label: 'Bairro', defaultVisible: false },
];

export const getDefaultVisiblePersonnelExportColumns = (): PersonnelExportColumnId[] =>
  PERSONNEL_EXPORT_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);

export const getPersonnelExportColumnLabel = (id: PersonnelExportColumnId): string => {
  const col = PERSONNEL_EXPORT_COLUMNS.find(c => c.id === id);
  return col?.label ?? id;
};

export const isLockedPersonnelExportColumn = (id: PersonnelExportColumnId): boolean =>
  !!PERSONNEL_EXPORT_COLUMNS.find(c => c.id === id)?.locked;

export const sanitizePersonnelExportColumns = (value: unknown): PersonnelExportColumnId[] => {
  const allowed = new Set<PersonnelExportColumnId>(PERSONNEL_EXPORT_COLUMNS.map(c => c.id));
  const locked = PERSONNEL_EXPORT_COLUMNS.filter(c => c.locked).map(c => c.id);

  const raw = Array.isArray(value) ? value : [];
  const sanitized = raw.filter((v): v is PersonnelExportColumnId => typeof v === 'string' && allowed.has(v as PersonnelExportColumnId));

  const merged = [...locked, ...sanitized.filter(id => !locked.includes(id))];
  const unique = Array.from(new Set(merged));

  return unique.length ? unique : getDefaultVisiblePersonnelExportColumns();
};

