-- Admin Features Migration for Rama Software
-- Run this in your Supabase SQL Editor
-- This migration adds: Employees, Projects, Tasks, and Letter Templates

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  hire_date date NOT NULL,
  job_title text NOT NULL,
  department text,
  salary numeric,
  address text,
  city text,
  country text DEFAULT 'Ethiopia',
  emergency_contact_name text,
  emergency_contact_phone text,
  profile_image_url text,
  status text DEFAULT 'active', -- active, terminated, on_leave
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  client_name text,
  start_date date,
  end_date date,
  budget numeric,
  status text DEFAULT 'planning', -- planning, active, on_hold, completed, cancelled
  priority text DEFAULT 'medium', -- low, medium, high
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  status text DEFAULT 'todo', -- todo, in_progress, review, completed, cancelled
  priority text DEFAULT 'medium', -- low, medium, high
  due_date date,
  estimated_hours numeric,
  actual_hours numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create letter_templates table
CREATE TABLE IF NOT EXISTS public.letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL, -- hire, termination, promotion, warning, custom
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb, -- Array of variable names like ['employee_name', 'job_title']
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create generated_letters table
CREATE TABLE IF NOT EXISTS public.generated_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.letter_templates(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  letter_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables_data jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- Create company_settings table for ID card configuration
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Rama Software',
  company_logo_url text,
  company_address text,
  company_phone text,
  company_email text,
  website text,
  id_card_background_color text DEFAULT '#ffffff',
  id_card_text_color text DEFAULT '#000000',
  id_card_accent_color text DEFAULT '#2563eb',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default company settings
INSERT INTO public.company_settings (company_name, company_address, company_phone, company_email, website)
VALUES ('Rama Software', 'Addis Ababa, Ethiopia', '+251-XXX-XXXX', 'info@ramasoftware.com', 'www.ramasoftware.com')
ON CONFLICT DO NOTHING;

-- Insert sample letter templates
INSERT INTO public.letter_templates (name, type, subject, body, variables) VALUES
('Employment Offer Letter', 'hire', 'Employment Offer - {{company_name}}', 
'Dear {{employee_name}},

We are pleased to offer you the position of {{job_title}} at {{company_name}}. This offer is contingent upon successful completion of our background check and other pre-employment requirements.

Position Details:
- Job Title: {{job_title}}
- Department: {{department}}
- Start Date: {{start_date}}
- Salary: {{salary}}
- Reporting to: {{manager}}

Please sign and return this letter by {{response_deadline}} to accept this offer.

We look forward to welcoming you to our team.

Sincerely,
{{manager_name}}
{{company_name}}',
'["employee_name", "job_title", "company_name", "department", "start_date", "salary", "manager", "response_deadline", "manager_name"]'),

('Termination Letter', 'termination', 'Termination of Employment - {{company_name}}',
'Dear {{employee_name}},

This letter serves as formal notification that your employment with {{company_name}} will be terminated effective {{termination_date}}.

The reason for termination is: {{termination_reason}}.

Please return all company property including laptops, badges, and any other equipment by {{return_date}}.

You will receive your final paycheck on {{final_pay_date}} including any accrued vacation pay.

We wish you the best in your future endeavors.

Sincerely,
{{manager_name}}
{{company_name}}',
'["employee_name", "company_name", "termination_date", "termination_reason", "return_date", "final_pay_date", "manager_name", "company_name"]'),

('Promotion Letter', 'promotion', 'Congratulations on Your Promotion - {{company_name}}',
'Dear {{employee_name}},

We are pleased to inform you that you have been promoted to the position of {{new_job_title}} effective {{promotion_date}}.

Your new responsibilities will include:
{{new_responsibilities}}

Your new salary will be {{new_salary}}.

We appreciate your hard work and dedication to {{company_name}}.

Sincerely,
{{manager_name}}
{{company_name}}',
'["employee_name", "new_job_title", "promotion_date", "new_responsibilities", "new_salary", "manager_name", "company_name"]')
ON CONFLICT DO NOTHING;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS employees_set_updated_at ON public.employees;
CREATE TRIGGER employees_set_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS projects_set_updated_at ON public.projects;
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS letter_templates_set_updated_at ON public.letter_templates;
CREATE TRIGGER letter_templates_set_updated_at BEFORE UPDATE ON public.letter_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS company_settings_set_updated_at ON public.company_settings;
CREATE TRIGGER company_settings_set_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grant permissions (simple permissions without RLS)
GRANT ALL ON public.employees TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.letter_templates TO authenticated;
GRANT ALL ON public.generated_letters TO authenticated;
GRANT ALL ON public.company_settings TO authenticated;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create storage bucket for employee photos and ID cards
INSERT INTO storage.buckets (id, name, public) VALUES ('employees', 'employees', true)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions for storage bucket
DROP POLICY IF EXISTS "Public can view employee files" ON storage.objects;
CREATE POLICY "Public can view employee files" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'employees');

DROP POLICY IF EXISTS "Authenticated can upload employee files" ON storage.objects;
CREATE POLICY "Authenticated can upload employee files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employees');

DROP POLICY IF EXISTS "Authenticated can update employee files" ON storage.objects;
CREATE POLICY "Authenticated can update employee files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'employees')
WITH CHECK (bucket_id = 'employees');

DROP POLICY IF EXISTS "Authenticated can delete employee files" ON storage.objects;
CREATE POLICY "Authenticated can delete employee files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'employees');
