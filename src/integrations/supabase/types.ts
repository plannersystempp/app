export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          assignment_id: string
          created_at: string | null
          id: string
          logged_by_id: string | null
          notes: string | null
          team_id: string
          work_date: string
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          id?: string
          logged_by_id?: string | null
          notes?: string | null
          team_id: string
          work_date: string
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          id?: string
          logged_by_id?: string | null
          notes?: string | null
          team_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "personnel_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_logged_by_id_fkey"
            columns: ["logged_by_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          file_size: number | null
          id: string
          operation_type: string
          records_count: Json | null
          restore_mode: string | null
          status: string
          tables_affected: string[] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_size?: number | null
          id?: string
          operation_type: string
          records_count?: Json | null
          restore_mode?: string | null
          status: string
          tables_affected?: string[] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_size?: number | null
          id?: string
          operation_type?: string
          records_count?: Json | null
          restore_mode?: string | null
          status?: string
          tables_affected?: string[] | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          checksum: string | null
          compressed: boolean | null
          created_at: string
          error: string | null
          file_key: string | null
          file_name: string | null
          file_size: number | null
          format: string | null
          id: number
          metadata: Json | null
          retention_expires_at: string | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          checksum?: string | null
          compressed?: boolean | null
          created_at?: string
          error?: string | null
          file_key?: string | null
          file_name?: string | null
          file_size?: number | null
          format?: string | null
          id?: number
          metadata?: Json | null
          retention_expires_at?: string | null
          status: string
          triggered_by?: string | null
        }
        Update: {
          checksum?: string | null
          compressed?: boolean | null
          created_at?: string
          error?: string | null
          file_key?: string | null
          file_name?: string | null
          file_size?: number | null
          format?: string | null
          id?: number
          metadata?: Json | null
          retention_expires_at?: string | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      backup_settings: {
        Row: {
          checksum_algorithm: string
          compression: string
          created_by: string | null
          format: string
          id: number
          max_backups: number
          retention_days: number
          updated_at: string
        }
        Insert: {
          checksum_algorithm?: string
          compression?: string
          created_by?: string | null
          format?: string
          id?: number
          max_backups?: number
          retention_days?: number
          updated_at?: string
        }
        Update: {
          checksum_algorithm?: string
          compression?: string
          created_by?: string | null
          format?: string
          id?: number
          max_backups?: number
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      coordinator_event_permissions: {
        Row: {
          can_edit: boolean
          can_manage_allocations: boolean
          can_manage_costs: boolean
          can_view_details: boolean
          can_view_payroll: boolean
          coordinator_id: string
          created_at: string | null
          event_id: string
          granted_by: string | null
          id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          can_edit?: boolean
          can_manage_allocations?: boolean
          can_manage_costs?: boolean
          can_view_details?: boolean
          can_view_payroll?: boolean
          coordinator_id: string
          created_at?: string | null
          event_id: string
          granted_by?: string | null
          id?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          can_edit?: boolean
          can_manage_allocations?: boolean
          can_manage_costs?: boolean
          can_view_details?: boolean
          can_view_payroll?: boolean
          coordinator_id?: string
          created_at?: string | null
          event_id?: string
          granted_by?: string | null
          id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_event_permissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_event_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_logs: {
        Row: {
          data_summary: Json | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_entity_id: string
          deleted_entity_name: string | null
          deleted_entity_type: string
          deletion_type: string
          id: string
          reason: string | null
        }
        Insert: {
          data_summary?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_entity_id: string
          deleted_entity_name?: string | null
          deleted_entity_type: string
          deletion_type: string
          id?: string
          reason?: string | null
        }
        Update: {
          data_summary?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_entity_id?: string
          deleted_entity_name?: string | null
          deleted_entity_type?: string
          deletion_type?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      error_reports: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          created_at: string | null
          id: string
          report_number: string
          resolution_notes: string | null
          resolved_at: string | null
          screenshot_annotations: Json | null
          screenshot_url: string | null
          status: string | null
          steps_to_reproduce: string | null
          team_id: string | null
          technical_data: Json
          updated_at: string | null
          urgency: string | null
          user_id: string | null
          what_happened: string
          what_trying_to_do: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          report_number: string
          resolution_notes?: string | null
          resolved_at?: string | null
          screenshot_annotations?: Json | null
          screenshot_url?: string | null
          status?: string | null
          steps_to_reproduce?: string | null
          team_id?: string | null
          technical_data?: Json
          updated_at?: string | null
          urgency?: string | null
          user_id?: string | null
          what_happened: string
          what_trying_to_do: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          report_number?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          screenshot_annotations?: Json | null
          screenshot_url?: string | null
          status?: string | null
          steps_to_reproduce?: string | null
          team_id?: string | null
          technical_data?: Json
          updated_at?: string | null
          urgency?: string | null
          user_id?: string | null
          what_happened?: string
          what_trying_to_do?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_divisions: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_divisions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_divisions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payroll: {
        Row: {
          absences_count: number | null
          adjustments: number | null
          cache_pay: number | null
          cache_rate: number | null
          calculated_at: string | null
          created_at: string | null
          event_id: string
          id: string
          is_finalized: boolean | null
          last_modified_by: string | null
          notes: string | null
          overtime_hours: number | null
          overtime_pay: number | null
          overtime_rate: number | null
          payment_status: string | null
          person_name: string
          person_type: string
          personnel_id: string
          regular_hours: number | null
          remaining_balance: number | null
          team_id: string
          total_gross: number | null
          total_paid: number | null
          updated_at: string | null
          work_days: number | null
        }
        Insert: {
          absences_count?: number | null
          adjustments?: number | null
          cache_pay?: number | null
          cache_rate?: number | null
          calculated_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_finalized?: boolean | null
          last_modified_by?: string | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          overtime_rate?: number | null
          payment_status?: string | null
          person_name: string
          person_type: string
          personnel_id: string
          regular_hours?: number | null
          remaining_balance?: number | null
          team_id: string
          total_gross?: number | null
          total_paid?: number | null
          updated_at?: string | null
          work_days?: number | null
        }
        Update: {
          absences_count?: number | null
          adjustments?: number | null
          cache_pay?: number | null
          cache_rate?: number | null
          calculated_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_finalized?: boolean | null
          last_modified_by?: string | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          overtime_rate?: number | null
          payment_status?: string | null
          person_name?: string
          person_type?: string
          personnel_id?: string
          regular_hours?: number | null
          remaining_balance?: number | null
          team_id?: string
          total_gross?: number | null
          total_paid?: number | null
          updated_at?: string | null
          work_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_payroll_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payroll_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payroll_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_supplier_costs: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          event_id: string
          id: string
          notes: string | null
          paid_amount: number | null
          payment_date: string | null
          payment_status: string | null
          quantity: number | null
          supplier_id: string | null
          supplier_name: string
          team_id: string
          total_amount: number | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          event_id: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          quantity?: number | null
          supplier_id?: string | null
          supplier_name: string
          team_id: string
          total_amount?: number | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          event_id?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          quantity?: number | null
          supplier_id?: string | null
          supplier_name?: string
          team_id?: string
          total_amount?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_supplier_costs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_supplier_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_supplier_costs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          client_contact_phone: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_revenue: number | null
          id: string
          location: string | null
          name: string
          payment_due_date: string | null
          setup_end_date: string | null
          setup_start_date: string | null
          start_date: string | null
          status: string
          team_id: string
        }
        Insert: {
          client_contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_revenue?: number | null
          id?: string
          location?: string | null
          name: string
          payment_due_date?: string | null
          setup_end_date?: string | null
          setup_start_date?: string | null
          start_date?: string | null
          status?: string
          team_id: string
        }
        Update: {
          client_contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_revenue?: number | null
          id?: string
          location?: string | null
          name?: string
          payment_due_date?: string | null
          setup_end_date?: string | null
          setup_start_date?: string | null
          start_date?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_ratings: {
        Row: {
          created_at: string | null
          event_id: string
          freelancer_id: string
          id: string
          rated_by_id: string | null
          rating: number
          team_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          freelancer_id: string
          id?: string
          rated_by_id?: string | null
          rating: number
          team_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          freelancer_id?: string
          id?: string
          rated_by_id?: string | null
          rating?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_ratings_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_ratings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      functions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "functions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_checklist: {
        Row: {
          acao: string
          demanda_id: string | null
          detalhes: Json | null
          id: string
          item_id: string | null
          timestamp: string | null
          usuario: string
        }
        Insert: {
          acao: string
          demanda_id?: string | null
          detalhes?: Json | null
          id?: string
          item_id?: string | null
          timestamp?: string | null
          usuario: string
        }
        Update: {
          acao?: string
          demanda_id?: string | null
          detalhes?: Json | null
          id?: string
          item_id?: string | null
          timestamp?: string | null
          usuario?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          team_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          team_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          team_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_closings: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by_id: string | null
          personnel_id: string
          team_id: string
          total_amount_paid: number
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by_id?: string | null
          personnel_id: string
          team_id: string
          total_amount_paid?: number
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by_id?: string | null
          personnel_id?: string
          team_id?: string
          total_amount_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_closings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_closings_paid_by_id_fkey"
            columns: ["paid_by_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payroll_closings_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_closings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          event_payroll_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          event_payroll_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          event_payroll_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payments_event_payroll_id_fkey"
            columns: ["event_payroll_id"]
            isOneToOne: false
            referencedRelation: "event_payroll"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_sheets: {
        Row: {
          absences_count: number | null
          adjustments: number | null
          base_salary: number | null
          cache_pay: number | null
          cache_rate: number | null
          calculated_at: string | null
          created_at: string | null
          event_id: string
          id: string
          is_finalized: boolean | null
          last_modified_by: string | null
          notes: string | null
          overtime_hours: number | null
          overtime_pay: number | null
          overtime_rate: number | null
          payment_status: string | null
          person_name: string
          person_type: string
          personnel_id: string
          regular_hours: number | null
          remaining_balance: number | null
          team_id: string
          total_gross: number | null
          total_paid: number | null
          updated_at: string | null
          work_days: number | null
        }
        Insert: {
          absences_count?: number | null
          adjustments?: number | null
          base_salary?: number | null
          cache_pay?: number | null
          cache_rate?: number | null
          calculated_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_finalized?: boolean | null
          last_modified_by?: string | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          overtime_rate?: number | null
          payment_status?: string | null
          person_name: string
          person_type: string
          personnel_id: string
          regular_hours?: number | null
          remaining_balance?: number | null
          team_id: string
          total_gross?: number | null
          total_paid?: number | null
          updated_at?: string | null
          work_days?: number | null
        }
        Update: {
          absences_count?: number | null
          adjustments?: number | null
          base_salary?: number | null
          cache_pay?: number | null
          cache_rate?: number | null
          calculated_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_finalized?: boolean | null
          last_modified_by?: string | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          overtime_rate?: number | null
          payment_status?: string | null
          person_name?: string
          person_type?: string
          personnel_id?: string
          regular_hours?: number | null
          remaining_balance?: number | null
          team_id?: string
          total_gross?: number | null
          total_paid?: number | null
          updated_at?: string | null
          work_days?: number | null
        }
        Relationships: []
      }
      pending_user_setups: {
        Row: {
          created_at: string | null
          email: string
          error_message: string | null
          id: string
          last_retry_at: string | null
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          retry_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          retry_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          retry_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      personnel: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          event_cache: number | null
          id: string
          monthly_salary: number | null
          name: string
          overtime_rate: number | null
          phone: string | null
          phone_secondary: string | null
          photo_url: string | null
          pix_key_encrypted: string | null
          shirt_size: string | null
          team_id: string
          type: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          event_cache?: number | null
          id?: string
          monthly_salary?: number | null
          name: string
          overtime_rate?: number | null
          phone?: string | null
          phone_secondary?: string | null
          photo_url?: string | null
          pix_key_encrypted?: string | null
          shirt_size?: string | null
          team_id: string
          type: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          event_cache?: number | null
          id?: string
          monthly_salary?: number | null
          name?: string
          overtime_rate?: number | null
          phone?: string | null
          phone_secondary?: string | null
          photo_url?: string | null
          pix_key_encrypted?: string | null
          shirt_size?: string | null
          team_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_allocations: {
        Row: {
          created_at: string | null
          division_id: string
          event_id: string
          event_specific_cache: number | null
          function_name: string
          id: string
          personnel_id: string
          team_id: string
          work_days: string[] | null
        }
        Insert: {
          created_at?: string | null
          division_id: string
          event_id: string
          event_specific_cache?: number | null
          function_name: string
          id?: string
          personnel_id: string
          team_id: string
          work_days?: string[] | null
        }
        Update: {
          created_at?: string | null
          division_id?: string
          event_id?: string
          event_specific_cache?: number | null
          function_name?: string
          id?: string
          personnel_id?: string
          team_id?: string
          work_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_allocations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "event_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_allocations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_allocations_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_allocations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          personnel_id: string
          team_id: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          personnel_id: string
          team_id: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          personnel_id?: string
          team_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_documents_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_functions: {
        Row: {
          created_at: string | null
          function_id: string
          is_primary: boolean
          personnel_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          function_id: string
          is_primary?: boolean
          personnel_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          function_id?: string
          is_primary?: boolean
          personnel_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_functions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_functions_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_functions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by_id: string | null
          description: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by_id: string | null
          payment_due_date: string
          payment_method: string | null
          payment_status: string
          personnel_id: string
          related_events: string[] | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by_id?: string | null
          description: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by_id?: string | null
          payment_due_date: string
          payment_method?: string | null
          payment_status?: string
          personnel_id: string
          related_events?: string[] | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by_id?: string | null
          description?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by_id?: string | null
          payment_due_date?: string
          payment_method?: string | null
          payment_status?: string
          personnel_id?: string
          related_events?: string[] | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_payments_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_cycle: string
          created_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          limits: Json
          name: string
          price: number
          sort_order: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle: string
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          limits?: Json
          name: string
          price?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          limits?: Json
          name?: string
          price?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          item_name: string
          price: number | null
          supplier_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_name: string
          price?: number | null
          supplier_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_name?: string
          price?: number | null
          supplier_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ratings: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          rated_by: string
          rating: number
          supplier_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          rated_by: string
          rating: number
          supplier_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          rated_by?: string
          rating?: number
          supplier_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          average_rating: number | null
          cnpj: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          legal_name: string | null
          municipal_registration: string | null
          name: string
          notes: string | null
          phone: string | null
          phone_secondary: string | null
          state_registration: string | null
          team_id: string
          total_ratings: number | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          average_rating?: number | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          municipal_registration?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          state_registration?: string | null
          team_id: string
          total_ratings?: number | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          average_rating?: number | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          municipal_registration?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          state_registration?: string | null
          team_id?: string
          total_ratings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          can_access_suppliers: boolean
          joined_at: string | null
          joined_with_code: string | null
          role: string
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          can_access_suppliers?: boolean
          joined_at?: string | null
          joined_with_code?: string | null
          role: string
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          can_access_suppliers?: boolean
          joined_at?: string | null
          joined_with_code?: string | null
          role?: string
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string | null
          current_period_ends_at: string
          current_period_starts_at: string
          gateway_customer_id: string | null
          gateway_payment_intent_id: string | null
          gateway_subscription_id: string | null
          id: string
          plan_id: string
          status: string
          team_id: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string | null
          current_period_ends_at: string
          current_period_starts_at?: string
          gateway_customer_id?: string | null
          gateway_payment_intent_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          plan_id: string
          status?: string
          team_id: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          canceled_at?: string | null
          created_at?: string | null
          current_period_ends_at?: string
          current_period_starts_at?: string
          gateway_customer_id?: string | null
          gateway_payment_intent_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          plan_id?: string
          status?: string
          team_id?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_usage: {
        Row: {
          current_events_this_month: number | null
          current_personnel: number | null
          current_team_members: number | null
          last_calculated_at: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          current_events_this_month?: number | null
          current_personnel?: number | null
          current_team_members?: number | null
          last_calculated_at?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          current_events_this_month?: number | null
          current_personnel?: number | null
          current_team_members?: number | null
          last_calculated_at?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_usage_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          allow_coordinators_suppliers: boolean
          cnpj: string | null
          created_at: string | null
          default_convert_overtime_to_daily: boolean | null
          default_overtime_threshold_hours: number | null
          id: string
          invite_code: string
          is_system: boolean
          monthly_payment_day: number | null
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          allow_coordinators_suppliers?: boolean
          cnpj?: string | null
          created_at?: string | null
          default_convert_overtime_to_daily?: boolean | null
          default_overtime_threshold_hours?: number | null
          id?: string
          invite_code: string
          is_system?: boolean
          monthly_payment_day?: number | null
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          allow_coordinators_suppliers?: boolean
          cnpj?: string | null
          created_at?: string | null
          default_convert_overtime_to_daily?: boolean | null
          default_overtime_threshold_hours?: number | null
          id?: string
          invite_code?: string
          is_system?: boolean
          monthly_payment_day?: number | null
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          absence_alerts: boolean | null
          allocation_updates: boolean | null
          created_at: string | null
          enabled: boolean | null
          event_reminders: boolean | null
          event_start_24h: boolean | null
          event_start_48h: boolean | null
          event_updates: boolean | null
          id: string
          payment_received: boolean | null
          payment_reminders: boolean | null
          push_subscription: Json | null
          status_changes: boolean | null
          team_id: string | null
          team_invites: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          absence_alerts?: boolean | null
          allocation_updates?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          event_reminders?: boolean | null
          event_start_24h?: boolean | null
          event_start_48h?: boolean | null
          event_updates?: boolean | null
          id?: string
          payment_received?: boolean | null
          payment_reminders?: boolean | null
          push_subscription?: Json | null
          status_changes?: boolean | null
          team_id?: string | null
          team_invites?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          absence_alerts?: boolean | null
          allocation_updates?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          event_reminders?: boolean | null
          event_start_24h?: boolean | null
          event_start_48h?: boolean | null
          event_updates?: boolean | null
          id?: string
          payment_received?: boolean | null
          payment_reminders?: boolean | null
          push_subscription?: Json | null
          status_changes?: boolean | null
          team_id?: string | null
          team_invites?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_approved: boolean
          name: string | null
          role: string
          terms_accepted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_approved?: boolean
          name?: string | null
          role?: string
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_approved?: boolean
          name?: string | null
          role?: string
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      work_records: {
        Row: {
          created_at: string | null
          date_logged: string | null
          employee_id: string
          event_id: string
          hours_worked: number | null
          id: string
          logged_by_id: string | null
          overtime_hours: number | null
          paid: boolean | null
          team_id: string
          total_pay: number | null
          work_date: string | null
        }
        Insert: {
          created_at?: string | null
          date_logged?: string | null
          employee_id: string
          event_id: string
          hours_worked?: number | null
          id?: string
          logged_by_id?: string | null
          overtime_hours?: number | null
          paid?: boolean | null
          team_id: string
          total_pay?: number | null
          work_date?: string | null
        }
        Update: {
          created_at?: string | null
          date_logged?: string | null
          employee_id?: string
          event_id?: string
          hours_worked?: number | null
          id?: string
          logged_by_id?: string | null
          overtime_hours?: number | null
          paid?: boolean | null
          team_id?: string
          total_pay?: number | null
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_records_logged_by_id_fkey"
            columns: ["logged_by_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "work_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_team_member_with_role: {
        Args: { p_role: string; p_team_id: string; p_user_id: string }
        Returns: Json
      }
      auto_fix_simple_orphans: { Args: never; Returns: Json }
      check_and_report_orphan_users: { Args: never; Returns: Json }
      check_event_status_consistency: {
        Args: never
        Returns: {
          current_status: string
          end_date: string
          event_id: string
          event_name: string
          has_allocations: boolean
          has_pending_payments: boolean
          suggested_status: string
        }[]
      }
      check_subscription_limits: {
        Args: { p_action: string; p_team_id: string }
        Returns: Json
      }
      ensure_user_profile: {
        Args: { p_email: string; p_name: string; p_user_id: string }
        Returns: string
      }
      finalize_payroll_sheet: { Args: { p_sheet_id: string }; Returns: boolean }
      generate_error_report_number: { Args: never; Returns: string }
      generate_event_payroll_sheets: {
        Args: { p_event_id: string }
        Returns: number
      }
      generate_payroll_sheet: {
        Args: { p_event_id: string; p_personnel_id: string }
        Returns: string
      }
      get_all_functions_with_teams: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          name: string
          team_id: string
          team_name: string
        }[]
      }
      get_all_users_for_superadmin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          is_approved: boolean
          last_sign_in_at: string
          name: string
          role: string
          team_id: string
          team_name: string
          user_id: string
        }[]
      }
      get_audit_logs_for_superadmin: {
        Args: {
          action_filter?: string
          end_date?: string
          search_text?: string
          start_date?: string
          team_filter?: string
        }
        Returns: {
          action: string
          created_at: string
          id: string
          new_values: Json
          old_values: Json
          record_id: string
          table_name: string
          team_name: string
          user_email: string
          user_name: string
        }[]
      }
      get_audit_logs_for_superadmin_enriched: {
        Args: {
          action_filter?: string
          end_date?: string
          search_text?: string
          start_date?: string
          team_filter?: string
        }
        Returns: {
          action: string
          action_summary: string
          changed_fields: Json
          created_at: string
          entity_name: string
          id: string
          new_values: Json
          old_values: Json
          record_id: string
          table_name: string
          team_name: string
          user_email: string
          user_name: string
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_events_with_payment_status: {
        Args: { p_team_id: string }
        Returns: {
          allocated_count: number
          end_date: string
          event_id: string
          event_name: string
          event_status: string
          has_pending_payments: boolean
          paid_count: number
          payment_due_date: string
        }[]
      }
      get_orphan_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          has_profile: boolean
          has_team: boolean
          metadata: Json
          user_id: string
        }[]
      }
      get_personnel_redacted: {
        Args: never
        Returns: {
          cnpj_masked: string
          cpf_masked: string
          created_at: string
          email_masked: string
          id: string
          name: string
          phone_masked: string
          photo_url: string
          salary_range: string
          shirt_size: string
          team_id: string
          type: string
        }[]
      }
      get_personnel_with_functions: {
        Args: { p_team_id: string }
        Returns: {
          address_city: string
          address_complement: string
          address_neighborhood: string
          address_number: string
          address_state: string
          address_street: string
          address_zip_code: string
          cnpj: string
          cpf: string
          created_at: string
          email: string
          event_cache: number
          functions: Json
          id: string
          monthly_salary: number
          name: string
          overtime_rate: number
          phone: string
          phone_secondary: string
          photo_url: string
          pix_key_encrypted: string
          primary_function_id: string
          shirt_size: string
          team_id: string
          type: string
        }[]
      }
      get_public_teams: {
        Args: never
        Returns: {
          cnpj: string
          id: string
          name: string
        }[]
      }
      get_superadmin_dashboard_stats: { Args: never; Returns: Json }
      get_team_by_invite_code: {
        Args: { invite_code_input: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_team_statistics: { Args: { team_id_param: string }; Returns: Json }
      get_team_stats_for_superadmin: {
        Args: never
        Returns: {
          created_at: string
          events_count: number
          members_count: number
          owner_email: string
          owner_id: string
          owner_name: string
          personnel_count: number
          team_cnpj: string
          team_id: string
          team_name: string
        }[]
      }
      get_user_role_in_team: {
        Args: { check_team_id: string }
        Returns: string
      }
      has_event_permission: {
        Args: {
          p_event_id: string
          p_permission_type?: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_team_member:
        | {
            Args: { check_team_id: string; check_user_id: string }
            Returns: boolean
          }
        | { Args: { check_team_id: string }; Returns: boolean }
      is_valid_photo_url: { Args: { url: string }; Returns: boolean }
      join_team_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: Json
      }
      preview_team_deletion: { Args: { p_team_id: string }; Returns: Json }
      request_team_access: {
        Args: {
          invite_code_input: string
          request_user_id: string
          requested_role?: string
        }
        Returns: {
          member_status: string
          team_id: string
          team_name: string
        }[]
      }
      retry_pending_user_setup: { Args: { p_user_id: string }; Returns: Json }
      setup_company_for_current_user: {
        Args: { p_company_cnpj?: string; p_company_name: string }
        Returns: Json
      }
      superadmin_approve_user: {
        Args: { p_approve_status: boolean; p_user_id: string }
        Returns: Json
      }
      superadmin_assign_user_to_team: {
        Args: { p_role?: string; p_team_id: string; p_user_id: string }
        Returns: Json
      }
      superadmin_change_team_member_status: {
        Args: { p_new_status: string; p_team_id: string; p_user_id: string }
        Returns: Json
      }
      superadmin_change_user_role: {
        Args: { p_new_role: string; p_user_id: string }
        Returns: Json
      }
      superadmin_remove_user_from_team: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: Json
      }
      sync_personnel_photos: { Args: never; Returns: number }
      update_event_statuses: { Args: never; Returns: undefined }
      validate_password: { Args: { password: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
