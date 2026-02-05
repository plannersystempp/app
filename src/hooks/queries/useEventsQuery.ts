import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { useBroadcastInvalidation } from './useBroadcastInvalidation';
import type { Event } from '@/contexts/EnhancedDataContext';

// Query keys for consistent caching
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (teamId?: string) => [...eventKeys.lists(), { teamId }] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
};

// OTIMIZADO - Fetch eventos dos últimos 12 meses
const fetchEvents = async (teamId: string): Promise<Event[]> => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data, error } = await supabase
    .from('events')
    .select('id, team_id, name, description, start_date, end_date, status, created_at, location, client_contact_phone, payment_due_date, setup_start_date, setup_end_date, default_entry_time, default_exit_time, event_revenue')
    .eq('team_id', teamId)
    .gte('created_at', twelveMonthsAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(event => ({
    id: event.id,
    team_id: event.team_id,
    name: event.name || '',
    description: event.description || '',
    start_date: event.start_date || '',
    end_date: event.end_date || '',
    status: event.status as Event['status'] || 'planejado',
    user_id: '',
    created_at: event.created_at || '',
    location: event.location || '',
    client_contact_phone: event.client_contact_phone || '',
    payment_due_date: event.payment_due_date || '',
    setup_start_date: event.setup_start_date || '',
    setup_end_date: event.setup_end_date || '',
    default_entry_time: event.default_entry_time || '',
    default_exit_time: event.default_exit_time || '',
  }));
};

// Hook to get events for the active team (OTIMIZADO - cache 3 min)
export const useEventsQuery = () => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  return useQuery({
    queryKey: eventKeys.list(activeTeam?.id),
    queryFn: () => fetchEvents(activeTeam!.id),
    enabled: !!user && !!activeTeam?.id,
    staleTime: 10000, // ⚡ OTIMIZADO: 10 segundos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook to create a new event
export const useCreateEventMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (event: Omit<Event, 'id' | 'created_at' | 'team_id' | 'user_id'>) => {
      if (!activeTeam) throw new Error('No active team');

      const { data, error } = await supabase
        .from('events')
        .insert([{ ...event, team_id: activeTeam.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newEvent) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: eventKeys.list(activeTeam?.id) });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData<Event[]>(eventKeys.list(activeTeam?.id));

      // Optimistically update to the new value
      if (previousEvents && activeTeam) {
        const optimisticEvent: Event = {
          id: `temp-${Date.now()}`,
          team_id: activeTeam.id,
          user_id: '',
          created_at: new Date().toISOString(),
          ...newEvent,
        };

        queryClient.setQueryData<Event[]>(
          eventKeys.list(activeTeam.id),
          old => [optimisticEvent, ...(old || [])]
        );
      }

      return { previousEvents };
    },
    onError: (err, newEvent, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEvents && activeTeam) {
        queryClient.setQueryData(eventKeys.list(activeTeam.id), context.previousEvents);
      }
      
      toast({
        title: "Erro",
        description: "Falha ao criar evento",
        variant: "destructive"
      });
    },
    onSuccess: (data) => {
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: eventKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(eventKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso!",
      });
    },
    onSettled: () => {
      // Invalidar queries inativas (para próxima montagem)
      queryClient.invalidateQueries({ 
        queryKey: eventKeys.all,
        refetchType: 'none'
      });
    },
  });
};

// Hook to update an event
export const useUpdateEventMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (event: Event) => {
      const { data, error } = await supabase
        .from('events')
        .update({
          name: event.name,
          description: event.description,
          start_date: event.start_date,
          end_date: event.end_date,
          payment_due_date: event.payment_due_date,
          location: event.location,
          client_contact_phone: event.client_contact_phone,
          setup_start_date: event.setup_start_date,
          setup_end_date: event.setup_end_date,
          default_entry_time: event.default_entry_time ?? null,
          default_exit_time: event.default_exit_time ?? null,
          status: event.status,
        })
        .eq('id', event.id)
        .eq('team_id', activeTeam!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (updatedEvent) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.list(activeTeam?.id) });

      const previousEvents = queryClient.getQueryData<Event[]>(eventKeys.list(activeTeam?.id));

      // Optimistically update
      if (previousEvents && activeTeam) {
        queryClient.setQueryData<Event[]>(
          eventKeys.list(activeTeam.id),
          old => old?.map(event => event.id === updatedEvent.id ? updatedEvent : event) || []
        );
      }

      return { previousEvents };
    },
    onError: (err, updatedEvent, context) => {
      if (context?.previousEvents && activeTeam) {
        queryClient.setQueryData(eventKeys.list(activeTeam.id), context.previousEvents);
      }
      
      toast({
        title: "Erro",
        description: "Falha ao atualizar evento",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: eventKeys.all,
        refetchType: 'active'
      });
      
      // Também invalidar alocações pois podem depender dos horários do evento
      queryClient.invalidateQueries({ 
        queryKey: ['allocations'],
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(eventKeys.all);
      broadcast(['allocations']);
      
      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: eventKeys.all,
        refetchType: 'none'
      });
    },
  });
};

// Hook to delete an event
export const useDeleteEventMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('team_id', activeTeam!.id);

      if (error) throw error;
      return eventId;
    },
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.list(activeTeam?.id) });

      const previousEvents = queryClient.getQueryData<Event[]>(eventKeys.list(activeTeam?.id));

      // Optimistically remove the event
      if (previousEvents && activeTeam) {
        queryClient.setQueryData<Event[]>(
          eventKeys.list(activeTeam.id),
          old => old?.filter(event => event.id !== eventId) || []
        );
      }

      return { previousEvents };
    },
    onError: (err, eventId, context) => {
      if (context?.previousEvents && activeTeam) {
        queryClient.setQueryData(eventKeys.list(activeTeam.id), context.previousEvents);
      }
      
      toast({
        title: "Erro",
        description: "Falha ao excluir evento",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: eventKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(eventKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Evento excluído com sucesso!",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: eventKeys.all,
        refetchType: 'none'
      });
    },
  });
};
