import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { useBroadcastInvalidation } from './useBroadcastInvalidation';
import { fetchPersonnelByRole } from '@/services/personnelService';
import { supabase } from '@/integrations/supabase/client';
import type { Personnel } from '@/contexts/EnhancedDataContext';
import type { PersonnelFormData } from '@/types/personnelForm';
import { sanitizePersonnelData } from '@/utils/dataTransform';
import { logger } from '@/utils/logger';
import type { PersonnelFunctionsRepository, PersonnelFunctionRow } from '@/services/personnelFunctionsService';
import {
  buildPersonnelFunctionRows,
  insertPersonnelFunctions,
  replacePersonnelFunctions,
  upsertPersonnelFunctionCustomValues,
} from '@/services/personnelFunctionsService';

const createSupabasePersonnelFunctionsRepository = (): PersonnelFunctionsRepository => {
  return {
    listByPersonnelId: async ({ teamId, personnelId }) => {
      const { data, error } = await supabase
        .from('personnel_functions')
        .select('personnel_id, function_id, team_id, is_primary, custom_cache, custom_overtime')
        .eq('personnel_id', personnelId)
        .eq('team_id', teamId);
      return { data: (data ?? []) as unknown as PersonnelFunctionRow[], error };
    },
    deleteByPersonnelId: async ({ teamId, personnelId }) => {
      const { error } = await supabase
        .from('personnel_functions')
        .delete()
        .eq('personnel_id', personnelId)
        .eq('team_id', teamId);
      return { error };
    },
    deleteByFunctionIds: async ({ teamId, personnelId, functionIds }) => {
      if (functionIds.length === 0) return { error: null };
      const { error } = await supabase
        .from('personnel_functions')
        .delete()
        .eq('personnel_id', personnelId)
        .eq('team_id', teamId)
        .in('function_id', functionIds);
      return { error };
    },
    insert: async (rows) => {
      const { error } = await supabase.from('personnel_functions').insert(rows);
      return { error };
    },
    upsert: async (rows, onConflict) => {
      const { error } = await supabase.from('personnel_functions').upsert(rows, { onConflict });
      return { error };
    },
  };
};

// Query keys for consistent caching (SIMPLIFIED)
export const personnelKeys = {
  all: ['personnel'] as const,
  list: (teamId?: string) => ['personnel', 'list', teamId] as const,
  paginated: (teamId?: string, params?: any) => ['personnel', 'paginated', teamId, params] as const,
  detail: (id: string) => ['personnel', 'detail', id] as const,
};

// FASE 2: Fetch personnel usando RPC otimizada (1 query em vez de 2)
const fetchPersonnelWithFunctions = async (teamId: string, userRole?: string | null): Promise<Personnel[]> => {
  logger.personnel.fetch({ teamId, userRole });
  
  try {
    // Para admins e superadmins, usar RPC otimizada que faz JOIN no banco
    if (userRole === 'admin' || userRole === 'superadmin') {
      logger.query.start('get_personnel_with_functions_v2');
      
      const { data, error } = await supabase.rpc('get_personnel_with_functions_v2', {
        p_team_id: teamId
      });

      if (error) {
        logger.query.error('get_personnel_with_functions_v2', error);
        throw error;
      }

      logger.query.success('get_personnel_with_functions_v2', data?.length || 0);
      
      // Transform RPC result to Personnel format
      const personnelWithFunctions: Personnel[] = (data || []).map(person => {
        // Parse functions JSONB to array
        let parsedFunctions: any[] = [];
        if (person.functions) {
          try {
            parsedFunctions = typeof person.functions === 'string' 
              ? JSON.parse(person.functions)
              : person.functions as any[];
          } catch (e) {
            console.error('[fetchPersonnelWithFunctions] Error parsing functions:', e);
            parsedFunctions = [];
          }
        }

        return {
          ...person,
          functions: parsedFunctions.map((f: any) => ({
            ...f,
            custom_cache: f.custom_cache !== null && f.custom_cache !== undefined ? Number(f.custom_cache) : undefined,
            custom_overtime: f.custom_overtime !== null && f.custom_overtime !== undefined ? Number(f.custom_overtime) : undefined
          })),
          primaryFunctionId: person.primary_function_id,
          type: (person.type === 'fixo' || person.type === 'freelancer') ? person.type : 'freelancer',
          shirt_size: person.shirt_size as Personnel['shirt_size'] || undefined,
          monthly_salary: person.monthly_salary || 0,
          event_cache: person.event_cache || 0,
          overtime_rate: person.overtime_rate || 0,
        };
      });

      return personnelWithFunctions;
    }

    // Para coordinators (dados redacted), manter lógica antiga de 2 queries
    logger.personnel.info('FETCH_REDACTED', { teamId });
    const personnelData = await fetchPersonnelByRole(teamId, userRole);
    logger.query.success('personnel_redacted', personnelData.length);
    
    // Fetch personnel functions associations
    const { data: personnelFunctionsData, error: personnelFunctionsError } = await supabase
      .from('personnel_functions')
      .select('personnel_id, function_id, is_primary, custom_cache, custom_overtime, functions:function_id(id, name, description)')
      .eq('team_id', teamId);

    if (personnelFunctionsError) {
      logger.query.error('personnel_functions', personnelFunctionsError);
    }

    // Map personnel with their functions
    const personnelWithFunctions: Personnel[] = personnelData.map(person => {
      const personFunctionRows = (personnelFunctionsData || [])
        .filter(pf => pf.personnel_id === person.id);

      const primaryFunctionId = personFunctionRows.find(pf => (pf as any).is_primary)?.function_id as string | undefined;

      const personFunctions = personFunctionRows
        .map(pf => {
          const func = pf.functions as any;
          if (func) {
            return {
              ...func,
              custom_cache: pf.custom_cache,
              custom_overtime: pf.custom_overtime
            };
          }
          return null;
        })
        .filter(f => f != null) as any[];

      const orderedFunctions = primaryFunctionId
        ? personFunctions.sort((a, b) => (a.id === primaryFunctionId ? -1 : b.id === primaryFunctionId ? 1 : 0))
        : personFunctions;

      return {
        ...person,
        functions: orderedFunctions,
        primaryFunctionId,
        type: (person.type === 'fixo' || person.type === 'freelancer') ? person.type : 'freelancer',
        monthly_salary: person.monthly_salary || 0,
        event_cache: person.event_cache || 0,
        overtime_rate: person.overtime_rate || 0,
      };
    });

    logger.personnel.info('FETCH_SUCCESS', { count: personnelWithFunctions.length });
    return personnelWithFunctions;
  } catch (error) {
    logger.personnel.error('FETCH_ERROR', error);
    throw error;
  }
};

// Hook to get personnel for the active team (OTIMIZADO - sem cache-busting desnecessário)
export const usePersonnelQuery = () => {
  const { user } = useAuth();
  const { activeTeam, userRole } = useTeam();

  return useQuery({
    queryKey: personnelKeys.list(activeTeam?.id),
    queryFn: async () => {
      // Passar userRole para evitar RPCs redundantes
      return fetchPersonnelWithFunctions(activeTeam!.id, userRole);
    },
    enabled: !!user && !!activeTeam?.id,
    staleTime: 10000, // ⚡ OTIMIZADO: 10 segundos
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export interface UsePersonnelPaginatedOptions {
  page: number;
  perPage: number;
  search?: string;
  type?: string;
  functionId?: string;
  sortBy?: string;
}

// Helper for transform
const transformPersonnel = (person: any): Personnel => {
  const personFunctions = (person.personnel_functions || [])
    .map((pf: any) => {
      const f = pf.functions;
      if (!f) return null;
      return {
        ...f,
        custom_cache: pf.custom_cache !== null && pf.custom_cache !== undefined ? Number(pf.custom_cache) : undefined,
        custom_overtime: pf.custom_overtime !== null && pf.custom_overtime !== undefined ? Number(pf.custom_overtime) : undefined,
      };
    })
    .filter((f: any) => f != null);
  const primaryFunctionData = person.personnel_functions?.find((pf: any) => pf.is_primary);
  return {
    ...person,
    functions: personFunctions,
    primaryFunctionId: primaryFunctionData?.function_id,
    type: (person.type === 'fixo' || person.type === 'freelancer') ? person.type : 'freelancer',
    monthly_salary: person.monthly_salary || 0,
    event_cache: person.event_cache || 0,
    overtime_rate: person.overtime_rate || 0,
    shirt_size: person.shirt_size || undefined,
  };
};

export const fetchPersonnelPaginated = async (
  teamId: string,
  options: UsePersonnelPaginatedOptions
) => {
  const { page, perPage, search, type, functionId, sortBy } = options;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // Rating Sort Logic
  const isRatingSort = sortBy === 'rating_desc' || sortBy === 'rating_asc';
  
  if (isRatingSort) {
    try {
      let query = supabase
        .from('personnel_with_rating')
        .select('id', { count: 'exact' })
        .eq('team_id', teamId);

      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      if (type && type !== 'all') query = query.eq('type', type);
      
      query = query.order('average_rating', { ascending: sortBy === 'rating_asc' });
      
      const { data: idsData, count, error } = await query.range(from, to);
      if (error) throw error;
      
      if (!idsData?.length) return { data: [], count: count || 0 };
      
      const ids = idsData.map((d: any) => d.id);
      
      const { data: fullData, error: fullError } = await supabase
        .from('personnel')
        .select(`
          *,
          personnel_functions!left(
            function_id,
            is_primary,
            custom_cache,
            custom_overtime,
            functions(id, name)
          )
        `)
        .in('id', ids);
        
      if (fullError) throw fullError;
      
      // Sort in JS
      const sortedData = ids.map(id => fullData.find(p => p.id === id)).filter(Boolean);
      
      // Transform
      const personnel = sortedData.map(transformPersonnel);
      return { data: personnel, count: count || 0 };
      
    } catch (err) {
      console.warn('View personnel_with_rating failed, falling back', err);
    }
  }

  // Standard Logic
  let query = supabase
    .from('personnel')
    .select(`
      *,
      personnel_functions!left(
        function_id,
        is_primary,
        custom_cache,
        custom_overtime,
        functions(id, name)
      )
    `, { count: 'exact' })
    .eq('team_id', teamId);

  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  if (type && type !== 'all') query = query.eq('type', type);
  if (functionId && functionId !== 'all') {
     query = supabase
       .from('personnel')
       .select(`
         *,
         personnel_functions!inner(
           function_id,
           is_primary,
           custom_cache,
           custom_overtime,
           functions(id, name)
         )
       `, { count: 'exact' })
       .eq('team_id', teamId)
       .eq('personnel_functions.function_id', functionId);
       
      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      if (type && type !== 'all') query = query.eq('type', type);
  }

  if (sortBy === 'name_desc') query = query.order('name', { ascending: false });
  else query = query.order('name', { ascending: true });

  const { data, count, error } = await query.range(from, to);
  if (error) {
    logger.query.error('personnel_paginated', error);
    throw error;
  }
  
  const personnel = (data || []).map(transformPersonnel);
  return { data: personnel, count: count || 0 };
};

export interface PersonnelExportOptions {
  search?: string;
  type?: 'all' | 'fixo' | 'freelancer';
  functionId?: string;
  sortBy?: 'name_asc' | 'name_desc' | 'rating_desc' | 'rating_asc';
}

const exportChunkSize = 1000;

const fetchAllPages = async <T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; count: number | null; error: any }>
): Promise<{ data: T[]; count: number } > => {
  let from = 0;
  let count = 0;
  const all: T[] = [];

  while (true) {
    const to = from + exportChunkSize - 1;
    const { data, error, count: pageCount } = await fetchPage(from, to);
    if (error) throw error;
    if (typeof pageCount === 'number') count = pageCount;

    const pageData = data || [];
    all.push(...pageData);
    if (pageData.length < exportChunkSize) break;
    from += exportChunkSize;
  }

  return { data: all, count };
};

export const fetchPersonnelForExport = async (
  teamId: string,
  options: PersonnelExportOptions
) => {
  const { search, type, functionId, sortBy } = options;

  const isRatingSort = sortBy === 'rating_desc' || sortBy === 'rating_asc';

  if (isRatingSort) {
    try {
      const idsResult = await fetchAllPages<{ id: string }>((from, to) => {
        let query = supabase
          .from('personnel_with_rating')
          .select('id', { count: 'exact' })
          .eq('team_id', teamId);

        if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        if (type && type !== 'all') query = query.eq('type', type);

        query = query.order('average_rating', { ascending: sortBy === 'rating_asc' });
        return query.range(from, to);
      });

      const ids = idsResult.data.map(row => row.id);
      if (ids.length === 0) return { data: [], count: idsResult.count };

      const fullRows: any[] = [];
      const idsBatchSize = 500;
      for (let i = 0; i < ids.length; i += idsBatchSize) {
        const batch = ids.slice(i, i + idsBatchSize);
        const { data: batchData, error: batchError } = await supabase
          .from('personnel')
          .select(`
            *,
            personnel_functions!left(
              function_id,
              is_primary,
              custom_cache,
              custom_overtime,
              functions(id, name)
            )
          `)
          .in('id', batch);

        if (batchError) throw batchError;
        fullRows.push(...(batchData || []));
      }

      const byId = new Map<string, any>(fullRows.map(row => [row.id, row]));
      let orderedRows = ids.map(id => byId.get(id)).filter(Boolean);
      if (functionId && functionId !== 'all') {
        orderedRows = orderedRows.filter((row: any) =>
          (row.personnel_functions || []).some((pf: any) => pf.function_id === functionId)
        );
      }
      return {
        data: orderedRows.map(transformPersonnel),
        count: orderedRows.length,
      };
    } catch (err) {
      logger.query.warn('personnel_export_rating_fallback', err);
    }
  }

  const fullResult = await fetchAllPages<any>((from, to) => {
    let query = supabase
      .from('personnel')
      .select(`
        *,
        personnel_functions!left(
          function_id,
          is_primary,
          custom_cache,
          custom_overtime,
          functions(id, name)
        )
      `, { count: 'exact' })
      .eq('team_id', teamId);

    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    if (type && type !== 'all') query = query.eq('type', type);
    if (functionId && functionId !== 'all') {
      query = supabase
        .from('personnel')
        .select(`
          *,
          personnel_functions!inner(
            function_id,
            is_primary,
            custom_cache,
            custom_overtime,
            functions(id, name)
          )
        `, { count: 'exact' })
        .eq('team_id', teamId)
        .eq('personnel_functions.function_id', functionId);

      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      if (type && type !== 'all') query = query.eq('type', type);
    }

    if (sortBy === 'name_desc') query = query.order('name', { ascending: false });
    else query = query.order('name', { ascending: true });

    return query.range(from, to);
  });

  return { data: fullResult.data.map(transformPersonnel), count: fullResult.count };
};

export interface PersonnelStats {
  total_count: number;
  fixed_count: number;
  freelancer_count: number;
  avg_cache: number;
}

export const fetchPersonnelStats = async (
  teamId: string,
  search?: string,
  type?: string,
  functionId?: string
): Promise<PersonnelStats> => {
  const { data, error } = await supabase.rpc('get_personnel_stats', {
    p_team_id: teamId,
    p_search: search || null,
    p_type: type === 'all' ? null : type,
    p_function_id: functionId === 'all' ? null : functionId,
  });

  if (error) {
    console.error('Error fetching personnel stats:', error);
    throw error;
  }

  const stats = data?.[0] || {
    total_count: 0,
    fixed_count: 0,
    freelancer_count: 0,
    avg_cache: 0,
  };

  return {
    total_count: Number(stats.total_count),
    fixed_count: Number(stats.fixed_count),
    freelancer_count: Number(stats.freelancer_count),
    avg_cache: Number(stats.avg_cache),
  };
};

export const usePersonnelStatsQuery = (
  search?: string,
  type?: string,
  functionId?: string
) => {
  const { activeTeam } = useTeam();
  
  return useQuery({
    queryKey: ['personnel', 'stats', activeTeam?.id, { search, type, functionId }],
    queryFn: () => {
      if (!activeTeam?.id) return { total_count: 0, fixed_count: 0, freelancer_count: 0, avg_cache: 0 };
      return fetchPersonnelStats(activeTeam.id, search, type, functionId);
    },
    enabled: !!activeTeam?.id,
    staleTime: 30000, 
  });
};

export const usePersonnelPaginatedQuery = (options: UsePersonnelPaginatedOptions) => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  return useQuery({
    queryKey: personnelKeys.paginated(activeTeam?.id, options),
    queryFn: () => {
      if (!activeTeam?.id) return { data: [], count: 0 };
      return fetchPersonnelPaginated(activeTeam.id, options);
    },
    enabled: !!user && !!activeTeam?.id,
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });
};

// Hook to create new personnel
export const useCreatePersonnelMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();
  const personnelFunctionsRepo = createSupabasePersonnelFunctionsRepository();

  return useMutation({
    mutationFn: async (personnelData: PersonnelFormData) => {
      logger.personnel.create({ name: personnelData.name, type: personnelData.type });
      if (!activeTeam) throw new Error('No active team');

      const { functionIds, pixKey, primaryFunctionId, functionCaches, functionOvertimes, ...restData } = personnelData;
      
      // Usar utilitário centralizado de sanitização
      const sanitizedData = sanitizePersonnelData(restData);

      const dataToInsert: any = {
        ...sanitizedData,
        team_id: activeTeam.id
      };
      
      // Create personnel record
      const { data: personnelResult, error: personnelError } = await supabase
        .from('personnel')
        .insert([dataToInsert])
        .select()
        .single();

      if (personnelError) throw personnelError;

      // Handle PIX key if provided
      if (pixKey && pixKey.trim()) {
        try {
          await supabase.functions.invoke('pix-key/set', {
            body: {
              personnel_id: personnelResult.id,
              pix_key: pixKey.trim()
            }
          });
        } catch (pixError) {
          console.warn('PIX key could not be saved:', pixError);
          // Don't fail the entire operation for PIX key issues
        }
      }

      // Associate functions if provided
      if (functionIds && functionIds.length > 0) {
        const rows = buildPersonnelFunctionRows({
          personnelId: personnelResult.id,
          teamId: activeTeam.id,
          functionIds,
          primaryFunctionId: primaryFunctionId || undefined,
          functionCaches: functionCaches || undefined,
          functionOvertimes: functionOvertimes || undefined,
        });

        try {
          await insertPersonnelFunctions(personnelFunctionsRepo, rows);
        } catch (functionsError) {
          try {
            await supabase.from('personnel').delete().eq('id', personnelResult.id).eq('team_id', activeTeam.id);
          } catch (rollbackError) {
            logger.personnel.error('CREATE_ROLLBACK_ERROR', rollbackError);
          }
          throw functionsError;
        }
      }

      return personnelResult;
    },
    onMutate: async (data: PersonnelFormData) => {
      logger.personnel.optimistic({ action: 'CREATE', name: data.name });
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: personnelKeys.list(activeTeam!.id) });

      // Snapshot the previous value
      const previousPersonnel = queryClient.getQueryData<Personnel[]>(personnelKeys.list(activeTeam!.id));

      // Optimistically update to the new value
      if (previousPersonnel) {
        const optimisticPersonnel: Personnel = {
          id: `temp-${Date.now()}`,
          team_id: activeTeam!.id,
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          type: data.type,
          monthly_salary: data.monthly_salary || 0,
          event_cache: data.event_cache || 0,
          overtime_rate: data.overtime_rate || 0,
          cpf: data.cpf || undefined,
          cnpj: data.cnpj || undefined,
          photo_url: data.photo_url || undefined,
          shirt_size: (data.shirt_size as 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG') || undefined,
          address_zip_code: data.address_zip_code || undefined,
          address_street: data.address_street || undefined,
          address_number: data.address_number || undefined,
          address_complement: data.address_complement || undefined,
          address_neighborhood: data.address_neighborhood || undefined,
          address_city: data.address_city || undefined,
          address_state: data.address_state || undefined,
          primaryFunctionId: data.primaryFunctionId || undefined,
          functions: [],
          created_at: new Date().toISOString(),
        };

        // CORREÇÃO: Garantir que o placeholder seja adicionado imediatamente
        const updatedData = [...previousPersonnel, optimisticPersonnel];
        queryClient.setQueryData<Personnel[]>(
          personnelKeys.list(activeTeam!.id),
          updatedData
        );
        
        logger.cache.hit(`personnel_list_${activeTeam!.id}`);
      }

      return { previousPersonnel };
    },
    onSuccess: (data) => {
      logger.personnel.info('CREATE_SUCCESS', { id: data.id, name: data.name });
      
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: personnelKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(personnelKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Pessoal adicionado com sucesso!",
      });
    },
    onSettled: () => {
      // Invalidar queries inativas (para próxima montagem)
      queryClient.invalidateQueries({ 
        queryKey: personnelKeys.all,
        refetchType: 'none'
      });
    },
    onError: (error, data, context) => {
      // Rollback to previous state on error
      if (context?.previousPersonnel) {
        queryClient.setQueryData(
          personnelKeys.list(activeTeam!.id),
          context.previousPersonnel
        );
      }
      
      console.error('Error creating personnel:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar pessoal",
        variant: "destructive"
      });
    },
  });
};

// Hook to update personnel
export const useUpdatePersonnelMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();
  const personnelFunctionsRepo = createSupabasePersonnelFunctionsRepository();

  return useMutation({
    mutationFn: async ({ id, ...personnelData }: { id: string } & Partial<PersonnelFormData>) => {
      logger.personnel.update({ id, changes: Object.keys(personnelData) });
      const { functionIds, pixKey, primaryFunctionId, functionCaches, functionOvertimes, ...restData } = personnelData;

      // Usar utilitário centralizado de sanitização
      const dataToUpdate = sanitizePersonnelData(restData);

      // Update personnel record
      const { data, error } = await supabase
        .from('personnel')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('team_id', activeTeam!.id)
        .select()
        .single();

      if (error) throw error;

      // Handle PIX key update if provided
      if (pixKey !== undefined) {
        try {
          await supabase.functions.invoke('pix-key/set', {
            body: {
              personnel_id: id,
              pix_key: pixKey.trim() || null
            }
          });
        } catch (pixError) {
          console.warn('PIX key could not be updated:', pixError);
        }
      }

      // Update function associations if provided
      if (functionIds !== undefined) {
        const rows = buildPersonnelFunctionRows({
          personnelId: id,
          teamId: activeTeam!.id,
          functionIds,
          primaryFunctionId: primaryFunctionId || undefined,
          functionCaches: functionCaches || undefined,
          functionOvertimes: functionOvertimes || undefined,
        });

        await replacePersonnelFunctions(personnelFunctionsRepo, {
          personnelId: id,
          teamId: activeTeam!.id,
          rows,
        });
      } else {
        // Apenas atualizar caches/horas extras existentes quando funções não foram alteradas
        await upsertPersonnelFunctionCustomValues(personnelFunctionsRepo, {
          personnelId: id,
          teamId: activeTeam!.id,
          functionCaches: functionCaches || undefined,
          functionOvertimes: functionOvertimes || undefined,
        });
      }

      return data;
    },
    onMutate: async ({ id, ...data }) => {
      logger.personnel.optimistic({ action: 'UPDATE', id, fields: Object.keys(data) });
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: personnelKeys.list(activeTeam!.id) });

      // Snapshot the previous value
      const previousPersonnel = queryClient.getQueryData<Personnel[]>(personnelKeys.list(activeTeam!.id));

      // Optimistically update to the new value
      if (previousPersonnel) {
        queryClient.setQueryData<Personnel[]>(
          personnelKeys.list(activeTeam!.id),
          previousPersonnel.map(p => 
            p.id === id 
              ? { 
                  ...p, 
                  ...data
                } as Personnel
              : p
          )
        );
        logger.cache.hit(`personnel_list_${activeTeam!.id}`);
      }

      return { previousPersonnel };
    },
    onSuccess: (data) => {
      logger.personnel.info('UPDATE_SUCCESS', { id: data?.id });
      
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: personnelKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(personnelKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Pessoal atualizado com sucesso!",
      });
    },
    onSettled: () => {
      // Invalidar queries inativas (para próxima montagem)
      queryClient.invalidateQueries({ 
        queryKey: personnelKeys.all,
        refetchType: 'none'
      });
    },
    onError: (error, { id }, context) => {
      // Rollback to previous state on error
      if (context?.previousPersonnel) {
        queryClient.setQueryData(
          personnelKeys.list(activeTeam!.id),
          context.previousPersonnel
        );
      }
      
      console.error('Error updating personnel:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar pessoal",
        variant: "destructive"
      });
    },
  });
};

// Hook to delete personnel
export const useDeletePersonnelMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (personnelId: string) => {
      logger.personnel.delete({ id: personnelId, teamId: activeTeam?.id });
      
      const { data, error } = await supabase
        .from('personnel')
        .delete()
        .eq('id', personnelId)
        .eq('team_id', activeTeam!.id)
        .select();
      
      if (error) {
        logger.personnel.error('DELETE_ERROR', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        logger.personnel.warn('DELETE_NO_ROWS', { personnelId });
        throw new Error('Nenhum registro foi excluído. Verifique se o pessoal existe e se você tem permissões.');
      }
      
      logger.personnel.info('DELETE_SUCCESS', { id: personnelId });
      return personnelId;
    },
    onMutate: async (personnelId) => {
      logger.personnel.optimistic({ action: 'DELETE', id: personnelId });
      await queryClient.cancelQueries({ queryKey: personnelKeys.list(activeTeam?.id) });

      const previousPersonnel = queryClient.getQueryData<Personnel[]>(personnelKeys.list(activeTeam?.id));

      // Optimistically remove the personnel
      if (previousPersonnel && activeTeam) {
        queryClient.setQueryData<Personnel[]>(
          personnelKeys.list(activeTeam.id),
          old => old?.filter(person => person.id !== personnelId) || []
        );
        logger.cache.hit(`personnel_list_${activeTeam.id}`);
      }

      return { previousPersonnel };
    },
    onError: (err, personnelId, context) => {
      logger.personnel.error('DELETE_ROLLBACK', { id: personnelId, error: err });
      if (context?.previousPersonnel && activeTeam) {
        queryClient.setQueryData(personnelKeys.list(activeTeam.id), context.previousPersonnel);
        logger.cache.invalidate(`personnel_list_${activeTeam.id}`);
      }
      
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao excluir pessoal",
        variant: "destructive"
      });
    },
    onSuccess: (personnelId) => {
      logger.personnel.info('DELETE_COMPLETE', { id: personnelId });
      
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: personnelKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(personnelKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Pessoal excluído com sucesso!",
      });
    },
    onSettled: () => {
      // Invalidar queries inativas (para próxima montagem)
      queryClient.invalidateQueries({ 
        queryKey: personnelKeys.all,
        refetchType: 'none'
      });
      console.log('[DELETE PERSONNEL] onSettled - Invalidating queries');
      queryClient.invalidateQueries({ queryKey: personnelKeys.list(activeTeam?.id) });
    },
  });
};
