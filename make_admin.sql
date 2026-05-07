-- Run this script in your Supabase SQL Editor to make admin@admin.com an Admin

-- 1. First, check if the profile exists. If not, you may need to sign up the user through the app first.
SELECT * FROM public.profiles WHERE email = 'admin@admin.com';

-- 2. Update the role to 'Quản trị viên'
UPDATE public.profiles
SET role = 'Quản trị viên'
WHERE email = 'admin@admin.com';

-- 3. Verify the change
SELECT id, email, full_name, role FROM public.profiles WHERE email = 'admin@admin.com';
