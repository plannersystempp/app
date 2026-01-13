/**
 * ⚠️ FASE 4: DEPRECATED - Este contexto está obsoleto
 * 
 * Use React Query hooks em vez deste contexto:
 * - usePersonnelQuery() / useCreatePersonnelMutation()
 * - useEventsQuery() / useCreateEventMutation()
 * - useAllocationsQuery() / useCreateAllocationMutation()
 * - useDivisionsQuery() / useCreateDivisionMutation()
 * - useWorkLogsQuery() / useCreateWorkLogMutation()
 * - useFunctionsQuery() / useCreateFunctionMutation()
 * 
 * Este contexto será removido em versões futuras.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useTeam } from './TeamContext';
import { useToast } from '@/hooks/use-toast';
import { fetchPersonnelByRole, type PersonnelRedacted } from '@/services/personnelService';
import { sanitizePersonnelData } from '@/utils/dataTransform';
import { logger } from '@/utils/logger';

// Aviso de depreciação no console
if (import.meta.env.DEV) console.warn('[DEPRECATED] EnhancedDataContext is deprecated. Use React Query hooks instead.');
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  fetchAllSupplierItems,
  createSupplierItem,
  updateSupplierItem,
  deleteSupplierItem,
  createEventSupplierCost,
  updateEventSupplierCost,
  deleteEventSupplierCost,
  createSupplierRating
} from '@/services/supplierService';
import type { Supplier, SupplierItem, EventSupplierCost, SupplierRating } from '@/contexts/data/types';

// Re-export types for easier imports
export type { Supplier, SupplierItem, EventSupplierCost, SupplierRating } from '@/contexts/data/types';

// Exportando as interfaces para uso em outros componentes
export interface Event {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  payment_due_date?: string;
  location?: string;
  client_contact_phone?: string;
  setup_start_date?: string;
  setup_end_date?: string;
  status?: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'concluido_pagamento_pendente';
  user_id: string;
  created_at: string;
}

export interface Personnel {
  id: string;
  team_id: string;
  name: string;
  email?: string;
  phone?: string;
  phone_secondary?: string;
  type: 'fixo' | 'freelancer';
  monthly_salary?: number;
  event_cache?: number;
  overtime_rate?: number;
  cpf?: string;
  cnpj?: string;
  photo_url?: string;
  shirt_size?: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG';
  address_zip_code?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  created_at: string;
  functions?: Func[]; // Array of associated functions
  primaryFunctionId?: string;
  // Redacted fields for coordinators
  email_masked?: string;
  phone_masked?: string;
  cpf_masked?: string;
  cnpj_masked?: string;
  salary_range?: string;
}

export interface Func {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  created_at: string;
  custom_cache?: number; // Cache específico para esta função (contexto de freelancer)
  custom_overtime?: number; // Hora extra específica para esta função
}

export interface Division {
  id: string;
  team_id: string;
  event_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  team_id: string;
  event_id: string;
  division_id: string;
  personnel_id: string;
  function_name: string;
  work_days: string[];
  event_specific_cache?: number;
  created_at: string;
}

export interface WorkRecord {
  id: string;
  team_id: string;
  employee_id: string;
  event_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours: number;
  total_pay: number;
  created_at: string;
  logged_by_id?: string;
  date_logged?: string;
}

interface PersonnelFormData {
  name: string;
  email: string;
  phone: string;
  type: 'fixo' | 'freelancer';
  monthly_salary: number;
  event_cache: number;
  overtime_rate: number;
  cpf: string;
  cnpj: string;
  functionIds: string[];
  primaryFunctionId?: string;
  pixKey?: string;
}

interface EnhancedDataContextType {
  events: Event[];
  personnel: Personnel[];
  functions: Func[];
  divisions: Division[];
  assignments: Assignment[];
  workLogs: WorkRecord[];
  suppliers: Supplier[];
  supplierItems: SupplierItem[];
  eventSupplierCosts: EventSupplierCost[];
  supplierRatings: SupplierRating[];
  loading: boolean;
  addEvent: (event: Omit<Event, 'id' | 'created_at' | 'team_id'>) => Promise<string | null>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addPersonnel: (personnel: PersonnelFormData) => Promise<string | null>;
  updatePersonnel: (id: string, personnel: Partial<PersonnelFormData>) => Promise<void>;
  deletePersonnel: (id: string) => Promise<void>;
  addFunction: (func: Omit<Func, 'id' | 'created_at' | 'team_id'>) => Promise<string | null>;
  updateFunction: (func: Func) => Promise<void>;
  deleteFunction: (id: string) => Promise<void>;
  addDivision: (division: Omit<Division, 'id' | 'created_at' | 'team_id'>) => Promise<string | null>;
  updateDivision: (division: Division) => Promise<void>;
  deleteDivision: (id: string) => Promise<void>;
  addAssignment: (assignment: Omit<Assignment, 'id' | 'created_at' | 'team_id'>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  updateAssignment: (assignment: Assignment) => Promise<void>;
  refreshAssignments: () => Promise<void>;
  addWorkLog: (workLog: Omit<WorkRecord, 'id' | 'created_at' | 'team_id'>) => Promise<void>;
  updateWorkLog: (workLog: WorkRecord) => Promise<void>;
  deleteWorkLog: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'team_id' | 'average_rating' | 'total_ratings'>) => Promise<string | null>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  addSupplierItem: (item: Omit<SupplierItem, 'id' | 'created_at' | 'updated_at'>) => Promise<string | null>;
  updateSupplierItem: (item: SupplierItem) => Promise<void>;
  deleteSupplierItem: (id: string) => Promise<void>;
  addEventSupplierCost: (cost: Omit<EventSupplierCost, 'id' | 'created_at' | 'updated_at' | 'total_amount' | 'team_id'>) => Promise<string | null>;
  updateEventSupplierCost: (cost: EventSupplierCost) => Promise<void>;
  deleteEventSupplierCost: (id: string) => Promise<void>;
  addSupplierRating: (rating: Omit<SupplierRating, 'id' | 'created_at' | 'team_id' | 'rated_by'>) => Promise<void>;
}

const EnhancedDataContext = createContext<EnhancedDataContextType | undefined>(undefined);

// Type guard to check if an object is a valid data object (not an error)
const isValidDataObject = (obj: any): obj is Record<string, any> => {
  return obj && typeof obj === 'object' && !obj.error && !obj.message && !obj.code;
};

export const EnhancedDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [functions, setFunctions] = useState<Func[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [eventSupplierCosts, setEventSupplierCosts] = useState<EventSupplierCost[]>([]);
  const [supplierRatings, setSupplierRatings] = useState<SupplierRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const { toast } = useToast();

  const fetchPersonnelWithFunctions = async (teamId: string): Promise<Personnel[]> => {
    logger.query.start('personnelWithFunctions');
    
    try {
      // Use the personnel service that handles role-based access
      const personnelData = await fetchPersonnelByRole(teamId);
      logger.query.success('personnelWithFunctions', personnelData.length);
      
      // Fetch personnel functions associations (safe to fetch for all roles)
      const { data: personnelFunctionsData, error: personnelFunctionsError } = await supabase
        .from('personnel_functions')
        .select(`
          personnel_id,
          function_id,
          is_primary,
          custom_cache,
          custom_overtime,
          functions:function_id (
            id,
            name,
            description
          )
        `)
        .eq('team_id', teamId);

      if (personnelFunctionsError) {
        logger.query.error('personnelFunctions', personnelFunctionsError);
        // Continue without functions rather than failing completely
      }

      // Map personnel with their functions
      const personnelWithFunctions: Personnel[] = personnelData.map(person => {
        const pfRows = (personnelFunctionsData || []).filter(pf => pf.personnel_id === person.id);
        const primaryRow = pfRows.find(pf => pf.is_primary);
        const primaryFunctionId = primaryRow?.function_id as string | undefined;
        const personFunctions = pfRows
          .map(pf => {
            const f = pf.functions as Func | null;
            if (!f) return null;
            return {
              ...f,
              custom_cache: pf.custom_cache != null ? Number(pf.custom_cache) : undefined,
              custom_overtime: pf.custom_overtime != null ? Number(pf.custom_overtime) : undefined,
            } as Func;
          })
          .filter(f => f != null) as Func[];

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

      logger.query.success('personnelWithFunctionsProcessed', personnelWithFunctions.length);
      return personnelWithFunctions;
    } catch (error) {
      logger.query.error('fetchPersonnelWithFunctions', error);
      return [];
    }
  };

  const initializeData = async () => {
    if (!user) {
      return;
    }

    // Super admins não precisam de equipe ativa - podem ver todos os dados
    const isSuperAdmin = user.role === 'superadmin';
    if (!activeTeam && !isSuperAdmin) {
      return;
    }

    let startedLoadingFlag = !isInitialized;
    try {
      if (startedLoadingFlag) {
        setLoading(true);
      }
      logger.query.info('INIT_START', isSuperAdmin ? 'superadmin' : `team:${activeTeam?.id}`);

      // Para super admins, buscar todos os dados sem filtro de team_id
      // Para usuários normais, filtrar por team_id
      const [
        eventsResult,
        functionsResult,
        divisionsResult,
        assignmentsResult,
        workRecordsResult,
        suppliersData,
        supplierItemsData,
        eventCostsResult
      ] = await Promise.all([
        isSuperAdmin 
          ? supabase.from('events').select('*')
          : supabase.from('events').select('*').eq('team_id', activeTeam!.id),
        isSuperAdmin 
          ? supabase.from('functions').select('*')
          : supabase.from('functions').select('*').eq('team_id', activeTeam!.id),
        isSuperAdmin 
          ? supabase.from('event_divisions').select('*')
          : supabase.from('event_divisions').select('*').eq('team_id', activeTeam!.id),
        isSuperAdmin 
          ? supabase.from('personnel_allocations').select('*')
          : supabase.from('personnel_allocations').select('*').eq('team_id', activeTeam!.id),
        isSuperAdmin 
          ? supabase.from('work_records').select('*')
          : supabase.from('work_records').select('*').eq('team_id', activeTeam!.id),
        isSuperAdmin
          ? Promise.resolve([])
          : fetchSuppliers(activeTeam!.id),
        isSuperAdmin
          ? Promise.resolve([])
          : fetchAllSupplierItems(activeTeam!.id),
        isSuperAdmin
          ? supabase.from('event_supplier_costs').select('*')
          : supabase.from('event_supplier_costs').select('*').eq('team_id', activeTeam!.id)
      ]);

      // Fetch personnel with functions using the new method
      const personnelWithFunctions = isSuperAdmin 
        ? [] // TODO: Implement super admin personnel fetch if needed
        : await fetchPersonnelWithFunctions(activeTeam!.id);

      // Process events
      if (eventsResult.data && Array.isArray(eventsResult.data)) {
        const validEvents: Event[] = [];
        
        for (const event of eventsResult.data) {
          if (isValidDataObject(event)) {
            validEvents.push({
              id: event.id || '',
              team_id: event.team_id || (activeTeam?.id || ''),
              name: event.name || '',
              description: event.description || '',
              start_date: event.start_date || '',
              end_date: event.end_date || '',
              payment_due_date: event.payment_due_date || '',
              setup_start_date: event.setup_start_date || '',
              setup_end_date: event.setup_end_date || '',
              location: event.location || '',
              client_contact_phone: event.client_contact_phone || '',
              status: event.status as 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' || 'planejado',
              user_id: '',
              created_at: event.created_at || ''
            });
          }
        }
        setEvents(validEvents);
      } else {
        setEvents([]);
      }
      
      // Set personnel with functions
      setPersonnel(personnelWithFunctions);

      // Set suppliers and supplier items
      setSuppliers(suppliersData || []);
      setSupplierItems(supplierItemsData || []);

      // Process supplier costs (with fallback by event_id if team_id missing)
      {
        let rawCosts: any[] = Array.isArray(eventCostsResult.data) ? eventCostsResult.data : [];

        // Fallback: if not superadmin and no costs by team_id, try by event_id list
        if (!isSuperAdmin && rawCosts.length === 0) {
          const teamEventIds = Array.isArray(eventsResult.data)
            ? eventsResult.data
                .filter((e: any) => isValidDataObject(e) && e.id)
                .map((e: any) => e.id)
            : [];

          if (teamEventIds.length > 0) {
            const { data: costsByEvents } = await supabase
              .from('event_supplier_costs')
              .select('*')
              .in('event_id', teamEventIds)
              .order('created_at', { ascending: false });
            rawCosts = Array.isArray(costsByEvents) ? costsByEvents : [];
          }
        }

        if (rawCosts.length > 0) {
          const validCosts: EventSupplierCost[] = [];
          for (const cost of rawCosts) {
            if (isValidDataObject(cost)) {
              const unitPrice = Number(cost.unit_price) || 0;
              const quantity = Number(cost.quantity) || 0;
              const totalAmount = (cost.total_amount != null && !Number.isNaN(Number(cost.total_amount)))
                ? Number(cost.total_amount)
                : unitPrice * quantity;
              validCosts.push({
                id: cost.id != null ? String(cost.id) : '',
                team_id: cost.team_id != null ? String(cost.team_id) : (activeTeam?.id || ''),
                event_id: cost.event_id != null ? String(cost.event_id) : '',
                supplier_id: cost.supplier_id != null ? String(cost.supplier_id) : null,
                supplier_name: cost.supplier_name || '',
                description: cost.description || '',
                category: cost.category || null,
                unit_price: unitPrice,
                quantity: quantity,
                total_amount: totalAmount,
                payment_status: (cost.payment_status as 'pending' | 'partially_paid' | 'paid') || 'pending',
                paid_amount: Number(cost.paid_amount) || 0,
                payment_date: cost.payment_date || null,
                notes: cost.notes || null,
                created_at: cost.created_at || new Date().toISOString(),
                updated_at: cost.updated_at || new Date().toISOString()
              });
            }
          }
          setEventSupplierCosts(validCosts);
        } else {
          setEventSupplierCosts([]);
        }
      }
      
      // Process functions
      if (functionsResult.data && Array.isArray(functionsResult.data)) {
        const validFunctions: Func[] = [];
        
        for (const func of functionsResult.data) {
          if (isValidDataObject(func)) {
            validFunctions.push({
              id: func.id || '',
              team_id: func.team_id || (activeTeam?.id || ''),
              name: func.name || '',
              description: func.description || '',
              created_at: func.created_at || ''
            });
          }
        }
        setFunctions(validFunctions);
      } else {
        setFunctions([]);
      }
      
      // Process divisions
      if (divisionsResult.data && Array.isArray(divisionsResult.data)) {
        const validDivisions: Division[] = [];
        
        for (const division of divisionsResult.data) {
          if (isValidDataObject(division)) {
            validDivisions.push({
              id: division.id || '',
              team_id: division.team_id || (activeTeam?.id || ''),
              event_id: division.event_id || '',
              name: division.name || '',
              description: division.description || '',
              created_at: division.created_at || ''
            });
          }
        }
        setDivisions(validDivisions);
      } else {
        setDivisions([]);
      }
      
      // Process assignments
      if (assignmentsResult.data && Array.isArray(assignmentsResult.data)) {
        const validAssignments: Assignment[] = [];
        
        for (const assignment of assignmentsResult.data) {
          if (isValidDataObject(assignment)) {
            validAssignments.push({
              id: assignment.id || '',
              team_id: assignment.team_id || (activeTeam?.id || ''),
              event_id: assignment.event_id || '',
              division_id: assignment.division_id || '',
              personnel_id: assignment.personnel_id || '',
              function_name: assignment.function_name || '',
              work_days: assignment.work_days || [],
              event_specific_cache: assignment.event_specific_cache || undefined,
              created_at: assignment.created_at || ''
            });
          }
        }
        setAssignments(validAssignments);
      } else {
        setAssignments([]);
      }
      
      // Process work records
      if (workRecordsResult.data && Array.isArray(workRecordsResult.data)) {
        const validWorkRecords: WorkRecord[] = [];
        
        for (const record of workRecordsResult.data) {
          if (isValidDataObject(record)) {
            validWorkRecords.push({
              id: record.id || '',
              team_id: record.team_id || (activeTeam?.id || ''),
              employee_id: record.employee_id || '',
              event_id: record.event_id || '',
              work_date: record.work_date || '',
              hours_worked: record.hours_worked || 0,
              overtime_hours: record.overtime_hours || 0,
              total_pay: record.total_pay || 0,
              created_at: record.created_at || '',
              logged_by_id: record.logged_by_id || undefined,
              date_logged: record.date_logged || undefined
            });
          }
        }
        setWorkLogs(validWorkRecords);
        logger.query.success('workRecords', validWorkRecords.length);
      } else {
        setWorkLogs([]);
        logger.query.warn('workRecords:EMPTY');
      }

      logger.query.info('INIT_COMPLETED');
      setIsInitialized(true);
    } catch (error) {
      logger.query.error('initializeData', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados da equipe",
        variant: "destructive"
      });
    } finally {
      if (startedLoadingFlag) {
        setLoading(false);
      }
    }
  };

  const addEvent = async (event: Omit<Event, 'id' | 'created_at' | 'team_id'>): Promise<string | null> => {
    if (!user || !activeTeam) {
      toast({
        title: "Erro",
        description: !user ? "Usuário não autenticado" : "Selecione uma equipe ativa",
        variant: "destructive"
      });
      return null;
    }

    try {
      // CORREÇÃO: Remove user_id da inserção, apenas adiciona team_id
      const { user_id, ...eventWithoutUserId } = event;
      const dataToInsert = {
        ...eventWithoutUserId,
        team_id: activeTeam.id
      };

      const { data, error } = await supabase
        .from('events')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) throw error;

      if (data && isValidDataObject(data)) {
        const newEvent: Event = {
          id: data.id,
          team_id: activeTeam?.id || '',
          name: data.name,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date,
          payment_due_date: data.payment_due_date,
          setup_start_date: data.setup_start_date,
          setup_end_date: data.setup_end_date,
          location: data.location,
          client_contact_phone: data.client_contact_phone,
          status: data.status as 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'concluido_pagamento_pendente' || 'planejado',
          user_id: '',
          created_at: data.created_at
        };
        // CORREÇÃO: Atualiza o estado local com o novo evento
        setEvents(prevEvents => [newEvent, ...prevEvents]);
        return data.id as string;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar evento",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateEvent = async (event: Event): Promise<void> => {
    if (!activeTeam) return;

    try {
      // 1. Envia a atualização para o banco
      const { error } = await supabase
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
          status: event.status
        })
        .eq('id', event.id)
        .eq('team_id', activeTeam.id);

      if (error) throw error;

      // 2. ATUALIZAÇÃO OTIMISTA: Atualiza o estado local imediatamente
      setEvents(prevEvents =>
        prevEvents.map(e => (e.id === event.id ? event : e))
      );

      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!",
      });

    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar evento",
        variant: "destructive"
      });
    }
  };

  const deleteEvent = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEvents(prevEvents => prevEvents.filter(event => event.id !== id));
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir evento",
        variant: "destructive"
      });
    }
  };

  const addPersonnel = async (personnelData: PersonnelFormData): Promise<string | null> => {
    if (!user || !activeTeam) {
      toast({
        title: "Erro de Contexto",
        description: "Nenhuma equipe ativa selecionada. Por favor, selecione uma equipe.",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Extract function IDs and sanitize data for database
      const { functionIds, primaryFunctionId } = personnelData;
      const sanitizedPersonnelData = sanitizePersonnelData(personnelData);

      // Insert personnel record
      const { data: newPersonnel, error: personnelError } = await supabase
        .from('personnel')
        .insert({ ...sanitizedPersonnelData, team_id: activeTeam.id })
        .select()
        .single();

      if (personnelError) throw personnelError;

      // Insert function associations
      if (functionIds.length > 0) {
        const functionAssociations = functionIds.map(functionId => ({
          personnel_id: newPersonnel.id,
          function_id: functionId,
          team_id: activeTeam.id,
          is_primary: primaryFunctionId ? functionId === primaryFunctionId : functionIds.length === 1 ? functionId === functionIds[0] : false
        }));

        const { error: functionsError } = await supabase
          .from('personnel_functions')
          .insert(functionAssociations);

        if (functionsError) {
          // If function associations fail, clean up the personnel record
          await supabase.from('personnel').delete().eq('id', newPersonnel.id);
          throw functionsError;
        }
      }

      // Refresh personnel list to get updated data with functions
      const updatedPersonnel = await fetchPersonnelWithFunctions(activeTeam.id);
      setPersonnel(updatedPersonnel);

      toast({
        title: "Sucesso",
        description: "Profissional adicionado com sucesso!",
      });

      return newPersonnel.id;

    } catch (error: any) {
      console.error('Error adding personnel:', error);
      
      // Mensagens específicas para erros comuns
      let errorMessage = "Não foi possível adicionar o profissional.";
      
      if (error?.code === '23505') {
        // Unique constraint violation
        if (error?.message?.includes('cpf') || error?.message?.includes('unique_personnel_cpf_per_team')) {
          errorMessage = "CPF já está em uso por outra pessoa da equipe";
        } else if (error?.message?.includes('cnpj') || error?.message?.includes('unique_personnel_cnpj_per_team')) {
          errorMessage = "CNPJ já está em uso por outra pessoa da equipe";
        } else {
          errorMessage = "Já existe uma pessoa com estes dados na equipe";
        }
      }
      
      toast({
        title: "Falha ao Adicionar",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    }
  };

  const updatePersonnel = async (id: string, personnelData: Partial<PersonnelFormData>): Promise<void> => {
    if (!activeTeam) return;

    try {
      // Extract function IDs and sanitize data for database
      const { functionIds, primaryFunctionId } = personnelData;
      const sanitizedPersonnelData = sanitizePersonnelData(personnelData);

      // Update personnel record
      const { error: personnelError } = await supabase
        .from('personnel')
        .update(sanitizedPersonnelData)
        .eq('id', id)
        .eq('team_id', activeTeam.id);

      if (personnelError) throw personnelError;

      // Update function associations if functionIds is provided
      if (functionIds !== undefined) {
        // Delete existing associations
        const { error: deleteError } = await supabase
          .from('personnel_functions')
          .delete()
          .eq('personnel_id', id)
          .eq('team_id', activeTeam.id);

        if (deleteError) throw deleteError;

        // Insert new associations
        if (functionIds.length > 0) {
          const functionAssociations = functionIds.map(functionId => ({
            personnel_id: id,
            function_id: functionId,
            team_id: activeTeam.id,
            is_primary: primaryFunctionId ? functionId === primaryFunctionId : functionIds.length === 1 ? functionId === functionIds[0] : false
          }));

          const { error: insertError } = await supabase
            .from('personnel_functions')
            .insert(functionAssociations);

          if (insertError) throw insertError;
        }
      }

      // Refresh personnel list to get updated data with functions
      const updatedPersonnel = await fetchPersonnelWithFunctions(activeTeam.id);
      setPersonnel(updatedPersonnel);

      toast({
        title: "Sucesso",
        description: "Profissional atualizado com sucesso!",
      });

    } catch (error: any) {
      console.error('Error updating personnel:', error);
      
      // Mensagens específicas para erros comuns
      let errorMessage = "Falha ao atualizar pessoa";
      
      if (error?.code === '23505') {
        // Unique constraint violation
        if (error?.message?.includes('cpf') || error?.message?.includes('unique_personnel_cpf_per_team')) {
          errorMessage = "CPF já está em uso por outra pessoa da equipe";
        } else if (error?.message?.includes('cnpj') || error?.message?.includes('unique_personnel_cnpj_per_team')) {
          errorMessage = "CNPJ já está em uso por outra pessoa da equipe";
        } else {
          errorMessage = "Já existe uma pessoa com estes dados na equipe";
        }
      }
      
      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const deletePersonnel = async (id: string): Promise<void> => {
    try {
      // The CASCADE delete will automatically remove personnel_functions records
      const { error } = await supabase
        .from('personnel')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPersonnel(prevPersonnel => prevPersonnel.filter(personnel => personnel.id !== id));
    } catch (error) {
      console.error('Error deleting personnel:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir pessoa",
        variant: "destructive"
      });
    }
  };

  const addFunction = async (functionData: Omit<Func, 'id' | 'team_id' | 'created_at'>): Promise<string | null> => {
    // 1. Validação: Garante que um usuário e uma equipe ativa existam.
    if (!user || !activeTeam) {
      toast({
        title: "Erro de Contexto",
        description: "Nenhuma equipe ativa selecionada. Por favor, selecione uma equipe.",
        variant: "destructive"
      });
      return null;
    }

    try {
      // 2. CORREÇÃO: Remove user_id da inserção, apenas adiciona team_id
      const dataToInsert = {
        ...functionData,
        team_id: activeTeam.id
      };

      // 3. Insere o registro completo no banco de dados.
      const { data, error } = await supabase
        .from('functions')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) throw error;

      // 4. CORREÇÃO: Atualização Otimista - adiciona no início da lista
      setFunctions(prev => [data as Func, ...prev]);

      toast({
        title: "Sucesso",
        description: "Função criada com sucesso!",
      });

      return data.id;

    } catch (error: any) {
      console.error('Error adding function:', error);
      toast({
        title: "Falha ao Adicionar",
        description: error.message || "Não foi possível adicionar a função.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateFunction = async (func: Func): Promise<void> => {
    if (!activeTeam) return;

    try {
      // 1. Envia a atualização para o banco
      const { error } = await supabase
        .from('functions')
        .update({ name: func.name, description: func.description })
        .eq('id', func.id)
        .eq('team_id', activeTeam.id);

      if (error) throw error;

      // 2. ATUALIZAÇÃO OTIMISTA: Atualiza o estado local imediatamente
      setFunctions(prevFunctions =>
        prevFunctions.map(f => (f.id === func.id ? func : f))
      );

      toast({
        title: "Sucesso",
        description: "Função atualizada com sucesso!",
      });

    } catch (error) {
      console.error('Error updating function:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar função",
        variant: "destructive"
      });
    }
  };

  const deleteFunction = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('functions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFunctions(prevFunctions => prevFunctions.filter(func => func.id !== id));
    } catch (error) {
      console.error('Error deleting function:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir função",
        variant: "destructive"
      });
    }
  };

  const addDivision = async (division: Omit<Division, 'id' | 'created_at' | 'team_id'>): Promise<string | null> => {
    if (!user) {
      console.error('AddDivision: User not available');
      return null;
    }
    
    if (!activeTeam) {
      console.error('AddDivision: Active team not available');
      return null;
    }

    try {
      console.log('=== AddDivision: Starting division creation ===');
      console.log('Division data:', division);
      console.log('User ID:', user.id);
      console.log('Active team ID:', activeTeam.id);
      
      const divisionWithTeam = { 
        ...division, 
        team_id: activeTeam.id
      };
      
      console.log('Division data for DB:', divisionWithTeam);
      
      const { data, error } = await supabase
        .from('event_divisions')
        .insert([divisionWithTeam])
        .select()
        .single();
        
      console.log('Division insert result:', { data, error });

      if (error) {
        console.error('Division insert error:', error);
        
        // Tratamento específico para violação de constraint de unicidade
        if (error.code === '23505' && error.message?.includes('unique_division_name_per_event')) {
          toast({
            title: "Divisão duplicada",
            description: "Uma divisão com este nome já existe para este evento.",
            variant: "destructive",
          });
          return null;
        }
        
        throw error;
      }

      if (data && isValidDataObject(data)) {
        const newDivision: Division = {
          id: data.id,
          team_id: activeTeam.id,
          event_id: data.event_id,
          name: data.name,
          description: data.description,
          created_at: data.created_at
        };
        console.log('Division created successfully:', newDivision);
        setDivisions(prevDivisions => [newDivision, ...prevDivisions]);
        return data.id as string;
      } else {
        console.error('Invalid division data returned:', data);
        return null;
      }
    } catch (error) {
      console.error('Error adding division:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar divisão",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateDivision = async (division: Division): Promise<void> => {
    if (!activeTeam) return;

    try {
      // 1. Envia a atualização para o banco
      const { error } = await supabase
        .from('event_divisions')
        .update({ name: division.name, description: division.description })
        .eq('id', division.id)
        .eq('team_id', activeTeam.id);

      if (error) throw error;

      // 2. ATUALIZAÇÃO OTIMISTA: Atualiza o estado local imediatamente
      setDivisions(prevDivisions =>
        prevDivisions.map(d => (d.id === division.id ? division : d))
      );

      toast({
        title: "Sucesso",
        description: "Divisão atualizada com sucesso!",
      });

    } catch (error) {
      console.error('Error updating division:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar divisão",
        variant: "destructive"
      });
    }
  };

  const deleteDivision = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('event_divisions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDivisions(prevDivisions => prevDivisions.filter(division => division.id !== id));
    } catch (error) {
      console.error('Error deleting division:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir divisão",
        variant: "destructive"
      });
    }
  };

  const addAssignment = async (assignmentData: Omit<Assignment, 'id' | 'created_at' | 'team_id'>): Promise<void> => {
    if (!user || !activeTeam) {
      toast({ 
        title: "Erro", 
        description: "Usuário ou equipe não selecionada.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      console.log('=== EnhancedDataContext: Starting assignment creation ===');
      console.log('Assignment data received:', assignmentData);
      
      // 1. CORREÇÃO: Remove user_id da inserção, apenas adiciona team_id
      const newAssignmentData = { 
        ...assignmentData, 
        team_id: activeTeam.id
      };
      
      console.log('Prepared assignment data for DB:', newAssignmentData);

      // 2. Insere no banco de dados e usa .select().single() para obter o registro completo de volta
      const { data: newAssignment, error } = await supabase
        .from('personnel_allocations')
        .insert([newAssignmentData])
        .select()
        .single();
        
      console.log('Database insert result:', { data: newAssignment, error });

      if (error) {
        console.error('Database error:', error);
        // Se houver um erro de chave duplicada (mesma pessoa no mesmo evento)
        if (error.code === '23505') {
          throw new Error("Esta pessoa já está alocada neste evento.");
        }
        if (error.message?.includes('Esta pessoa já está alocada')) {
          throw new Error(error.message);
        }
        throw error;
      }

      // 3. ATUALIZAÇÃO OTIMISTA: Adiciona o novo registro diretamente ao estado local
      if (newAssignment && isValidDataObject(newAssignment)) {
        console.log('Assignment created successfully, updating local state');
        const formattedAssignment: Assignment = {
          id: newAssignment.id,
          team_id: activeTeam.id,
          event_id: newAssignment.event_id,
          division_id: newAssignment.division_id,
          personnel_id: newAssignment.personnel_id,
          function_name: newAssignment.function_name,
          work_days: newAssignment.work_days || [],
          event_specific_cache: newAssignment.event_specific_cache || undefined,
          created_at: newAssignment.created_at
        };
        
        console.log('Adding assignment to local state:', formattedAssignment);
        setAssignments(currentAssignments => {
          const updated = [formattedAssignment, ...currentAssignments];
          console.log('Updated assignments list:', updated);
          return updated;
        });
      } else {
        console.error('No assignment data returned from database or invalid data:', newAssignment);
        throw new Error('Dados inválidos retornados do banco de dados');
      }

      toast({
        title: "Sucesso",
        description: "Alocação criada com sucesso!",
      });

    } catch (error: any) {
      console.error('Error adding assignment:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar alocação.",
        variant: "destructive"
      });
    }
  };

  const deleteAssignment = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('personnel_allocations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssignments(prevAssignments => prevAssignments.filter(assignment => assignment.id !== id));
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir alocação",
        variant: "destructive"
      });
    }
  };

  const updateAssignment = async (assignment: Assignment): Promise<void> => {
    if (!activeTeam) return;

    try {
      const { error } = await supabase
        .from('personnel_allocations')
        .update({
          personnel_id: assignment.personnel_id,
          function_name: assignment.function_name,
          work_days: assignment.work_days,
          division_id: assignment.division_id,
          event_specific_cache: assignment.event_specific_cache ?? null
        })
        .eq('id', assignment.id)
        .eq('team_id', activeTeam.id);

      if (error) throw error;

      setAssignments(prev => prev.map(a => (
        a.id === assignment.id
          ? { ...a, ...assignment }
          : a
      )));

      toast({
        title: "Sucesso",
        description: "Alocação atualizada com sucesso!",
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar alocação",
        variant: "destructive"
      });
    }
  };

  const refreshAssignments = async (): Promise<void> => {
    try {
      const isSuperAdmin = user?.role === 'superadmin';
      const { data, error } = isSuperAdmin
        ? await supabase.from('personnel_allocations').select('*')
        : await supabase.from('personnel_allocations').select('*').eq('team_id', activeTeam!.id);

      if (error) throw error;

      if (data && Array.isArray(data)) {
        const validAssignments: Assignment[] = [];
        for (const assignment of data) {
          if (isValidDataObject(assignment)) {
            validAssignments.push({
              id: assignment.id || '',
              team_id: assignment.team_id || (activeTeam?.id || ''),
              event_id: assignment.event_id || '',
              division_id: assignment.division_id || '',
              personnel_id: assignment.personnel_id || '',
              function_name: assignment.function_name || '',
              work_days: assignment.work_days || [],
              event_specific_cache: assignment.event_specific_cache || undefined,
              created_at: assignment.created_at || ''
            });
          }
        }
        setAssignments(validAssignments);
      }
    } catch (error) {
      console.error('Error refreshing allocations:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar alocações",
        variant: "destructive"
      });
    }
  };

  const addWorkLog = async (workLog: Omit<WorkRecord, 'id' | 'created_at' | 'team_id'>): Promise<void> => {
    if (!user || !activeTeam) return;

    try {
      // CORREÇÃO: Remove user_id da inserção, apenas adiciona team_id
      const dataToInsert = {
        ...workLog,
        team_id: activeTeam.id
      };

      const { data, error } = await supabase
        .from('work_records')
        .insert([dataToInsert])
        .select()
        .single();
  
      if (error) {
        console.error('Error adding work log:', error);
        toast({
          title: "Erro",
          description: "Falha ao adicionar lançamento de horas",
          variant: "destructive"
        });
        return;
      }
  
      if (data && isValidDataObject(data)) {
        const newWorkLog: WorkRecord = {
          id: data.id,
          team_id: activeTeam?.id || '',
          employee_id: data.employee_id,
          event_id: data.event_id,
          work_date: data.work_date,
          hours_worked: data.hours_worked,
          overtime_hours: data.overtime_hours,
          total_pay: data.total_pay,
          created_at: data.created_at
        };
        setWorkLogs(prevWorkLogs => [newWorkLog, ...prevWorkLogs]);
      } else {
        console.error('Invalid data object returned after insert:', data);
        toast({
          title: "Erro",
          description: "Falha ao adicionar lançamento de horas: dados inválidos",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding work log:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar lançamento de horas",
        variant: "destructive"
      });
    }
  };

  const updateWorkLog = async (workLog: WorkRecord): Promise<void> => {
    if (!activeTeam) return;

    try {
      // 1. Envia a atualização para o banco
      const { error } = await supabase
        .from('work_records')
        .update({
          employee_id: workLog.employee_id,
          event_id: workLog.event_id,
          work_date: workLog.work_date,
          hours_worked: workLog.hours_worked,
          overtime_hours: workLog.overtime_hours,
          total_pay: workLog.total_pay
        })
        .eq('id', workLog.id)
        .eq('team_id', activeTeam.id);

      if (error) throw error;

      // 2. ATUALIZAÇÃO OTIMISTA: Atualiza o estado local imediatamente
      setWorkLogs(prevWorkLogs =>
        prevWorkLogs.map(w => (w.id === workLog.id ? workLog : w))
      );

      toast({
        title: "Sucesso",
        description: "Lançamento de horas atualizado com sucesso!",
      });

    } catch (error) {
      console.error('Error updating work log:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar lançamento de horas",
        variant: "destructive"
      });
    }
  };

  const deleteWorkLog = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('work_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWorkLogs(prevWorkLogs => prevWorkLogs.filter(workLog => workLog.id !== id));
    } catch (error) {
      console.error('Error deleting work log:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir lançamento de horas",
        variant: "destructive"
      });
    }
  };

  // ============= SUPPLIER CRUD FUNCTIONS =============

  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'team_id' | 'average_rating' | 'total_ratings'>): Promise<string | null> => {
    if (!user || !activeTeam) {
      toast({
        title: "Erro",
        description: !user ? "Usuário não autenticado" : "Selecione uma equipe ativa",
        variant: "destructive"
      });
      return null;
    }

    try {
      const id = await createSupplier(supplier, activeTeam.id);
      const newSupplier: Supplier = {
        ...supplier,
        id,
        team_id: activeTeam.id,
        average_rating: 0,
        total_ratings: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSuppliers(prev => [newSupplier, ...prev]);
      toast({ title: "Fornecedor criado com sucesso" });
      return id;
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast({ title: "Erro ao criar fornecedor", variant: "destructive" });
      return null;
    }
  };

  const updateSupplierData = async (supplier: Supplier): Promise<void> => {
    if (!activeTeam) return;

    try {
      await updateSupplier(supplier.id, supplier);
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
      toast({ title: "Fornecedor atualizado com sucesso" });
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({ title: "Erro ao atualizar fornecedor", variant: "destructive" });
    }
  };

  const removeSupplier = async (id: string): Promise<void> => {
    try {
      await deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast({ title: "Fornecedor deletado com sucesso" });
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast({ 
        title: "Erro ao deletar fornecedor", 
        description: error.message || "Erro desconhecido",
        variant: "destructive" 
      });
    }
  };

  const addSupplierItem = async (item: Omit<SupplierItem, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> => {
    if (!user || !activeTeam) {
      toast({
        title: "Erro",
        description: !user ? "Usuário não autenticado" : "Selecione uma equipe ativa",
        variant: "destructive"
      });
      return null;
    }

    try {
      const id = await createSupplierItem(item);
      const newItem: SupplierItem = {
        ...item,
        id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSupplierItems(prev => [newItem, ...prev]);
      toast({ title: "Item adicionado com sucesso" });
      return id;
    } catch (error) {
      console.error('Error adding supplier item:', error);
      toast({ title: "Erro ao adicionar item", variant: "destructive" });
      return null;
    }
  };

  const updateSupplierItemData = async (item: SupplierItem): Promise<void> => {
    try {
      await updateSupplierItem(item.id, item);
      setSupplierItems(prev => prev.map(i => i.id === item.id ? item : i));
      toast({ title: "Item atualizado com sucesso" });
    } catch (error) {
      console.error('Error updating supplier item:', error);
      toast({ title: "Erro ao atualizar item", variant: "destructive" });
    }
  };

  const removeSupplierItem = async (id: string): Promise<void> => {
    try {
      await deleteSupplierItem(id);
      setSupplierItems(prev => prev.filter(i => i.id !== id));
      toast({ title: "Item deletado com sucesso" });
    } catch (error) {
      console.error('Error deleting supplier item:', error);
      toast({ title: "Erro ao deletar item", variant: "destructive" });
    }
  };

  const addEventSupplierCost = async (cost: Omit<EventSupplierCost, 'id' | 'created_at' | 'updated_at' | 'total_amount' | 'team_id'>): Promise<string | null> => {
    if (!user || !activeTeam) {
      toast({
        title: "Erro",
        description: !user ? "Usuário não autenticado" : "Selecione uma equipe ativa",
        variant: "destructive"
      });
      return null;
    }

    try {
      const id = await createEventSupplierCost(cost, activeTeam.id);
      
      // Calcular total_amount localmente apenas para o estado da aplicação.
      // O banco recalcula automaticamente via coluna gerada.
      const newCost: EventSupplierCost = {
        ...cost,
        id,
        team_id: activeTeam.id,
        total_amount: cost.unit_price * cost.quantity, // Estado local para exibição imediata
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setEventSupplierCosts(prev => [newCost, ...prev]);
      toast({ title: "Custo adicionado com sucesso" });
      return id;
    } catch (error) {
      console.error('Error adding event supplier cost:', error);
      toast({ title: "Erro ao adicionar custo", variant: "destructive" });
      return null;
    }
  };

  const updateEventSupplierCostData = async (cost: EventSupplierCost): Promise<void> => {
    try {
      await updateEventSupplierCost(cost.id, cost);
      const updatedTotal = cost.unit_price * cost.quantity;
      const updatedCost: EventSupplierCost = { ...cost, total_amount: updatedTotal };
      setEventSupplierCosts(prev => prev.map(c => c.id === cost.id ? updatedCost : c));
      toast({ title: "Custo atualizado com sucesso" });
    } catch (error) {
      console.error('Error updating event supplier cost:', error);
      toast({ title: "Erro ao atualizar custo", variant: "destructive" });
    }
  };

  const removeEventSupplierCost = async (id: string): Promise<void> => {
    try {
      await deleteEventSupplierCost(id);
      setEventSupplierCosts(prev => prev.filter(c => c.id !== id));
      toast({ title: "Custo deletado com sucesso" });
    } catch (error) {
      console.error('Error deleting event supplier cost:', error);
      toast({ title: "Erro ao deletar custo", variant: "destructive" });
    }
  };

  const addSupplierRating = async (rating: Omit<SupplierRating, 'id' | 'created_at' | 'team_id' | 'rated_by'>): Promise<void> => {
    if (!user || !activeTeam) {
      toast({
        title: "Erro",
        description: !user ? "Usuário não autenticado" : "Selecione uma equipe ativa",
        variant: "destructive"
      });
      return;
    }

    try {
      const id = await createSupplierRating(rating, activeTeam.id, user.id);
      const newRating: SupplierRating = {
        ...rating,
        id,
        team_id: activeTeam.id,
        rated_by: user.id,
        created_at: new Date().toISOString()
      };
      setSupplierRatings(prev => [newRating, ...prev]);
      
      // Update supplier average rating in local state
      setSuppliers(prev => prev.map(s => {
        if (s.id === rating.supplier_id) {
          const newTotal = s.total_ratings + 1;
          const newAvg = ((s.average_rating * s.total_ratings) + rating.rating) / newTotal;
          return { ...s, average_rating: newAvg, total_ratings: newTotal };
        }
        return s;
      }));
      
      toast({ title: "Avaliação registrada com sucesso" });
    } catch (error) {
      console.error('Error adding supplier rating:', error);
      toast({ title: "Erro ao avaliar fornecedor", variant: "destructive" });
    }
  };

  useEffect(() => {
    initializeData();
  }, [user, activeTeam]);

  const value: EnhancedDataContextType = {
    events,
    personnel,
    functions,
    divisions,
    assignments,
    workLogs,
    suppliers,
    supplierItems,
    eventSupplierCosts,
    supplierRatings,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    addFunction,
    updateFunction,
    deleteFunction,
    addDivision,
    updateDivision,
    deleteDivision,
    addAssignment,
    deleteAssignment,
    updateAssignment,
    refreshAssignments,
    addWorkLog,
    updateWorkLog,
    deleteWorkLog,
    addSupplier,
    updateSupplier: updateSupplierData,
    deleteSupplier: removeSupplier,
    addSupplierItem,
    updateSupplierItem: updateSupplierItemData,
    deleteSupplierItem: removeSupplierItem,
    addEventSupplierCost,
    updateEventSupplierCost: updateEventSupplierCostData,
    deleteEventSupplierCost: removeEventSupplierCost,
    addSupplierRating,
  };

  return (
    <EnhancedDataContext.Provider value={value}>
      {children}
    </EnhancedDataContext.Provider>
  );
};

export const useEnhancedData = () => {
  const context = useContext(EnhancedDataContext);
  if (context === undefined) {
    throw new Error('useEnhancedData must be used within an EnhancedDataProvider');
  }
  return context;
};
