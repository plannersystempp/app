import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import type { EventSupplierCost } from '@/contexts/data/types';

export const supplierCostKeys = {
  all: ['supplierCosts'] as const,
  lists: () => [...supplierCostKeys.all, 'list'] as const,
  list: (teamId?: string) => [...supplierCostKeys.lists(), { teamId }] as const,
};

const fetchTeamSupplierCosts = async (teamId: string): Promise<EventSupplierCost[]> => {
  const { data, error } = await supabase
    .from('event_supplier_costs')
    .select('id, team_id, event_id, supplier_id, supplier_name, description, unit_price, quantity, total_amount, payment_status, paid_amount, payment_date, notes, created_at, updated_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

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

export const useSupplierCostsQuery = () => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  return useQuery({
    queryKey: supplierCostKeys.list(activeTeam?.id),
    queryFn: () => fetchTeamSupplierCosts(activeTeam!.id),
    enabled: !!user && !!activeTeam?.id,
    staleTime: 10 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

