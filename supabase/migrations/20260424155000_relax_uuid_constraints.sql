-- Migration to relax UUID constraints for development
-- This allows mock IDs like 'user_123' to be stored in columns that were previously strict UUIDs

-- 1. Relax constraints on quotes table
-- We have to drop the foreign key constraints first because they reference profiles(id) which is uuid
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_created_by_fkey;
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_vm_id_fkey;
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_nm_approved_by_fkey;
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_payment_confirmed_by_fkey;

ALTER TABLE quotes 
  ALTER COLUMN created_by TYPE text,
  ALTER COLUMN vm_id TYPE text,
  ALTER COLUMN nm_approved_by TYPE text,
  ALTER COLUMN payment_confirmed_by TYPE text;

-- 2. Relax on snapshots
ALTER TABLE quote_version_snapshots DROP CONSTRAINT IF EXISTS quote_version_snapshots_performed_by_fkey;
ALTER TABLE quote_version_snapshots
  ALTER COLUMN performed_by TYPE text;

-- 3. Relax on line items mrc_item_id (if we ever use mock SKUs as IDs)
-- Keeping it for now as it's usually uuid but good to be safe
-- ALTER TABLE quote_line_items ALTER COLUMN mrc_item_id TYPE text;
