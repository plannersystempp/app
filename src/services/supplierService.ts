import { supabase } from '@/integrations/supabase/client';
import type { Supplier, SupplierItem, SupplierRating, EventSupplierCost } from '@/contexts/data/types';

// ============= SUPPLIERS =============

export const createSupplier = async (
  data: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'team_id' | 'average_rating' | 'total_ratings'>,
  teamId: string
): Promise<string> => {
  try {
    // Validar CNPJ se fornecido
    if (data.cnpj) {
      const { validateCNPJ } = await import('@/utils/supplierUtils');
      if (!validateCNPJ(data.cnpj)) {
        throw new Error('CNPJ inválido');
      }
      
      // Verificar se CNPJ já existe na equipe
      const { data: existing } = await supabase
        .from('suppliers')
        .select('id')
        .eq('team_id', teamId)
        .eq('cnpj', data.cnpj.replace(/\D/g, ''))
        .single();
      
      if (existing) {
        throw new Error('CNPJ já cadastrado nesta equipe');
      }
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert([{
        ...data,
        cnpj: data.cnpj ? data.cnpj.replace(/\D/g, '') : null,
        team_id: teamId,
        average_rating: 0,
        total_ratings: 0
      }])
      .select()
      .single();

    if (error) throw error;
    console.log('Supplier created:', supplier.id);
    return supplier.id;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
};

export const updateSupplier = async (
  id: string,
  data: Partial<Omit<Supplier, 'id' | 'created_at' | 'team_id' | 'average_rating' | 'total_ratings'>>
): Promise<void> => {
  try {
    // Validar CNPJ se fornecido
    if (data.cnpj) {
      const { validateCNPJ } = await import('@/utils/supplierUtils');
      if (!validateCNPJ(data.cnpj)) {
        throw new Error('CNPJ inválido');
      }
    }

    const updateData = {
      ...data,
      cnpj: data.cnpj ? data.cnpj.replace(/\D/g, '') : data.cnpj
    };

    const { error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    console.log('Supplier updated:', id);
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
};

export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    // Check if supplier has associated costs
    const { data: costs, error: costsError } = await supabase
      .from('event_supplier_costs')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);

    if (costsError) throw costsError;

    if (costs && costs.length > 0) {
      throw new Error('Não é possível deletar fornecedor com custos associados a eventos');
    }

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('Supplier deleted:', id);
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }
};

export const fetchSuppliers = async (teamId: string): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('team_id', teamId)
      .order('name');

    if (error) throw error;
    console.log('Suppliers fetched:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

// ============= SUPPLIER ITEMS =============

export const createSupplierItem = async (
  data: Omit<SupplierItem, 'id' | 'created_at' | 'updated_at'>
): Promise<string> => {
  try {
    const { data: item, error } = await supabase
      .from('supplier_items')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    console.log('Supplier item created:', item.id);
    return item.id;
  } catch (error) {
    console.error('Error creating supplier item:', error);
    throw error;
  }
};

export const updateSupplierItem = async (
  id: string,
  data: Partial<Omit<SupplierItem, 'id' | 'created_at' | 'supplier_id'>>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('supplier_items')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    console.log('Supplier item updated:', id);
  } catch (error) {
    console.error('Error updating supplier item:', error);
    throw error;
  }
};

export const deleteSupplierItem = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('supplier_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('Supplier item deleted:', id);
  } catch (error) {
    console.error('Error deleting supplier item:', error);
    throw error;
  }
};

export const fetchSupplierItems = async (supplierId: string): Promise<SupplierItem[]> => {
  try {
    const { data, error } = await supabase
      .from('supplier_items')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('item_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier items:', error);
    throw error;
  }
};

export const fetchAllSupplierItems = async (teamId: string): Promise<SupplierItem[]> => {
  try {
    // Fetch all items for suppliers in this team
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id')
      .eq('team_id', teamId);

    if (!suppliers || suppliers.length === 0) return [];

    const supplierIds = suppliers.map(s => s.id);

    const { data, error } = await supabase
      .from('supplier_items')
      .select('*')
      .in('supplier_id', supplierIds)
      .order('item_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all supplier items:', error);
    throw error;
  }
};

// ============= EVENT SUPPLIER COSTS =============

/**
 * Sanitiza categoria para garantir valor válido no banco.
 * Valores aceitos: som, luz, video, catering, transporte, cenografia, seguranca, outro
 */
function sanitizeCategoryValue(input?: string): 'som' | 'luz' | 'video' | 'catering' | 'transporte' | 'cenografia' | 'seguranca' | 'outro' {
  if (!input) return 'outro';
  
  const validCategories = ['som', 'luz', 'video', 'catering', 'transporte', 'cenografia', 'seguranca', 'outro'];
  const normalized = input.toLowerCase().trim();
  
  return validCategories.includes(normalized) 
    ? normalized as any
    : 'outro';
}

/**
 * IMPORTANTE: total_amount é uma coluna GENERATED no banco de dados.
 * NÃO deve ser incluída no payload de insert/update.
 * O banco calcula automaticamente: unit_price * quantity
 */
export const createEventSupplierCost = async (
  data: Omit<EventSupplierCost, 'id' | 'created_at' | 'updated_at' | 'total_amount' | 'team_id'>,
  teamId: string
): Promise<string> => {
  try {
    const { total_amount, id, created_at, updated_at, team_id: _t, ...rest } = data as any;
    
    // Sanitizar categoria para garantir que seja um valor válido do banco
    const sanitizedCategory = sanitizeCategoryValue(rest.category);
    
    const payload = {
      ...rest,
      category: sanitizedCategory,
      team_id: teamId
      // total_amount será calculado automaticamente pelo banco via coluna gerada
    } as any;
    const { data: cost, error } = await supabase
      .from('event_supplier_costs')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    console.log('Event supplier cost created:', cost.id);
    return cost.id;
  } catch (error) {
    console.error('Error creating event supplier cost:', error);
    throw error;
  }
};

export const updateEventSupplierCost = async (
  id: string,
  data: Partial<Omit<EventSupplierCost, 'id' | 'created_at' | 'team_id' | 'total_amount'>>
): Promise<void> => {
  try {
    // Sanitização explícita: remover campos gerados/readonly
    const {
      total_amount,
      created_at,
      team_id,
      id: _ignoreId,
      updated_at,
      paid_amount,
      payment_status,
      payment_date,
      ...rest
    } = data as any;
    const updateData = { ...rest } as any;

    const { error } = await supabase
      .from('event_supplier_costs')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    console.log('Event supplier cost updated:', id);
  } catch (error) {
    console.error('Error updating event supplier cost:', error);
    throw error;
  }
};

export const deleteEventSupplierCost = async (id: string): Promise<void> => {
  try {
    const { error, count } = await supabase
      .from('event_supplier_costs')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw error;
    
    if (count === 0) {
      throw new Error("Não foi possível excluir o custo. Verifique se você tem permissão ou se o item já foi removido.");
    }

    console.log('Event supplier cost deleted:', id);
  } catch (error) {
    console.error('Error deleting event supplier cost:', error);
    throw error;
  }
};

export const fetchEventSupplierCosts = async (eventId: string): Promise<EventSupplierCost[]> => {
  try {
    const { data, error } = await supabase
      .from('event_supplier_costs')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(cost => ({
      ...cost,
      total_amount: cost.total_amount ?? ((cost.unit_price ?? 0) * (cost.quantity ?? 0)),
      payment_status: cost.payment_status as 'pending' | 'partially_paid' | 'paid'
    }));
  } catch (error) {
    console.error('Error fetching event supplier costs:', error);
    throw error;
  }
};

// Busca custos de fornecedores por equipe (todos os eventos da equipe)
export const fetchTeamSupplierCosts = async (teamId: string): Promise<EventSupplierCost[]> => {
  try {
    const { data, error } = await supabase
      .from('event_supplier_costs')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(cost => ({
      ...cost,
      total_amount: cost.total_amount ?? ((cost.unit_price ?? 0) * (cost.quantity ?? 0)),
      payment_status: cost.payment_status as 'pending' | 'partially_paid' | 'paid'
    }));
  } catch (error) {
    console.error('Error fetching team supplier costs:', error);
    throw error;
  }
};

export const updateCostPaymentStatus = async (
  id: string,
  paidAmount: number,
  paymentDate?: string,
  notes?: string
): Promise<void> => {
  try {
    // Get current cost to determine status
    const { data: cost } = await supabase
      .from('event_supplier_costs')
      .select('total_amount')
      .eq('id', id)
      .single();

    if (!cost) throw new Error('Cost not found');

    let payment_status: 'pending' | 'partially_paid' | 'paid' = 'pending';
    if (paidAmount === 0) {
      payment_status = 'pending';
    } else if (paidAmount >= cost.total_amount) {
      payment_status = 'paid';
    } else {
      payment_status = 'partially_paid';
    }

    const updateData: any = {
      paid_amount: paidAmount,
      payment_status
    };

    if (paymentDate) updateData.payment_date = paymentDate;
    if (notes !== undefined) updateData.notes = notes;

    const { error } = await supabase
      .from('event_supplier_costs')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    console.log('Cost payment status updated:', id, payment_status);
  } catch (error) {
    console.error('Error updating cost payment status:', error);
    throw error;
  }
};

// ============= SUPPLIER PAYMENTS =============

export const createSupplierPayment = async (
  payment: {
    supplier_cost_id: string;
    amount: number;
    payment_date: string;
    payment_type: 'partial' | 'full';
    notes?: string;
  },
  userId: string
): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('event_supplier_payments')
      .insert([{
        ...payment,
        created_by_id: userId
      }])
      .select()
      .single();

    if (error) throw error;
    console.log('Supplier payment created:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error creating supplier payment:', error);
    throw error;
  }
};

export const fetchSupplierPayments = async (costId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('event_supplier_payments')
      .select(`
        *
      `)
      .eq('supplier_cost_id', costId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    
    // Como não podemos fazer join com auth.users, buscamos os emails separadamente se necessário
    // ou usamos uma tabela pública de perfis se disponível. 
    // Por enquanto, retornamos os dados sem o email do usuário ou usamos user_profiles.
    
    // Tentar buscar perfis de usuário
    if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.created_by_id).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('user_profiles')
                .select('user_id, email, name')
                .in('user_id', userIds);
                
            if (profiles) {
                return data.map(payment => {
                    const profile = profiles.find(p => p.user_id === payment.created_by_id);
                    return {
                        ...payment,
                        created_by: profile ? { email: profile.email || profile.name } : { email: 'Usuário' }
                    };
                });
            }
        }
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    throw error;
  }
};

export const deleteSupplierPayment = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('event_supplier_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('Supplier payment deleted:', id);
  } catch (error) {
    console.error('Error deleting supplier payment:', error);
    throw error;
  }
};

// ============= RATINGS =============

export const createSupplierRating = async (
  data: Omit<SupplierRating, 'id' | 'created_at' | 'team_id' | 'rated_by'>,
  teamId: string,
  userId: string
): Promise<string> => {
  try {
    // Validate rating range
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Avaliação deve estar entre 1 e 5');
    }

    const { data: rating, error } = await supabase
      .from('supplier_ratings')
      .insert([{
        ...data,
        team_id: teamId,
        rated_by: userId
      }])
      .select()
      .single();

    if (error) throw error;

    // Recalculate supplier average rating
    await recalculateSupplierRating(data.supplier_id);

    console.log('Supplier rating created:', rating.id);
    return rating.id;
  } catch (error) {
    console.error('Error creating supplier rating:', error);
    throw error;
  }
};

export const fetchSupplierRatings = async (supplierId: string): Promise<SupplierRating[]> => {
  try {
    const { data, error } = await supabase
      .from('supplier_ratings')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier ratings:', error);
    throw error;
  }
};

export const recalculateSupplierRating = async (supplierId: string): Promise<void> => {
  try {
    const { data: ratings, error } = await supabase
      .from('supplier_ratings')
      .select('rating')
      .eq('supplier_id', supplierId);

    if (error) throw error;

    if (!ratings || ratings.length === 0) {
      await supabase
        .from('suppliers')
        .update({
          average_rating: 0,
          total_ratings: 0
        })
        .eq('id', supplierId);
      return;
    }

    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average = total / ratings.length;

    await supabase
      .from('suppliers')
      .update({
        average_rating: average,
        total_ratings: ratings.length
      })
      .eq('id', supplierId);

    console.log('Supplier rating recalculated:', supplierId, average);
  } catch (error) {
    console.error('Error recalculating supplier rating:', error);
    throw error;
  }
};

// ============= UTILITIES =============

export const getSupplierStats = async (supplierId: string): Promise<{
  totalEvents: number;
  avgRating: number;
  totalCosts: number;
}> => {
  try {
    const [costsResult, supplierResult] = await Promise.all([
      supabase
        .from('event_supplier_costs')
        .select('total_amount, event_id')
        .eq('supplier_id', supplierId),
      supabase
        .from('suppliers')
        .select('average_rating, total_ratings')
        .eq('id', supplierId)
        .single()
    ]);

    const costs = costsResult.data || [];
    const uniqueEvents = new Set(costs.map(c => c.event_id)).size;
    const totalCosts = costs.reduce((sum, c) => sum + (c.total_amount || 0), 0);

    return {
      totalEvents: uniqueEvents,
      avgRating: supplierResult.data?.average_rating || 0,
      totalCosts
    };
  } catch (error) {
    console.error('Error getting supplier stats:', error);
    return { totalEvents: 0, avgRating: 0, totalCosts: 0 };
  }
};
