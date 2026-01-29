-- Fix security warnings reported by Supabase Linter

-- 1. Fix Function Search Path Mutable
-- Set explicit search_path for functions to prevent search_path hijacking
ALTER FUNCTION public.update_subscription_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_error_report_number() SET search_path = public;
ALTER FUNCTION public.set_error_report_number() SET search_path = public;
ALTER FUNCTION public.sanitize_personnel_fields() SET search_path = public;
ALTER FUNCTION public.get_personnel_with_functions(UUID) SET search_path = public;

-- 2. Fix Extension in Public
-- Move pg_net extension to extensions schema if it exists in public
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  -- Check if pg_net is installed in public schema
  -- NOTE: pg_net does not support SET SCHEMA in this context, skipping.
  -- IF EXISTS (
  --   SELECT 1 FROM pg_extension e
  --   JOIN pg_namespace n ON e.extnamespace = n.oid
  --   WHERE e.extname = 'pg_net' AND n.nspname = 'public'
  -- ) THEN
  --   ALTER EXTENSION pg_net SET SCHEMA extensions;
  -- END IF;
  
  -- Also check pg_cron just in case, as it's often used with pg_net
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_cron' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_cron SET SCHEMA extensions;
  END IF;
END $$;

-- 3. Fix RLS Policy Always True
-- These policies were overly permissive (USING true or WITH CHECK true).
-- Since the system updates these tables via SECURITY DEFINER functions (triggers/RPCs),
-- explicit permissive RLS policies for the user are often unnecessary or dangerous.

-- 3.1. audit_logs: "Allow system audit log insertion"
-- Insertions are handled by enhanced_audit_log() which is SECURITY DEFINER.
DROP POLICY IF EXISTS "Allow system audit log insertion" ON public.audit_logs;

-- 3.2. deletion_logs: "System can insert deletion logs"
-- Insertions are handled by admin functions which should be SECURITY DEFINER.
DROP POLICY IF EXISTS "System can insert deletion logs" ON public.deletion_logs;

-- 3.3. team_usage: "Sistema pode atualizar team_usage"
-- Updates are handled by update_team_usage_counters() which is SECURITY DEFINER.
-- This policy allowed ALL operations (including SELECT) to everyone.
-- We drop it to prevent unauthorized modifications.
-- Existing policies "Superadmin pode visualizar todo o uso" and "Admin da equipe pode visualizar uso da sua equipe"
-- cover the read access for admins. If regular members need read access, a specific policy should be added,
-- but open write access must be removed.
DROP POLICY IF EXISTS "Sistema pode atualizar team_usage" ON public.team_usage;
