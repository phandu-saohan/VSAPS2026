-- Fix RLS infinite recursion cho tat ca cac bang
-- Run trong Supabase SQL Editor sau SUPABASE_SETUP.sql

-- Buoc 1: Tao helper function (chay trong SECURITY DEFINER context)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = u.id AND p.role = 'Quan tri vien'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_btc_member()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = u.id
      AND p.role IN ('Quan tri vien', 'Thanh vien BTC')
    )
  );
END;
$$;

-- Buoc 2: Profiles - drop bad policies, tao moi
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (public.is_admin() = true);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL USING (public.is_admin() = true);

-- Buoc 3: Role permissions - drop & tao lai
DROP POLICY IF EXISTS "Authenticated read role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins manage role_permissions" ON public.role_permissions;

CREATE POLICY "Admins read role_permissions" ON public.role_permissions FOR SELECT USING (public.is_admin() = true);
CREATE POLICY "Admins manage role_permissions" ON public.role_permissions FOR ALL USING (public.is_admin() = true);

-- Buoc 4: Settings - drop & tao lai
DROP POLICY IF EXISTS "Admins read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins update settings" ON public.settings;

CREATE POLICY "Admins read settings" ON public.settings FOR SELECT USING (public.is_admin() = true);
CREATE POLICY "Admins update settings" ON public.settings FOR UPDATE USING (public.is_admin() = true);

-- Buoc 5: Email templates - drop & tao lai
DROP POLICY IF EXISTS "Authenticated read templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins manage templates" ON public.email_templates;

CREATE POLICY "Admins/BTC read templates" ON public.email_templates FOR SELECT USING (public.is_btc_member() = true);
CREATE POLICY "Admins manage templates" ON public.email_templates FOR ALL USING (public.is_admin() = true);
