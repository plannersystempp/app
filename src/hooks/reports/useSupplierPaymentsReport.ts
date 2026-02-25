import { useMemo } from 'react';
import type { EventSupplierCost } from '@/contexts/data/types';
import {
  buildSupplierPaymentsReportRows,
  calcSupplierPaymentsReportTotals,
  filterSupplierPaymentsCosts,
  type SupplierPaymentsReportFilters,
} from '@/utils/supplierPaymentsReport';

type EventLite = { id: string; name: string };
type SupplierLite = { id: string; name: string };

export const useSupplierPaymentsReport = (input: {
  costs: EventSupplierCost[];
  events: EventLite[];
  suppliers: SupplierLite[];
  filters: SupplierPaymentsReportFilters;
}) => {
  const { costs, events, suppliers, filters } = input;

  return useMemo(() => {
    const eventsById = new Map(events.map((e) => [e.id, { id: e.id, name: e.name }]));
    const suppliersById = new Map(suppliers.map((s) => [s.id, { id: s.id, name: s.name }]));
    const filtered = filterSupplierPaymentsCosts(costs, filters);
    const rows = buildSupplierPaymentsReportRows({ costs: filtered, eventsById, suppliersById });
    const totals = calcSupplierPaymentsReportTotals(rows);
    return { rows, totals };
  }, [costs, events, filters, suppliers]);
};
