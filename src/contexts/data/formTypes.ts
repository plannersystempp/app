
// Form data types for creating new records
export interface CreateEventData {
  name: string;
  start_date: string;
  end_date: string;
  payment_due_date?: string;
  location?: string;
  client_contact_phone?: string;
  setup_start_date?: string;
  setup_end_date?: string;
  status?: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'concluido_pagamento_pendente';
}

export interface CreatePersonnelData {
  name: string;
  email: string;
  phone: string;
  phone_secondary?: string;
  type: 'fixo' | 'freelancer';
  monthly_salary: number;
  event_cache: number;
  overtime_rate: number;
  function_id: string;
}

export interface CreateFunctionData {
  name: string;
  description: string;
}

export interface CreateAssignmentData {
  event_id: string;
  personnel_id: string;
  division_id: string;
  function_name: string;
  work_days: string[];
  event_specific_cache?: number;
}

export interface CreateDivisionData {
  event_id: string;
  team_id: string;
  name: string;
  description?: string;
}

export interface CreateWorkLogData {
  employee_id: string;
  event_id: string;
  team_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours: number;
}

export interface CreateAbsenceData {
  assignment_id: string;
  work_date: string;
  team_id: string;
  notes?: string;
  logged_by_id?: string;
}

// Update data types
export interface UpdatePersonnelData {
  name?: string;
  email?: string;
  phone?: string;
  phone_secondary?: string;
  type?: 'fixo' | 'freelancer';
  monthly_salary?: number;
  event_cache?: number;
  overtime_rate?: number;
  function_id?: string;
}

export interface UpdateEventData {
  name?: string;
  start_date?: string;
  end_date?: string;
  payment_due_date?: string;
  location?: string;
  client_contact_phone?: string;
  setup_start_date?: string;
  setup_end_date?: string;
  status?: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'concluido_pagamento_pendente';
}

export interface UpdateFunctionData {
  name?: string;
  description?: string;
}

export interface UpdateDivisionData {
  name?: string;
  description?: string;
}

// Personnel Payments Form Types
export interface CreatePersonnelPaymentData {
  team_id: string;
  personnel_id: string;
  amount: number;
  payment_due_date: string;
  related_events?: string[];
  description: string;
  notes?: string;
  payment_status?: 'pending' | 'paid' | 'cancelled';
  paid_at?: string;
  payment_method?: string;
}

export interface UpdatePersonnelPaymentData {
  amount?: number;
  payment_due_date?: string;
  payment_status?: 'pending' | 'paid' | 'cancelled';
  related_events?: string[];
  description?: string;
  notes?: string;
  payment_method?: string;
}
