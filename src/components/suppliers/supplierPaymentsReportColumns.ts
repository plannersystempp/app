export type SupplierPaymentsReportColumnId =
  | 'fornecedor'
  | 'evento'
  | 'descricao'
  | 'quantidade'
  | 'valor_unitario'
  | 'valor_total'
  | 'valor_pago'
  | 'valor_pendente'
  | 'status'
  | 'data_pagamento';

export type SupplierPaymentsReportColumn = {
  id: SupplierPaymentsReportColumnId;
  label: string;
  locked?: boolean;
};

export const SUPPLIER_PAYMENTS_REPORT_COLUMNS: SupplierPaymentsReportColumn[] = [
  { id: 'fornecedor', label: 'Fornecedor', locked: true },
  { id: 'evento', label: 'Evento', locked: true },
  { id: 'descricao', label: 'Descrição/Item' },
  { id: 'quantidade', label: 'Quantidade' },
  { id: 'valor_unitario', label: 'Valor Unitário' },
  { id: 'valor_total', label: 'Valor Total' },
  { id: 'valor_pago', label: 'Valor Pago' },
  { id: 'valor_pendente', label: 'Valor Pendente' },
  { id: 'status', label: 'Status' },
  { id: 'data_pagamento', label: 'Data de Pagamento' },
];

export const getDefaultVisibleSupplierPaymentsReportColumns = (): SupplierPaymentsReportColumnId[] => [
  'fornecedor',
  'evento',
  'descricao',
  'valor_total',
  'valor_pago',
  'valor_pendente',
  'status',
  'data_pagamento',
];

export const sanitizeSupplierPaymentsReportColumns = (input: unknown): SupplierPaymentsReportColumnId[] => {
  const allowed = new Set<SupplierPaymentsReportColumnId>(SUPPLIER_PAYMENTS_REPORT_COLUMNS.map((c) => c.id));
  const locked = SUPPLIER_PAYMENTS_REPORT_COLUMNS.filter((c) => c.locked).map((c) => c.id);

  const parsed = Array.isArray(input) ? input : [];
  const next = parsed
    .filter((v): v is SupplierPaymentsReportColumnId => typeof v === 'string' && allowed.has(v as SupplierPaymentsReportColumnId))
    .filter((v, idx, arr) => arr.indexOf(v) === idx);

  for (const id of locked) {
    if (!next.includes(id)) next.unshift(id);
  }

  return next.length ? next : getDefaultVisibleSupplierPaymentsReportColumns();
};

export const isLockedSupplierPaymentsReportColumn = (id: SupplierPaymentsReportColumnId): boolean => {
  return SUPPLIER_PAYMENTS_REPORT_COLUMNS.some((c) => c.id === id && !!c.locked);
};

export const getSupplierPaymentsReportColumnLabel = (id: SupplierPaymentsReportColumnId): string => {
  return SUPPLIER_PAYMENTS_REPORT_COLUMNS.find((c) => c.id === id)?.label ?? id;
};

