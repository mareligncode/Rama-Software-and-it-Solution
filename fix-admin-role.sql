-- Fix: Manually assign admin role to girmawibelay@gmail.com
-- Run this in your Supabase SQL Editor

-- First, check if the user exists
SELECT id, email FROM auth.users WHERE email = 'girmawibelay@gmail.com';

-- Then manually insert the admin role (replace USER_ID with the actual ID from above)
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'girmawibelay@gmail.com'),
  'admin',
  NOW()
);

-- Verify the admin role was assigned
SELECT ur.*, u.email 
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
