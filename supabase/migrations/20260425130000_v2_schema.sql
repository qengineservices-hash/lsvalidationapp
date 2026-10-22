-- ============================================================
-- Migration: v2_schema
-- Description: Adds design_associate role, GFC workflow tables,
--              notifications system, quote CSV exports, and
--              new columns on existing tables.
-- Date: 2026-04-25
-- ============================================================

-- =====================
-- 1. ROLE CONSTRAINT UPDATE
-- =====================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'validation_manager',
    'validation_lead',
    'designer',
    'design_associate'
  ));

-- =====================
-- 2. COLUMNS ON EXISTING TABLES
-- =====================

-- --- quotes ---
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS kom_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_50_confirmed_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_50_confirmed_by UUID REFERENCES profiles(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_50_scope_agreed BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS gfc_requested_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS gfc_requested_by UUID REFERENCES profiles(id);

-- Update status check to include new states
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check CHECK (status IN (
  'draft',
  'pending_vm_approval',
  'pending_nm_approval',
  'vm_approved',
  'sent_to_designer',
  'payment_confirmed',
  'gfc_requested',
  'gfc_in_progress',
  'locked'
));

-- Remove legacy stage column
ALTER TABLE quotes DROP COLUMN IF EXISTS stage;

-- --- mrc_items ---
ALTER TABLE mrc_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE mrc_items ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE mrc_items ADD COLUMN IF NOT EXISTS brand_specification TEXT;

-- --- validation_requests ---
ALTER TABLE validation_requests ADD COLUMN IF NOT EXISTS quote_requested_at TIMESTAMPTZ;
ALTER TABLE validation_requests ADD COLUMN IF NOT EXISTS quote_requested_by UUID REFERENCES profiles(id);

-- =====================
-- 3. NEW TABLES
-- =====================

-- --- notifications ---
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE notifications IS 'In-app notification inbox for all roles';
COMMENT ON COLUMN notifications.type IS 'One of: quote_request, quote_submitted, quote_approved, quote_rejected, quote_sent, payment_confirmed, gfc_requested, gfc_assigned, gfc_uploaded, gfc_approved, vl_changed, validation_completed, quote_revision';
COMMENT ON COLUMN notifications.related_entity_type IS 'One of: quote, validation_request, gfc';

-- --- gfc_requests ---
CREATE TABLE IF NOT EXISTS gfc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  validation_request_id UUID,
  project_id TEXT,
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  assigned_da UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'assigned',
    'uploaded',
    'vl_approved',
    'vm_approved',
    'published'
  )),
  da_notes TEXT,
  rejection_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE gfc_requests IS 'GFC (Good for Construction) drawing requests linked to approved quotes';
COMMENT ON COLUMN gfc_requests.assigned_da IS 'Design Associate assigned to produce drawings';

-- --- gfc_drawings ---
CREATE TABLE IF NOT EXISTS gfc_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gfc_request_id UUID REFERENCES gfc_requests(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  version INTEGER DEFAULT 1,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE gfc_drawings IS 'Individual drawing files uploaded by DA for a GFC request';
COMMENT ON COLUMN gfc_drawings.file_type IS 'One of: pdf, dwg, image';

-- --- quote_csv_exports ---
CREATE TABLE IF NOT EXISTS quote_csv_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  version_number INTEGER,
  exported_by UUID REFERENCES profiles(id),
  file_name TEXT,
  exported_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE quote_csv_exports IS 'Audit log of CSV exports generated from quotes';

-- =====================
-- 4. INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gfc_requests_quote_id ON gfc_requests(quote_id);
CREATE INDEX IF NOT EXISTS idx_gfc_requests_assigned_da ON gfc_requests(assigned_da);
CREATE INDEX IF NOT EXISTS idx_gfc_requests_status ON gfc_requests(status);

CREATE INDEX IF NOT EXISTS idx_gfc_drawings_request_id ON gfc_drawings(gfc_request_id);

CREATE INDEX IF NOT EXISTS idx_quote_csv_exports_quote_id ON quote_csv_exports(quote_id);

-- =====================
-- 5. RLS POLICIES
-- =====================

-- --- notifications RLS ---
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- --- gfc_requests RLS ---
ALTER TABLE gfc_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on gfc_requests"
  ON gfc_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "VM can manage gfc_requests"
  ON gfc_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'validation_manager'
    )
  );

CREATE POLICY "VL can view related gfc_requests"
  ON gfc_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM validation_requests vr
      WHERE vr.id = gfc_requests.validation_request_id
        AND vr.assigned_to = auth.uid()
    )
  );

CREATE POLICY "DA can view assigned gfc_requests"
  ON gfc_requests FOR SELECT
  USING (assigned_da = auth.uid());

CREATE POLICY "DA can update assigned gfc_requests"
  ON gfc_requests FOR UPDATE
  USING (assigned_da = auth.uid())
  WITH CHECK (assigned_da = auth.uid());

CREATE POLICY "Designer can view published gfc_requests"
  ON gfc_requests FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM designer_quote_access dqa
      WHERE dqa.quote_id = gfc_requests.quote_id
        AND dqa.designer_email = (
          SELECT email FROM profiles WHERE id = auth.uid()
        )
    )
  );

-- --- gfc_drawings RLS ---
ALTER TABLE gfc_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on gfc_drawings"
  ON gfc_drawings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "VM can manage gfc_drawings"
  ON gfc_drawings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'validation_manager'
    )
  );

CREATE POLICY "VL can view gfc_drawings for their requests"
  ON gfc_drawings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gfc_requests gr
      JOIN validation_requests vr ON vr.id = gr.validation_request_id
      WHERE gr.id = gfc_drawings.gfc_request_id
        AND vr.assigned_to = auth.uid()
    )
  );

CREATE POLICY "DA can manage drawings for assigned requests"
  ON gfc_drawings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gfc_requests gr
      WHERE gr.id = gfc_drawings.gfc_request_id
        AND gr.assigned_da = auth.uid()
    )
  );

CREATE POLICY "Designer can view published gfc_drawings"
  ON gfc_drawings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gfc_requests gr
      WHERE gr.id = gfc_drawings.gfc_request_id
        AND gr.status = 'published'
        AND EXISTS (
          SELECT 1 FROM designer_quote_access dqa
          WHERE dqa.quote_id = gr.quote_id
            AND dqa.designer_email = (
              SELECT email FROM profiles WHERE id = auth.uid()
            )
        )
    )
  );

-- --- quote_csv_exports RLS ---
ALTER TABLE quote_csv_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert csv exports"
  ON quote_csv_exports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own exports"
  ON quote_csv_exports FOR SELECT
  USING (exported_by = auth.uid());

CREATE POLICY "Admin can view all csv exports"
  ON quote_csv_exports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =====================
-- 6. HELPER FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body,
    related_entity_type, related_entity_id)
  VALUES (p_user_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_notification IS 'Helper to insert a notification for any user. Runs as SECURITY DEFINER so API routes can call it without RLS restrictions.';

-- =====================
-- 7. UPDATED_AT TRIGGER FOR gfc_requests
-- =====================
CREATE OR REPLACE FUNCTION update_gfc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gfc_requests_updated_at ON gfc_requests;
CREATE TRIGGER trg_gfc_requests_updated_at
  BEFORE UPDATE ON gfc_requests
  FOR EACH ROW EXECUTE FUNCTION update_gfc_updated_at();
