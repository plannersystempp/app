
// Core data types
export interface Event {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  payment_due_date?: string;
  location?: string;
  client_contact_phone?: string;
  setup_start_date?: string;
  setup_end_date?: string;
  status?: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'concluido_pagamento_pendente';
  team_id: string;
  created_at: string;
}

export interface Personnel {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  phone_secondary?: string;
  cpf?: string;
  cnpj?: string;
  type: 'fixo' | 'freelancer';
  monthly_salary: number;
  event_cache: number;
  overtime_rate: number;
  photo_url?: string;
  shirt_size?: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG';
  address_zip_code?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  team_id: string;
  created_at: string;
  functions?: EventFunction[]; // Array of associated functions
}

export interface EventFunction {
  id: string;
  name: string;
  description: string;
  team_id: string;
  created_at: string;
}

// Extended function type for super admin view with team information
export interface EventFunctionWithTeam extends EventFunction {
  team_name?: string;
}

export interface EventAssignment {
  id: string;
  event_id: string;
  personnel_id: string;
  division_id: string;
  function_name: string;
  work_days: string[];
  start_time?: string;
  end_time?: string;
  event_specific_cache?: number;
  order_index?: number;
  team_id: string;
  created_at: string;
}

export interface Division {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  order_index?: number;
  team_id: string;
  created_at: string;
}

export interface WorkLog {
  id: string;
  employee_id: string;
  event_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours: number;
  total_pay: number;
  paid: boolean;
  date_logged: string;
  team_id: string;
  created_at: string;
}

export interface Absence {
  id: string;
  team_id: string;
  assignment_id: string;
  work_date: string;
  logged_by_id?: string;
  notes?: string;
  created_at: string;
}

// Supplier Management Types
export interface Supplier {
  id: string;
  team_id: string;
  
  // Dados da Empresa
  name: string;                        // Nome Fantasia
  legal_name?: string;                 // Razão Social
  cnpj?: string;                       // CNPJ
  state_registration?: string;         // Inscrição Estadual
  municipal_registration?: string;     // Inscrição Municipal
  
  // Endereço
  address_zip_code?: string;           // CEP
  address_street?: string;             // Logradouro
  address_number?: string;             // Número
  address_complement?: string;         // Complemento
  address_neighborhood?: string;       // Bairro
  address_city?: string;               // Cidade
  address_state?: string;              // Estado (UF)
  
  // Contatos
  contact_person?: string;             // Pessoa de Contato
  phone?: string;                      // Telefone 1
  phone_secondary?: string;            // Telefone 2
  email?: string;                      // E-mail
  
  // Observações e metadados
  notes?: string;
  average_rating: number;
  total_ratings: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierItem {
  id: string;
  supplier_id: string;
  item_name: string;
  description?: string;
  category?: string;
  price?: number;
  unit?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierRating {
  id: string;
  team_id: string;
  supplier_id: string;
  event_id: string;
  rated_by: string;
  rating: number;
  notes?: string;
  created_at: string;
}

export interface EventSupplierCost {
  id: string;
  team_id: string;
  event_id: string;
  supplier_id?: string;
  supplier_name: string;
  description: string;
  category?: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  payment_status: 'pending' | 'partially_paid' | 'paid';
  paid_amount: number;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Personnel Payments Types
export interface PersonnelPayment {
  id: string;
  team_id: string;
  personnel_id: string;
  amount: number;
  payment_due_date: string;
  payment_status: 'pending' | 'paid' | 'cancelled';
  paid_at?: string;
  paid_by_id?: string;
  related_events: string[];
  description: string;
  notes?: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
}
