-- Migration to create sync tables bypassing Supabase Auth for immediate multi-device use

-- Users
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false
);

-- Cities
CREATE TABLE IF NOT EXISTS app_cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- User Cities mapping
CREATE TABLE IF NOT EXISTS app_user_cities (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
  city_id TEXT REFERENCES app_cities(id) ON DELETE CASCADE
);

-- VM to VL mappings
CREATE TABLE IF NOT EXISTS app_vm_vl_assignments (
  id TEXT PRIMARY KEY,
  vm_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
  vl_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true
);

-- Validation Requests (using JSONB for maximum flexibility during Phase 1 sync)
-- We store the entire Zustand ValidationRequest object directly in the 'data' column
-- This allows us to push and pull exactly what Zustand works with without schema strictness for now
CREATE TABLE IF NOT EXISTS app_validation_requests (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security temporarily to allow generic anonymous client access
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_vm_vl_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_validation_requests DISABLE ROW LEVEL SECURITY;

-- Enable Public read/write (If RLS happens to turn on)
DROP POLICY IF EXISTS "Public access" ON app_users;
CREATE POLICY "Public access" ON app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON app_cities;
CREATE POLICY "Public access" ON app_cities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON app_user_cities;
CREATE POLICY "Public access" ON app_user_cities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON app_vm_vl_assignments;
CREATE POLICY "Public access" ON app_vm_vl_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON app_validation_requests;
CREATE POLICY "Public access" ON app_validation_requests FOR ALL USING (true) WITH CHECK (true);
