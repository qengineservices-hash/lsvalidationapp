-- Relax RLS for Quotation Engine tables to support custom auth system
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_version_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE designer_quote_access DISABLE ROW LEVEL SECURITY;

-- Ensure public access policies exist just in case RLS is re-enabled
DROP POLICY IF EXISTS "Public access" ON quotes;
CREATE POLICY "Public access" ON quotes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON quote_line_items;
CREATE POLICY "Public access" ON quote_line_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON quote_version_snapshots;
CREATE POLICY "Public access" ON quote_version_snapshots FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access" ON designer_quote_access;
CREATE POLICY "Public access" ON designer_quote_access FOR ALL USING (true) WITH CHECK (true);
