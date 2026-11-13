-- Payroll, Salary Payment, Commission, and Overtime Management Migration
-- Rama Software & IT Solutions
-- Run this in your Supabase SQL Editor

-- 1. Create payroll_settings table for overtime rules and company payroll configuration
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL DEFAULT 'ETB',
  standard_monthly_hours numeric(6,2) NOT NULL DEFAULT 208.00,
  standard_daily_hours numeric(4,2) NOT NULL DEFAULT 8.00,
  normal_overtime_rate numeric(4,2) NOT NULL DEFAULT 1.50,
  night_overtime_rate numeric(4,2) NOT NULL DEFAULT 1.75,
  weekend_overtime_rate numeric(4,2) NOT NULL DEFAULT 2.00,
  holiday_overtime_rate numeric(4,2) NOT NULL DEFAULT 2.50,
  pension_employee_rate numeric(4,2) NOT NULL DEFAULT 7.00,
  pension_employer_rate numeric(4,2) NOT NULL DEFAULT 11.00,
  company_tax_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default payroll settings row if not exists
INSERT INTO public.payroll_settings (
  id,
  currency,
  standard_monthly_hours,
  standard_daily_hours,
  normal_overtime_rate,
  night_overtime_rate,
  weekend_overtime_rate,
  holiday_overtime_rate,
  pension_employee_rate,
  pension_employer_rate
)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ETB',
  208.00,
  8.00,
  1.50,
  1.75,
  2.00,
  2.50,
  7.00,
  11.00
WHERE NOT EXISTS (SELECT 1 FROM public.payroll_settings LIMIT 1);

-- 2. Create employee_commissions table
CREATE TABLE IF NOT EXISTS public.employee_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  deal_amount numeric(12,2) DEFAULT 0,
  commission_rate numeric(5,2) DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  earned_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  payroll_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create employee_overtime table
CREATE TABLE IF NOT EXISTS public.employee_overtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  overtime_type text NOT NULL CHECK (overtime_type IN ('normal', 'night', 'weekend', 'holiday')),
  hours numeric(5,2) NOT NULL CHECK (hours > 0),
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  multiplier numeric(4,2) NOT NULL DEFAULT 1.50,
  calculated_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  payroll_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create salary_payments table
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  pay_period_start date,
  pay_period_end date,
  basic_salary numeric(12,2) NOT NULL DEFAULT 0,
  overtime_amount numeric(12,2) NOT NULL DEFAULT 0,
  overtime_hours_normal numeric(6,2) DEFAULT 0,
  overtime_hours_night numeric(6,2) DEFAULT 0,
  overtime_hours_weekend numeric(6,2) DEFAULT 0,
  overtime_hours_holiday numeric(6,2) DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  transport_allowance numeric(12,2) DEFAULT 0,
  housing_allowance numeric(12,2) DEFAULT 0,
  meal_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  bonus numeric(12,2) DEFAULT 0,
  gross_salary numeric(12,2) NOT NULL DEFAULT 0,
  tax_deduction numeric(12,2) DEFAULT 0,
  pension_deduction numeric(12,2) DEFAULT 0,
  loan_deduction numeric(12,2) DEFAULT 0,
  other_deductions numeric(12,2) DEFAULT 0,
  total_deductions numeric(12,2) NOT NULL DEFAULT 0,
  net_salary numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'cheque', 'other')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'pending', 'cancelled')),
  paid_date date,
  reference_number text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_employee_period UNIQUE (employee_id, year, month)
);

-- Foreign key link back from commissions and overtime to salary_payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_commissions_payroll'
  ) THEN
    ALTER TABLE public.employee_commissions 
    ADD CONSTRAINT fk_commissions_payroll 
    FOREIGN KEY (payroll_id) REFERENCES public.salary_payments(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_overtime_payroll'
  ) THEN
    ALTER TABLE public.employee_overtime 
    ADD CONSTRAINT fk_overtime_payroll 
    FOREIGN KEY (payroll_id) REFERENCES public.salary_payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON public.salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_year_month ON public.salary_payments(year, month);
CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON public.salary_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_employee ON public.employee_commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_status ON public.employee_commissions(status);
CREATE INDEX IF NOT EXISTS idx_employee_overtime_employee ON public.employee_overtime(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_overtime_status ON public.employee_overtime(status);
CREATE INDEX IF NOT EXISTS idx_employee_overtime_date ON public.employee_overtime(date);

-- 6. Enable RLS
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- payroll_settings: Read for everyone, update for authenticated
DROP POLICY IF EXISTS "Allow read payroll_settings" ON public.payroll_settings;
CREATE POLICY "Allow read payroll_settings" ON public.payroll_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update payroll_settings" ON public.payroll_settings;
CREATE POLICY "Allow update payroll_settings" ON public.payroll_settings
  FOR ALL USING (true) WITH CHECK (true);

-- employee_commissions: full access for authenticated/service
DROP POLICY IF EXISTS "Allow all employee_commissions" ON public.employee_commissions;
CREATE POLICY "Allow all employee_commissions" ON public.employee_commissions
  FOR ALL USING (true) WITH CHECK (true);

-- employee_overtime: full access for authenticated/service
DROP POLICY IF EXISTS "Allow all employee_overtime" ON public.employee_overtime;
CREATE POLICY "Allow all employee_overtime" ON public.employee_overtime
  FOR ALL USING (true) WITH CHECK (true);

-- salary_payments: full access for authenticated/service
DROP POLICY IF EXISTS "Allow all salary_payments" ON public.salary_payments;
CREATE POLICY "Allow all salary_payments" ON public.salary_payments
  FOR ALL USING (true) WITH CHECK (true);

-- 8. Grants
GRANT ALL ON public.payroll_settings TO anon, authenticated, service_role;
GRANT ALL ON public.employee_commissions TO anon, authenticated, service_role;
GRANT ALL ON public.employee_overtime TO anon, authenticated, service_role;
GRANT ALL ON public.salary_payments TO anon, authenticated, service_role;

-- 9. Add to Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_payments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_commissions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_overtime;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

