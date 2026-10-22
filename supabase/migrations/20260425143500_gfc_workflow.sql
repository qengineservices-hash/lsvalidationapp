-- Migration: GFC Drawing Workflow
ALTER TABLE gfc_requests 
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS da_notes TEXT,
  ADD COLUMN IF NOT EXISTS vm_notes TEXT,
  ADD COLUMN IF NOT EXISTS feedback TEXT;

CREATE TABLE IF NOT EXISTS gfc_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gfc_request_id UUID REFERENCES gfc_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- Floor Plan | Ceiling Plan | Electrical Layout | Plumbing Layout | Elevation | Section | Other
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_drawing_request ON gfc_drawings(gfc_request_id);

-- Ensure storage bucket exists (manual step usually, but code assumes 'gfc-drawings' bucket)
