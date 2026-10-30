# Supabase Setup & Edge Functions Guide for MedGuard AI

## 1. Supabase Database & Storage Setup
1. Open your Supabase Dashboard: **[https://jorghleuygkkxryvfmzr.supabase.co](https://jorghleuygkkxryvfmzr.supabase.co)**
2. Go to **SQL Editor** -> **New Query**.
3. Copy and run the entire contents of `supabase/schema.sql`.
4. Copy and run `supabase/storage.sql` to initialize the `medicine-scans` and `invoices` storage buckets.
5. (Optional) Run `supabase/seed.sql` to populate sample pharmacies, inventory, and batches.

## 2. Supabase Storage Buckets
Ensure the following two public buckets exist:
- `medicine-scans` (Public: Yes) - Used for uploaded medicine pack images
- `invoices` (Public: Yes) - Used for generated invoice PDFs

## 3. Edge Function Secrets Configuration
Edge functions keep your **Gemma API key** and **Resend API key** secure on the server side:

In Supabase Dashboard:
Navigate to **Project Settings** -> **Edge Functions** -> **Add Secret**:
- `GEMMA_API_KEY` = `<your-gemma-openrouter-key>`
- `RESEND_API_KEY` = `<your-resend-api-key>`

Or via Supabase CLI:
```bash
supabase secrets set GEMMA_API_KEY="your_api_key_here"
supabase secrets set RESEND_API_KEY="your_resend_api_key_here"
```

## 4. Deploying Edge Functions
```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref jorghleuygkkxryvfmzr

# Deploy Edge Functions
supabase functions deploy scan-medicine --no-verify-jwt
supabase functions deploy send-invoice --no-verify-jwt
```
