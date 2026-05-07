-- File: supabase/auto_confirm_users.sql
-- Run this in your Supabase SQL Editor

-- 1. Create the auto-confirm function
CREATE OR REPLACE FUNCTION auth.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = now();
  NEW.confirmed_at = now();
  NEW.last_sign_in_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to auth.users
-- This runs BEFORE the user is inserted, ensuring the fields are set 
-- before the Supabase Auth service tries to send an email.
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.auto_confirm_user();

-- 3. Update existing unconfirmed users (Optional)
UPDATE auth.users 
SET email_confirmed_at = now(), confirmed_at = now() 
WHERE email_confirmed_at IS NULL;
