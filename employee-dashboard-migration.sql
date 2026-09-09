-- Employee Dashboard and Task Management Migration
-- Run this in your Supabase SQL Editor

-- Drop old functions if they exist (drop by name only to catch all signatures)
DROP FUNCTION IF EXISTS public.assign_task_to_employee CASCADE;
DROP FUNCTION IF EXISTS public.get_employee_tasks CASCADE;

-- Extend app_role enum to include employee role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employee' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'employee';
  END IF;
END $$;

-- Create tasks table for assigning work to employees
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grant permissions for tasks
GRANT ALL ON public.tasks TO authenticated, service_role;

-- Create trigger for updated_at on tasks
DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link employees to auth.users for employee dashboard access
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add completed_at column to tasks table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Create index for faster employee lookups
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

-- Create function to get employee by user_id
CREATE OR REPLACE FUNCTION public.get_employee_by_user(_user_id uuid)
RETURNS TABLE (id uuid, first_name text, last_name text, email text, job_title text, department text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.first_name, e.last_name, e.email, e.job_title, e.department
  FROM public.employees e
  WHERE e.user_id = _user_id AND e.status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_by_user(uuid) TO authenticated, service_role;

-- Create function to get tasks for an employee
CREATE OR REPLACE FUNCTION public.get_employee_tasks(_employee_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  priority text,
  status text,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.due_date,
    t.completed_at,
    t.created_at
  FROM public.tasks t
  WHERE t.assigned_to = _employee_id
  ORDER BY 
    CASE t.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_tasks(uuid) TO authenticated, service_role;

-- Create function to update task status
CREATE OR REPLACE FUNCTION public.update_task_status(_task_id uuid, _status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tasks 
  SET status = _status,
      completed_at = CASE WHEN _status = 'completed' THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE id = _task_id;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_task_status(uuid, text) TO authenticated, service_role;

-- Create function to assign task to employee
CREATE FUNCTION public.assign_task_to_employee(
  _title text,
  _description text,
  _assigned_to uuid,
  _priority text DEFAULT 'medium',
  _due_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _task_id uuid;
BEGIN
  INSERT INTO public.tasks (title, description, priority, assigned_to, assigned_by, due_date)
  VALUES (_title, _description, _priority, _assigned_to, auth.uid(), _due_date)
  RETURNING id INTO _task_id;
  
  RETURN _task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_task_to_employee(text, text, uuid, text, date) TO authenticated, service_role;

-- Create function to get all tasks (for admin view)
CREATE OR REPLACE FUNCTION public.get_all_tasks()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  priority text,
  status text,
  assigned_to uuid,
  assigned_by uuid,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz,
  employee_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.assigned_to,
    t.assigned_by,
    t.due_date,
    t.completed_at,
    t.created_at,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name
  FROM public.tasks t
  LEFT JOIN public.employees e ON t.assigned_to = e.id
  ORDER BY 
    CASE t.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_tasks() TO authenticated, service_role;

-- Insert sample tasks for testing
INSERT INTO public.tasks (title, description, priority, assigned_to, due_date)
SELECT 
  'Complete project documentation',
  'Write comprehensive documentation for the new CRM module including API docs and user guide',
  'high',
  (SELECT id FROM public.employees LIMIT 1),
  CURRENT_DATE + INTERVAL '7 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tasks);

INSERT INTO public.tasks (title, description, priority, assigned_to, due_date)
SELECT 
  'Review pull requests',
  'Review and approve pending pull requests for the frontend team',
  'medium',
  (SELECT id FROM public.employees LIMIT 1),
  CURRENT_DATE + INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tasks WHERE title = 'Review pull requests');
