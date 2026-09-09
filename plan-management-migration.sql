-- Plan Management Migration
-- Run this in your Supabase SQL Editor

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  plan_type text NOT NULL CHECK (plan_type IN ('daily', 'monthly', 'yearly', 'custom')),
  start_date date,
  end_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create plan_todos table for todo lists within plans
CREATE TABLE IF NOT EXISTS public.plan_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  completed boolean DEFAULT false,
  due_date date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create plan_inventory table for inventory management within plans
CREATE TABLE IF NOT EXISTS public.plan_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  description text,
  quantity numeric DEFAULT 0,
  unit text,
  cost_per_unit numeric DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  status text DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'used', 'low_stock')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Grant permissions
GRANT ALL ON public.plans TO authenticated, service_role;
GRANT ALL ON public.plan_todos TO authenticated, service_role;
GRANT ALL ON public.plan_inventory TO authenticated, service_role;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plans_type ON public.plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_plans_status ON public.plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_created_by ON public.plans(created_by);
CREATE INDEX IF NOT EXISTS idx_plan_todos_plan_id ON public.plan_todos(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_todos_completed ON public.plan_todos(completed);
CREATE INDEX IF NOT EXISTS idx_plan_inventory_plan_id ON public.plan_inventory(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_inventory_status ON public.plan_inventory(status);

-- Create trigger for updated_at on plans
DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create trigger for updated_at on plan_todos
DROP TRIGGER IF EXISTS plan_todos_set_updated_at ON public.plan_todos;
CREATE TRIGGER plan_todos_set_updated_at BEFORE UPDATE ON public.plan_todos 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create trigger for updated_at on plan_inventory
DROP TRIGGER IF EXISTS plan_inventory_set_updated_at ON public.plan_inventory;
CREATE TRIGGER plan_inventory_set_updated_at BEFORE UPDATE ON public.plan_inventory 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to get plans by type
CREATE OR REPLACE FUNCTION public.get_plans_by_type(_plan_type text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  plan_type text,
  start_date date,
  end_date date,
  status text,
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
    p.id,
    p.title,
    p.description,
    p.plan_type,
    p.start_date,
    p.end_date,
    p.status,
    p.created_at
  FROM public.plans p
  WHERE p.plan_type = _plan_type
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_plans_by_type(text) TO authenticated, service_role;

-- Function to get todos for a plan
CREATE OR REPLACE FUNCTION public.get_plan_todos(_plan_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  completed boolean,
  due_date date,
  priority text,
  assigned_to uuid,
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
    pt.id,
    pt.title,
    pt.description,
    pt.completed,
    pt.due_date,
    pt.priority,
    pt.assigned_to,
    pt.created_at
  FROM public.plan_todos pt
  WHERE pt.plan_id = _plan_id
  ORDER BY 
    CASE pt.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    pt.due_date ASC NULLS LAST,
    pt.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_plan_todos(uuid) TO authenticated, service_role;

-- Function to get inventory for a plan
CREATE OR REPLACE FUNCTION public.get_plan_inventory(_plan_id uuid)
RETURNS TABLE (
  id uuid,
  item_name text,
  description text,
  quantity numeric,
  unit text,
  cost_per_unit numeric,
  total_cost numeric,
  status text,
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
    pi.id,
    pi.item_name,
    pi.description,
    pi.quantity,
    pi.unit,
    pi.cost_per_unit,
    pi.total_cost,
    pi.status,
    pi.created_at
  FROM public.plan_inventory pi
  WHERE pi.plan_id = _plan_id
  ORDER BY pi.item_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_plan_inventory(uuid) TO authenticated, service_role;
