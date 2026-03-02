-- =============================================================================
-- NarrVoca Profiles Migration — Migration 005
-- Project: NarrVoca
--
-- Creates the `profiles` table and a trigger on auth.users to auto-upsert
-- a profile row whenever a new user is created (email or OAuth).
-- Run in the Supabase SQL Editor.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. profiles table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  first_name  text,
  last_name   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 2. Row-Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- -----------------------------------------------------------------------------
-- 3. Trigger: auto-upsert profile on auth.users insert
--    Fires for both email/password signup and OAuth (Google, etc.).
--    Uses SECURITY DEFINER so it can write to public.profiles even under RLS.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name  = COALESCE(EXCLUDED.last_name,  profiles.last_name),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
