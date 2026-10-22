-- Add version tracking and payment confirmation details to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_50_confirmed_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_50_confirmed_by UUID REFERENCES auth.users(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_50_scope_agreed BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS kom_date DATE;

-- Create snapshots table
CREATE TABLE IF NOT EXISTS quote_version_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  action TEXT DEFAULT 'pre_edit_snapshot',
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Note: RLS policies will be verified/created in subsequent auth alignment phases
