-- Employee Documents Migration for Rama Software
-- Run this in your Supabase SQL Editor
-- This migration adds support for multiple documents per employee

-- Create employee_documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_type text NOT NULL, -- cv, contract, id_card, certificate, other
  file_url text NOT NULL,
  file_size numeric,
  description text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Grant permissions (simple permissions without RLS)
GRANT ALL ON public.employee_documents TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
