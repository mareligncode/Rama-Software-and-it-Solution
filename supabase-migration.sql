-- Rama Software Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Create custom types (idempotent)
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

-- Grant permissions for storage bucket (idempotent)
DROP POLICY IF EXISTS "Public can view post attachments" ON storage.objects;
CREATE POLICY "Public can view post attachments" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "Admins can upload post attachments" ON storage.objects;
CREATE POLICY "Admins can upload post attachments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update post attachments" ON storage.objects;
CREATE POLICY "Admins can update post attachments" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'posts' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can delete post attachments" ON storage.objects;
CREATE POLICY "Admins can delete post attachments" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'posts' AND auth.role() = 'authenticated');

-- Create user_roles table for admin access (idempotent)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Grant permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user roles (idempotent)
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Create helper function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Create admin bootstrap table for initial admin setup (idempotent)
CREATE TABLE IF NOT EXISTS public.admin_bootstrap (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_bootstrap TO service_role;
ALTER TABLE public.admin_bootstrap ENABLE ROW LEVEL SECURITY;

-- Insert default admin email (idempotent)
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
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_initial_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_initial_admin() TO authenticated;

-- Create contact_messages table (idempotent)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact messages (idempotent)
DROP POLICY IF EXISTS "Anyone can submit a contact message" ON public.contact_messages;
CREATE POLICY "Anyone can submit a contact message" ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) BETWEEN 1 AND 120
    AND length(trim(email)) BETWEEN 3 AND 255
    AND (phone IS NULL OR length(phone) <= 40)
    AND length(trim(message)) BETWEEN 1 AND 4000
    AND is_read = false
  );

DROP POLICY IF EXISTS "Admins can read messages" ON public.contact_messages;
CREATE POLICY "Admins can read messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update messages" ON public.contact_messages;
CREATE POLICY "Admins can update messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete messages" ON public.contact_messages;
CREATE POLICY "Admins can delete messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create posts table (idempotent)
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

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for posts (idempotent)
DROP POLICY IF EXISTS "Published posts are public" ON public.posts;
CREATE POLICY "Published posts are public" ON public.posts FOR SELECT TO anon, authenticated USING (published = true);

DROP POLICY IF EXISTS "Admins can read all posts" ON public.posts;
CREATE POLICY "Admins can read all posts" ON public.posts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can create posts" ON public.posts;
CREATE POLICY "Admins can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
CREATE POLICY "Admins can update posts" ON public.posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Admins can delete posts" ON public.posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Clear existing image URLs from posts (for fresh start with new Supabase)
UPDATE public.posts SET cover_image_url = NULL WHERE cover_image_url IS NOT NULL;
UPDATE public.posts SET attached_files = '[]'::jsonb WHERE attached_files IS NOT NULL;

-- Insert sample posts (idempotent)
INSERT INTO public.posts (title, slug, category, excerpt, body, location, published) VALUES
('Rama Software launches 2026 Graduate Internship Programme', 'graduate-internship-2026', 'internship', 'A six-month paid internship for graduating engineers in software, networking and cybersecurity.', 'We are opening 12 internship positions across our software engineering, network infrastructure and cybersecurity practices. Interns work alongside senior architects on live enterprise engagements, with mentorship, certification support and a clear path to a full-time offer.\n\nTo apply, send your CV and a short cover note to careers@ramasoftware.com.', 'Addis Ababa, Ethiopia', true),
('Senior ERP Implementation Consultant', 'senior-erp-consultant', 'career', 'Lead ERP delivery for banking, government and manufacturing clients.', 'We are hiring a Senior ERP Implementation Consultant to own discovery, configuration and go-live for enterprise ERP programmes.\n\nYou will have 5+ years delivering finance, HR or supply-chain modules, strong stakeholder skills and a track record of on-time go-lives.', 'Addis Ababa, Ethiopia', true),
('Rama completes national data centre modernisation', 'data-centre-modernisation', 'news', 'A resilient, fully monitored core network delivered with zero unplanned downtime.', 'Our infrastructure team has completed a full data centre modernisation programme, including core switching, redundant power design, structured cabling and 24/7 monitoring.\n\nThe platform now supports sub-second failover and a measured 99.99% availability.', 'Addis Ababa, Ethiopia', true)
ON CONFLICT (slug) DO NOTHING;

-- Create admin management functions
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE (user_id uuid, email text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  IF _user_id = auth.uid() THEN
    RETURN 'self';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.list_admins() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_admin_by_email(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_admin(uuid) TO authenticated;
