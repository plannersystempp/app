import { describe, it, expect } from 'vitest';
import {
  filterSupplierPaymentsCosts,
  buildSupplierPaymentsReportRows,
  calcSupplierPaymentsReportTotals,
  getSupplierPaymentsReportBaseDateISO,
  type SupplierPaymentsReportCost,
} from '@/utils/supplierPaymentsReport';

const mkCost = (over: Partial<SupplierPaymentsReportCost>): SupplierPaymentsReportCost => ({
  id: over.id || Math.random().toString(36).slice(2),
  team_id: over.team_id || 't1',
  event_id: over.event_id || 'e1',
  supplier_id: over.supplier_id ?? 's1',
  supplier_name: over.supplier_name ?? 'Fornecedor',
  description: over.description ?? 'Item',
  unit_price: over.unit_price ?? 100,
  quantity: over.quantity ?? 1,
  total_amount: over.total_amount ?? 100,
  paid_amount: over.paid_amount ?? 0,
  payment_status: over.payment_status ?? 'pending',
  payment_date: over.payment_date ?? null,
  created_at: over.created_at ?? '2026-02-01T10:00:00Z',
});

describe('supplierPaymentsReport', () => {
  it('usa payment_date quando pago, senão created_at', () => {
    const paid = mkCost({ payment_status: 'paid', payment_date: '2026-02-10T10:00:00Z', created_at: '2026-02-01T10:00:00Z' });
    const pending = mkCost({ payment_status: 'pending', payment_date: '2026-02-10T10:00:00Z', created_at: '2026-02-01T10:00:00Z' });
    expect(getSupplierPaymentsReportBaseDateISO(paid)).toBe('2026-02-10');
    expect(getSupplierPaymentsReportBaseDateISO(pending)).toBe('2026-02-01');
  });

  it('filtra por status (pendente inclui partially_paid)', () => {
    const items = [
      mkCost({ id: 'a', payment_status: 'paid' }),
      mkCost({ id: 'b', payment_status: 'pending' }),
      mkCost({ id: 'c', payment_status: 'partially_paid' }),
    ];
    expect(filterSupplierPaymentsCosts(items, { status: 'todos' })).toHaveLength(3);
    expect(filterSupplierPaymentsCosts(items, { status: 'pago' }).map(i => i.id)).toEqual(['a']);
    expect(filterSupplierPaymentsCosts(items, { status: 'pendente' }).map(i => i.id).sort()).toEqual(['b', 'c']);
  });

  it('filtra por período usando baseDate', () => {
    const items = [
      mkCost({ id: 'a', payment_status: 'paid', payment_date: '2026-02-10T10:00:00Z', created_at: '2026-02-01T10:00:00Z' }),
      mkCost({ id: 'b', payment_status: 'pending', created_at: '2026-02-15T10:00:00Z' }),
    ];
    const filtered = filterSupplierPaymentsCosts(items, { status: 'todos', startDate: '2026-02-12', endDate: '2026-02-20' });
    expect(filtered.map(i => i.id)).toEqual(['b']);
  });

  it('gera rows com valores e totais consistentes', () => {
    const items = [
      mkCost({ id: 'a', total_amount: 100, paid_amount: 100, payment_status: 'paid', payment_date: '2026-02-10T10:00:00Z' }),
      mkCost({ id: 'b', total_amount: 200, paid_amount: 50, payment_status: 'partially_paid', created_at: '2026-02-12T10:00:00Z' }),
    ];
    const rows = buildSupplierPaymentsReportRows({
      costs: items,
      eventsById: new Map([['e1', { id: 'e1', name: 'Evento 1' }]]),
      suppliersById: new Map([['s1', { id: 's1', name: 'Fornecedor 1' }]]),
    });
    const totals = calcSupplierPaymentsReportTotals(rows);
    expect(rows).toHaveLength(2);
    expect(totals.totalAmount).toBe(300);
    expect(totals.paidAmount).toBe(150);
    expect(totals.pendingAmount).toBe(150);
    expect(totals.countPaid).toBe(1);
    expect(totals.countPending).toBe(1);
  });
});
