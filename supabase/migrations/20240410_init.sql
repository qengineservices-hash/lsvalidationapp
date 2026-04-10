-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM (
  'super_admin', 
  'admin', 
  'validation_manager', 
  'validation_lead', 
  'design_associate', 
  'designer', 
  'supply_executive'
);

CREATE TYPE request_status AS ENUM (
  'pending', 
  'assigned', 
  'in_progress', 
  'completed', 
  'revision_required', 
  'cancelled'
);

CREATE TYPE priority_level AS ENUM ('P0', 'P1', 'P2');

-- ==========================================
-- 2. TABLES
-- ==========================================

-- Cities Master
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (Extends Auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'designer',
  city_id UUID REFERENCES cities(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid TEXT UNIQUE NOT NULL, -- Numeric up to 15 digits as per user
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT NOT NULL,
  city_id UUID NOT NULL REFERENCES cities(id),
  property_type TEXT CHECK (property_type IN ('apartment', 'villa', 'office', 'other')),
  carpet_area_sqft NUMERIC,
  floor_number INTEGER,
  total_floors INTEGER,
  designer_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  order_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation Requests
CREATE TABLE validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('kws', 'services', 'both')),
  priority priority_level NOT NULL DEFAULT 'P2',
  priority_reason TEXT,
  special_instructions TEXT,
  status request_status DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id), -- VL
  assigned_by UUID REFERENCES profiles(id), -- VM
  assigned_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  city_id UUID NOT NULL REFERENCES cities(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validations (The session)
CREATE TABLE validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES validation_requests(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  validated_by UUID NOT NULL REFERENCES profiles(id),
  checkin_lat NUMERIC,
  checkin_lng NUMERIC,
  checkin_time TIMESTAMPTZ,
  checkout_time TIMESTAMPTZ,
  selfie_url TEXT,
  preliminary_data JSONB DEFAULT '{}',
  society_constraints JSONB DEFAULT '{}',
  completion_status TEXT DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'submitted', 'report_generated')),
  validation_excel_url TEXT,
  report_pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID NOT NULL REFERENCES validations(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_type TEXT,
  sequence_number INTEGER,
  north_wall TEXT,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurements
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL,
  location TEXT NOT NULL,
  value_mm NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID NOT NULL REFERENCES validations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id),
  photo_category TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  thumbnail_path TEXT,
  marked_photo_path TEXT,
  annotations JSONB DEFAULT '[]',
  file_size_bytes INTEGER,
  width_px INTEGER,
  height_px INTEGER,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  captured_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KT Questions
CREATE TABLE kt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  category TEXT NOT NULL,
  answer_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  is_mandatory BOOLEAN DEFAULT false,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KT Responses
CREATE TABLE kt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID NOT NULL REFERENCES validations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES kt_questions(id),
  response_text TEXT,
  response_bool BOOLEAN,
  response_number NUMERIC,
  response_options JSONB,
  answered_by UUID REFERENCES profiles(id),
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(validation_id, question_id)
);

-- ==========================================
-- 3. RLS POLICIES
-- ==========================================

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE kt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kt_responses ENABLE ROW LEVEL SECURITY;

-- Basic Public Access for Cities & Questions (Read Only)
CREATE POLICY "Public read active cities" ON cities FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active kt_questions" ON kt_questions FOR SELECT USING (is_active = true);

-- Profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Projects
CREATE POLICY "Designers can view projects they created" ON projects FOR SELECT USING (designer_id = auth.uid());
CREATE POLICY "VMs/VLs can view all projects in their city" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('validation_manager', 'validation_lead') AND city_id = projects.city_id)
);

-- ==========================================
-- 4. SEED DATA (FROM HTML)
-- ==========================================

-- Seed Cities
INSERT INTO cities (name, code) VALUES 
('Bangalore', 'BLR'),
('Mumbai', 'MUM'),
('Delhi', 'DEL'),
('Gurgaon', 'GGN'),
('Hyderabad', 'HYD');

-- Seed KT Questions (Society)
INSERT INTO kt_questions (question_text, category, answer_type, options, display_order) VALUES 
('What is the type of property?', 'Society', 'mcq', '["Bare Shell","Property Less than 15 yrs","Property More than 15 yrs"]', 1),
('Service lift usage allowed?', 'Society', 'mcq', '["Yes,Heavy material movement allowed","Yes,Heavy material movement Not allowed","No"]', 2),
('Debris/material loading area present?', 'Society', 'mcq', '["Within 30 ft","More than 30 ft","Not present"]', 3),
('What kind of demolition is allowed?', 'Society', 'mcq', '["Mechanical","Manual","Mechanical or Manual"]', 4),
('Vehicle entry allowed inside the premises?', 'Society', 'mcq', '["Yes,small size","Yes,medium size","Yes,large size","No"]', 5),
('Is there an active water supply point at site location?', 'Society', 'yes_no', null, 6),
('Is there an active power supply at site location?', 'Society', 'yes_no', null, 7),
('Any NOC required to do internal modifications to the property?', 'Society', 'yes_no', null, 8);
