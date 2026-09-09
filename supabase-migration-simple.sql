-- Rama Software Supabase Database Schema (Simplified - No RLS)
-- Run this in your Supabase SQL Editor

-- Create custom types
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.post_category AS ENUM ('news', 'career', 'internship', 'event');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create storage bucket for posts
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Grant storage permissions (simple)
DROP POLICY IF EXISTS "Public can view post attachments" ON storage.objects;
CREATE POLICY "Public can view post attachments" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "Authenticated can upload post attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload post attachments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts');

DROP POLICY IF EXISTS "Authenticated can update post attachments" ON storage.objects;
CREATE POLICY "Authenticated can update post attachments" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'posts')
WITH CHECK (bucket_id = 'posts');

DROP POLICY IF EXISTS "Authenticated can delete post attachments" ON storage.objects;
CREATE POLICY "Authenticated can delete post attachments" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'posts');

-- Create user_roles table (NO RLS)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grant permissions (simple)
GRANT ALL ON public.user_roles TO authenticated, anon, service_role;

-- Create helper function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Create admin bootstrap table (NO RLS)
CREATE TABLE IF NOT EXISTS public.admin_bootstrap (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_bootstrap TO authenticated, anon, service_role;

-- Insert default admin email
INSERT INTO public.admin_bootstrap (email) VALUES ('girmawibelay@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Create function to claim initial admin role
CREATE OR REPLACE FUNCTION public.claim_initial_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_bootstrap WHERE lower(email) = _email) THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_initial_admin() TO authenticated, service_role;

-- Create contact_messages table (NO RLS)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.contact_messages TO authenticated, anon, service_role;

-- Create posts table (NO RLS)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  category public.post_category NOT NULL DEFAULT 'news',
  excerpt text,
  body text NOT NULL,
  cover_image_url text,
  attached_files jsonb DEFAULT '[]'::jsonb,
  location text,
  deadline date,
  published boolean NOT NULL DEFAULT false,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.posts TO authenticated, anon, service_role;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create admin management functions
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE (user_id uuid, email text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.user_id, u.email::text, ur.created_at
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE ur.role = 'admin'
  ORDER BY ur.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_admin_by_email(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN
    RETURN 'not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin') THEN
    RETURN 'already_admin';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_admin(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_admin_by_email(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_admin(uuid) TO authenticated, service_role;
