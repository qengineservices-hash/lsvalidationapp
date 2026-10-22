-- Migration: Enhancing Designer workflow
ALTER TABLE app_validation_requests 
  ADD COLUMN IF NOT EXISTS quote_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_requested_by UUID REFERENCES profiles(id);

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS kom_date DATE,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS gfc_requested_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS gfc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  assigned_da_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_gfc_quote ON gfc_requests(quote_id);
