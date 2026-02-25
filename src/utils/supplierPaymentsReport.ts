export type SupplierPaymentStatus = 'pending' | 'partially_paid' | 'paid' | string | null | undefined;

export type SupplierPaymentsStatusFilter = 'todos' | 'pendente' | 'pago';

export type SupplierPaymentsReportFilters = {
  startDate?: string;
  endDate?: string;
  status: SupplierPaymentsStatusFilter;
  supplierId?: string;
  eventId?: string;
};

export type SupplierPaymentsReportCost = {
  id: string;
  team_id: string;
  event_id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  description?: string | null;
  unit_price?: number | null;
  quantity?: number | null;
  total_amount?: number | null;
  payment_status?: SupplierPaymentStatus;
  paid_amount?: number | null;
  payment_date?: string | null;
  created_at?: string | null;
};

export type SupplierPaymentsReportRow = {
  id: string;
  supplierName: string;
  eventName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  statusLabel: 'Pago' | 'Pendente';
  paymentDate?: string;
  baseDateISO?: string;
  supplierId?: string;
  eventId: string;
};

export type SupplierPaymentsReportTotals = {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  countTotal: number;
  countPaid: number;
  countPending: number;
};

const toISODate = (v?: string | null): string | null => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getSupplierPaymentsReportBaseDateISO = (c: SupplierPaymentsReportCost): string | null => {
  const status = String(c.payment_status || '').toLowerCase();
  const base = status === 'paid' ? c.payment_date : c.created_at;
  return toISODate(base);
};

export const getSupplierPaymentsReportStatusLabel = (status?: SupplierPaymentStatus): 'Pago' | 'Pendente' => {
  const st = String(status || '').toLowerCase();
  if (st === 'paid') return 'Pago';
  return 'Pendente';
};

export const matchesSupplierPaymentsStatusFilter = (status: SupplierPaymentStatus, filter: SupplierPaymentsStatusFilter): boolean => {
  if (filter === 'todos') return true;
  const st = String(status || '').toLowerCase();
  if (filter === 'pago') return st === 'paid';
  return st !== 'paid';
};

export const filterSupplierPaymentsCosts = <T extends SupplierPaymentsReportCost>(
  costs: T[],
  filters: SupplierPaymentsReportFilters
): T[] => {
  const start = filters.startDate ? toISODate(filters.startDate) : null;
  const end = filters.endDate ? toISODate(filters.endDate) : null;

  return costs.filter((c) => {
    if (filters.supplierId && c.supplier_id !== filters.supplierId) return false;
    if (filters.eventId && c.event_id !== filters.eventId) return false;
    if (!matchesSupplierPaymentsStatusFilter(c.payment_status, filters.status)) return false;

    if (start || end) {
      const base = getSupplierPaymentsReportBaseDateISO(c);
      if (!base) return false;
      if (start && base < start) return false;
      if (end && base > end) return false;
    }

    return true;
  });
};

export const calcSupplierPaymentsReportTotals = (rows: Array<{ totalAmount: number; paidAmount: number; pendingAmount: number; statusLabel: 'Pago' | 'Pendente' }>): SupplierPaymentsReportTotals => {
  let totalAmount = 0;
  let paidAmount = 0;
  let pendingAmount = 0;
  let countPaid = 0;
  let countPending = 0;
  for (const r of rows) {
    totalAmount += r.totalAmount;
    paidAmount += r.paidAmount;
    pendingAmount += r.pendingAmount;
    if (r.statusLabel === 'Pago') countPaid += 1;
    else countPending += 1;
  }
  return {
    totalAmount,
    paidAmount,
    pendingAmount,
    countTotal: rows.length,
    countPaid,
    countPending,
  };
};

export const buildSupplierPaymentsReportRows = (input: {
  costs: SupplierPaymentsReportCost[];
  eventsById: Map<string, { id: string; name: string }>;
  suppliersById: Map<string, { id: string; name: string }>;
}): SupplierPaymentsReportRow[] => {
  const { costs, eventsById, suppliersById } = input;
  const rows: SupplierPaymentsReportRow[] = costs.map((c) => {
    const totalAmount = Number(c.total_amount ?? (Number(c.unit_price || 0) * Number(c.quantity || 0))) || 0;
    const paidAmount = Number(c.paid_amount) || 0;
    const pendingAmount = Math.max(totalAmount - paidAmount, 0);

    const supplierName = (c.supplier_id && suppliersById.get(c.supplier_id)?.name) || c.supplier_name || 'Fornecedor';
    const eventName = eventsById.get(c.event_id)?.name || 'Evento';
    const statusLabel = getSupplierPaymentsReportStatusLabel(c.payment_status);
    const baseDateISO = getSupplierPaymentsReportBaseDateISO(c) || undefined;

    return {
      id: c.id,
      supplierName,
      eventName,
      description: c.description || '-',
      quantity: Number(c.quantity) || 0,
      unitPrice: Number(c.unit_price) || 0,
      totalAmount,
      paidAmount,
      pendingAmount,
      statusLabel,
      paymentDate: c.payment_date || undefined,
      baseDateISO,
      supplierId: c.supplier_id || undefined,
      eventId: c.event_id,
    };
  });

  rows.sort((a, b) => {
    const da = a.baseDateISO ? new Date(`${a.baseDateISO}T12:00:00`).getTime() : 0;
    const db = b.baseDateISO ? new Date(`${b.baseDateISO}T12:00:00`).getTime() : 0;
    return db - da;
  });

  return rows;
};

