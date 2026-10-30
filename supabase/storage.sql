-- ==============================================================================
-- SUPABASE STORAGE BUCKETS CONFIGURATION
-- ==============================================================================

-- 1. Create storage bucket for medicine-scans if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('medicine-scans', 'medicine-scans', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create storage bucket for invoices if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies for medicine-scans
CREATE POLICY "Allow public/auth upload to medicine-scans"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'medicine-scans');

CREATE POLICY "Allow public read medicine-scans"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'medicine-scans');

-- Storage RLS Policies for invoices
CREATE POLICY "Allow authenticated/service upload invoices"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Allow public/auth read invoices"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'invoices');
