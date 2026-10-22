-- Migration: Adding VL Reassignment Log table
CREATE TABLE IF NOT EXISTS vl_reassignment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_request_id UUID REFERENCES app_validation_requests(id) ON DELETE CASCADE,
  old_vl_id UUID REFERENCES profiles(id),
  new_vl_id UUID REFERENCES profiles(id),
  changed_by UUID REFERENCES profiles(id),
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vl_reassignment_request ON vl_reassignment_log(validation_request_id);
CREATE INDEX IF NOT EXISTS idx_vl_reassignment_new_vl ON vl_reassignment_log(new_vl_id);
