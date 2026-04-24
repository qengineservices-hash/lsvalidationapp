-- migration file

-- ==========================================
-- 1. TABLES
-- ==========================================

-- mrc_categories
CREATE TABLE mrc_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- mrc_sub_categories  
CREATE TABLE mrc_sub_categories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references mrc_categories(id) on delete cascade,
  name text not null,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- mrc_items
CREATE TABLE mrc_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references mrc_categories(id),
  sub_category_id uuid references mrc_sub_categories(id),
  city_id uuid references cities(id),
  sku_code text not null,
  sku_name text not null,
  description text,
  brand_specification text,
  unit text not null,
  service_on text,
  rate numeric(10,2) not null,
  is_non_mrc_eligible boolean default false,
  is_carpentry boolean default false,
  is_active boolean default true,
  effective_from date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  UNIQUE(sku_code, city_id)
);

-- quotes
CREATE TABLE quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text unique not null,
  validation_request_id uuid references validation_requests(id),
  project_id text,
  city_id uuid references cities(id),
  stage text check (stage in ('Booking Stage', 'Design Stage')),
  created_by uuid references profiles(id),
  vm_id uuid references profiles(id),
  status text default 'draft' check (status in (
    'draft',
    'pending_vm_review',
    'vm_approved',
    'pending_nm_approval',
    'sent_to_designer',
    'payment_confirmed',
    'locked'
  )),
  version integer default 1,
  mrc_subtotal numeric(12,2) default 0,
  non_mrc_subtotal numeric(12,2) default 0,
  total numeric(12,2) default 0,
  non_mrc_percentage numeric(5,2) default 0,
  nm_approval_requested_at timestamptz,
  nm_approved_by uuid references profiles(id),
  nm_approved_at timestamptz,
  sent_to_designer_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_confirmed_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- quote_line_items
CREATE TABLE quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  room_name text not null,
  elevation_code text,
  service_on text,
  item_type text check (item_type in ('mrc', 'non_mrc')),
  mrc_item_id uuid references mrc_items(id),
  item_name text not null,
  description text,
  brand_specification text,
  unit text not null,
  quantity numeric(10,3) not null,
  unit_price numeric(10,2) not null,
  amount numeric(12,2) generated always as (quantity * unit_price) stored,
  remarks text,
  is_auto_calculated boolean default false,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- quote_version_snapshots
CREATE TABLE quote_version_snapshots (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id),
  version_number integer not null,
  snapshot_data jsonb not null,
  action text,
  performed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- designer_quote_access
CREATE TABLE designer_quote_access (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id),
  designer_email text not null,
  access_token text unique not null,
  token_expires_at timestamptz not null,
  first_accessed_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_confirmed_by_name text,
  payment_notes text,
  created_at timestamptz default now()
);


-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE mrc_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrc_sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_version_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE designer_quote_access ENABLE ROW LEVEL SECURITY;

-- mrc_categories / mrc_sub_categories (Read for all auth, manage for admin)
CREATE POLICY "Authenticated users can read mrc_categories" ON mrc_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage mrc_categories" ON mrc_categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Authenticated users can read mrc_sub_categories" ON mrc_sub_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage mrc_sub_categories" ON mrc_sub_categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- mrc_items
CREATE POLICY "Authenticated users can read mrc_items" ON mrc_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage mrc_items" ON mrc_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- quotes
CREATE POLICY "VLs can read own quotes" ON quotes FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "VLs can update own quotes" ON quotes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "VLs can insert own quotes" ON quotes FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "VMs can read assigned or city quotes" ON quotes FOR SELECT USING (
  vm_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'validation_manager' AND city_id = quotes.city_id)
);
CREATE POLICY "VMs can update assigned or city quotes" ON quotes FOR UPDATE USING (
  vm_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'validation_manager' AND city_id = quotes.city_id)
);

CREATE POLICY "Admins can manage quotes" ON quotes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- quote_line_items
CREATE POLICY "VLs can read own quote line items" ON quote_line_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM quotes WHERE id = quote_id AND created_by = auth.uid())
);
CREATE POLICY "VLs can insert own quote line items" ON quote_line_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM quotes WHERE id = quote_id AND created_by = auth.uid())
);
CREATE POLICY "VLs can update own quote line items" ON quote_line_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM quotes WHERE id = quote_id AND created_by = auth.uid())
);
CREATE POLICY "VLs can delete own quote line items" ON quote_line_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM quotes WHERE id = quote_id AND created_by = auth.uid())
);

CREATE POLICY "VMs can read assigned or city quote line items" ON quote_line_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE id = quote_id AND (
      vm_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'validation_manager' AND city_id = quotes.city_id)
    )
  )
);
CREATE POLICY "VMs can update assigned or city quote line items" ON quote_line_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE id = quote_id AND (
      vm_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'validation_manager' AND city_id = quotes.city_id)
    )
  )
);

CREATE POLICY "Admins can manage quote line items" ON quote_line_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- quote_version_snapshots
CREATE POLICY "Users can read snapshots of their quotes" ON quote_version_snapshots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quotes WHERE id = quote_id AND (
      created_by = auth.uid() OR 
      vm_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'validation_manager' AND city_id = quotes.city_id) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  )
);
CREATE POLICY "Users can insert snapshots" ON quote_version_snapshots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- designer_quote_access
CREATE POLICY "Public read designer quote access" ON designer_quote_access FOR SELECT USING (true);

CREATE POLICY "VMs and Admins can manage designer quote access" ON designer_quote_access FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'validation_manager'))
);


-- ==========================================
-- 3. FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to auto-calculate quote totals
CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_quote_id uuid;
  v_mrc numeric(12,2) := 0;
  v_non_mrc numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_perc numeric(5,2) := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_quote_id := OLD.quote_id;
  ELSE
    v_quote_id := NEW.quote_id;
  END IF;

  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE item_type = 'mrc'), 0),
    COALESCE(SUM(amount) FILTER (WHERE item_type = 'non_mrc'), 0)
  INTO v_mrc, v_non_mrc
  FROM quote_line_items
  WHERE quote_id = v_quote_id;

  v_total := v_mrc + v_non_mrc;
  
  IF v_total > 0 THEN
    v_perc := (v_non_mrc / v_total) * 100.0;
  ELSE
    v_perc := 0;
  END IF;

  UPDATE quotes
  SET 
    mrc_subtotal = v_mrc,
    non_mrc_subtotal = v_non_mrc,
    total = v_total,
    non_mrc_percentage = v_perc,
    updated_at = now()
  WHERE id = v_quote_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_quote_totals_trigger
AFTER INSERT OR UPDATE OF quantity, unit_price OR DELETE ON quote_line_items
FOR EACH ROW
EXECUTE FUNCTION update_quote_totals();

-- Function to auto-generate quote_number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  current_yr text;
  last_seq integer;
  next_seq integer;
  formatted_seq text;
BEGIN
  current_yr := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(quote_number, '^Q-' || current_yr || '-', ''), '') :: integer), 0)
  INTO last_seq
  FROM quotes
  WHERE quote_number LIKE 'Q-' || current_yr || '-%';

  next_seq := last_seq + 1;
  formatted_seq := lpad(next_seq::text, 4, '0');
  
  NEW.quote_number := 'Q-' || current_yr || '-' || formatted_seq;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number_trigger
BEFORE INSERT ON quotes
FOR EACH ROW
WHEN (NEW.quote_number IS NULL)
EXECUTE FUNCTION generate_quote_number();
