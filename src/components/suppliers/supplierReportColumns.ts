export type SupplierReportColumnId =
  | 'nome_fantasia'
  | 'razao_social'
  | 'cnpj'
  | 'inscricao_estadual'
  | 'inscricao_municipal'
  | 'cep'
  | 'logradouro'
  | 'numero'
  | 'complemento'
  | 'bairro'
  | 'cidade'
  | 'estado'
  | 'pessoa_contato'
  | 'telefone_1'
  | 'telefone_2'
  | 'email'
  | 'avaliacao_media'
  | 'total_avaliacoes'
  | 'observacoes';

export type SupplierReportColumn = {
  id: SupplierReportColumnId;
  label: string;
  locked?: boolean;
};

export const SUPPLIER_REPORT_COLUMNS: SupplierReportColumn[] = [
  { id: 'nome_fantasia', label: 'Nome fantasia', locked: true },
  { id: 'razao_social', label: 'Razão social' },
  { id: 'cnpj', label: 'CNPJ', locked: true },
  { id: 'inscricao_estadual', label: 'Inscrição estadual' },
  { id: 'inscricao_municipal', label: 'Inscrição municipal' },
  { id: 'cep', label: 'CEP' },
  { id: 'logradouro', label: 'Logradouro' },
  { id: 'numero', label: 'Número' },
  { id: 'complemento', label: 'Complemento' },
  { id: 'bairro', label: 'Bairro' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'estado', label: 'Estado' },
  { id: 'pessoa_contato', label: 'Pessoa contato' },
  { id: 'telefone_1', label: 'Telefone 1' },
  { id: 'telefone_2', label: 'Telefone 2' },
  { id: 'email', label: 'Email' },
  { id: 'avaliacao_media', label: 'Avaliação média' },
  { id: 'total_avaliacoes', label: 'Total avaliações' },
  { id: 'observacoes', label: 'Observações' },
];

export const getDefaultVisibleSupplierReportColumns = (): SupplierReportColumnId[] => [
  'nome_fantasia',
  'cnpj',
  'pessoa_contato',
  'telefone_1',
  'email',
  'cidade',
  'estado',
  'avaliacao_media',
  'total_avaliacoes',
];

export const sanitizeSupplierReportColumns = (input: unknown): SupplierReportColumnId[] => {
  const allowed = new Set<SupplierReportColumnId>(SUPPLIER_REPORT_COLUMNS.map((c) => c.id));
  const locked = SUPPLIER_REPORT_COLUMNS.filter((c) => c.locked).map((c) => c.id);

  const parsed = Array.isArray(input) ? input : [];
  const next = parsed
    .filter((v): v is SupplierReportColumnId => typeof v === 'string' && allowed.has(v as SupplierReportColumnId))
    .filter((v, idx, arr) => arr.indexOf(v) === idx);

  for (const id of locked) {
    if (!next.includes(id)) next.unshift(id);
  }

  return next.length ? next : getDefaultVisibleSupplierReportColumns();
};

export const isLockedSupplierReportColumn = (id: SupplierReportColumnId): boolean => {
  return SUPPLIER_REPORT_COLUMNS.some((c) => c.id === id && !!c.locked);
};

export const getSupplierReportColumnLabel = (id: SupplierReportColumnId): string => {
  return SUPPLIER_REPORT_COLUMNS.find((c) => c.id === id)?.label ?? id;
};

