import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import type { EventSupplierCost } from '@/contexts/data/types';

export const supplierCostKeys = {
  all: ['supplierCosts'] as const,
  lists: () => [...supplierCostKeys.all, 'list'] as const,
  list: (input: { teamId?: string; startDate?: string; endDate?: string; status?: 'todos' | 'pendente' | 'pago'; supplierId?: string; eventId?: string }) =>
    [...supplierCostKeys.lists(), input] as const,
};

type SupplierCostsReportFilters = {
  startDate?: string;
  endDate?: string;
  status?: 'todos' | 'pendente' | 'pago';
  supplierId?: string;
  eventId?: string;
};

const toStartTimestamp = (isoDate: string) => `${isoDate}T00:00:00.000Z`;
const toEndTimestamp = (isoDate: string) => `${isoDate}T23:59:59.999Z`;

const fetchTeamSupplierCosts = async (teamId: string, filters?: SupplierCostsReportFilters): Promise<EventSupplierCost[]> => {
  let query = supabase
    .from('event_supplier_costs')
    .select('id, team_id, event_id, supplier_id, supplier_name, description, unit_price, quantity, total_amount, payment_status, paid_amount, payment_date, notes, created_at, updated_at')
    .eq('team_id', teamId);

  if (filters?.supplierId) query = query.eq('supplier_id', filters.supplierId);
  if (filters?.eventId) query = query.eq('event_id', filters.eventId);

  if (filters?.status === 'pago') query = query.eq('payment_status', 'paid');
  if (filters?.status === 'pendente') query = query.neq('payment_status', 'paid');

  const startDate = filters?.startDate;
  const endDate = filters?.endDate;

  if (startDate || endDate) {
    const start = startDate ?? '1900-01-01';
    const end = endDate ?? '9999-12-31';
    const startTs = toStartTimestamp(start);
    const endTs = toEndTimestamp(end);

    if (filters?.status === 'pago') {
      query = query.gte('payment_date', start).lte('payment_date', end);
    } else if (filters?.status === 'pendente') {
      query = query.gte('created_at', startTs).lte('created_at', endTs);
    } else {
      query = query.or(
        `and(payment_status.eq.paid,payment_date.gte.${start},payment_date.lte.${end}),and(payment_status.neq.paid,created_at.gte.${startTs},created_at.lte.${endTs}),and(payment_status.is.null,created_at.gte.${startTs},created_at.lte.${endTs})`
      );
    }
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) throw error;

  return (data || []).map((cost) => ({
    id: cost.id,
    team_id: cost.team_id,
    event_id: cost.event_id,
    supplier_id: cost.supplier_id ?? undefined,
    supplier_name: cost.supplier_name || '',
    description: cost.description || '',
    category: cost.category ?? undefined,
    unit_price: Number(cost.unit_price) || 0,
    quantity: Number(cost.quantity) || 0,
    total_amount: Number(cost.total_amount) || (Number(cost.unit_price) || 0) * (Number(cost.quantity) || 0),
    payment_status: (cost.payment_status as EventSupplierCost['payment_status']) || 'pending',
    paid_amount: Number(cost.paid_amount) || 0,
    payment_date: cost.payment_date ?? undefined,
    notes: cost.notes ?? undefined,
    created_at: cost.created_at || '',
    updated_at: cost.updated_at || '',
  }));
};

export const useSupplierCostsQuery = (filters?: SupplierCostsReportFilters) => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  return useQuery({
    queryKey: supplierCostKeys.list({
      teamId: activeTeam?.id,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      status: filters?.status,
      supplierId: filters?.supplierId,
      eventId: filters?.eventId,
    }),
    queryFn: () => fetchTeamSupplierCosts(activeTeam!.id, filters),
    enabled: !!user && !!activeTeam?.id,
    staleTime: 10 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
