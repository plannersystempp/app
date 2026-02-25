import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import type { Supplier } from '@/contexts/data/types';

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (teamId?: string) => [...supplierKeys.lists(), { teamId }] as const,
};

const fetchSuppliers = async (teamId: string): Promise<Array<Pick<Supplier, 'id' | 'team_id' | 'name'>>> => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, team_id, name')
    .eq('team_id', teamId)
    .order('name');

  if (error) throw error;
  return (data || []).map((s) => ({ id: s.id, team_id: s.team_id, name: s.name || '' }));
};

export const useSuppliersQuery = () => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  return useQuery({
    queryKey: supplierKeys.list(activeTeam?.id),
    queryFn: () => fetchSuppliers(activeTeam!.id),
    enabled: !!user && !!activeTeam?.id,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

