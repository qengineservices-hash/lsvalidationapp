-- Migration to add quote comments for to-and-fro review process
CREATE TABLE IF NOT EXISTS quote_comments (
  id text primary key default gen_random_uuid()::text,
  quote_id text not null,
  user_id text not null,
  comment text not null,
  created_at timestamptz default now()
);

ALTER TABLE quote_comments DISABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON quote_comments FOR ALL USING (true) WITH CHECK (true);
