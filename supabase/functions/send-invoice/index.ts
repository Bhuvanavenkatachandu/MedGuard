// Supabase Edge Function: send-invoice
// Uses Resend API to send tax invoice to customer's email
// Logs email status into Supabase email_logs and updates invoices table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const {
      invoice_id,
      pharmacy_id,
      recipient_email,
      customer_name,
      invoice_number,
      total_amount,
      pharmacy_name,
      pharmacy_phone,
      pharmacy_address,
      items,
      pdf_url,
    } = payload;

    if (!recipient_email || !recipient_email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid customer email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://jorghleuygkkxryvfmzr.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Initialize Supabase admin client for logging
    const supabase = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey) 
      : null;

    if (!resendApiKey || resendApiKey.includes("PASTE_NEW_RESEND_API_KEY")) {
      console.warn("RESEND_API_KEY is not set or using placeholder.");
      
      // Log email failure in Supabase if client is available
      if (supabase && invoice_id && pharmacy_id) {
        await supabase.from("email_logs").insert({
          pharmacy_id,
          invoice_id,
          recipient_email,
          status: "failed",
          error_message: "RESEND_API_KEY not configured in Supabase Edge Function secrets",
        });

        await supabase.from("invoices")
          .update({ status: "email_failed" })
          .eq("id", invoice_id);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY not configured. Invoice saved but email not sent.",
          status: "email_failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email HTML body
    const itemsHtml = (items || []).map((it: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-weight: 500;">${it.medicine_name || 'Medicine'}</td>
        <td style="padding: 10px 8px; color: #64748b; font-family: monospace;">${it.batch_number || 'N/A'}</td>
        <td style="padding: 10px 8px; text-align: center;">${it.quantity_units} ${it.unit_type}(s)</td>
        <td style="padding: 10px 8px; text-align: right;">₹${Number(it.unit_price).toFixed(2)}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 600;">₹${Number(it.total_price).toFixed(2)}</td>
      </tr>
    `).join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice_number}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1e40af, #2563eb); color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">MedGuard AI</h1>
            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">Smart Healthcare & Pharmacy Management</p>
          </div>
          
          <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <h3 style="margin: 0 0 4px 0; color: #0f172a;">${pharmacy_name || 'MedGuard Partner Pharmacy'}</h3>
                <p style="margin: 0; font-size: 13px; color: #64748b;">${pharmacy_address || ''}</p>
                <p style="margin: 0; font-size: 13px; color: #64748b;">Phone: ${pharmacy_phone || ''}</p>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;" />

            <div style="margin-bottom: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #64748b;">Billed To:</p>
              <h4 style="margin: 0; font-size: 16px; color: #0f172a;">${customer_name || 'Valued Customer'}</h4>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Email: ${recipient_email}</p>
              <p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">Invoice #: <strong>${invoice_number}</strong></p>
              <p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">Date: ${new Date().toLocaleDateString('en-IN')}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
                  <th style="padding: 10px 8px;">Medicine</th>
                  <th style="padding: 10px 8px;">Batch</th>
                  <th style="padding: 10px 8px; text-align: center;">Qty</th>
                  <th style="padding: 10px 8px; text-align: right;">Price</th>
                  <th style="padding: 10px 8px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 24px; padding-top: 12px; border-top: 2px solid #e2e8f0;">
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">Grand Total: ₹${Number(total_amount).toFixed(2)}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #10b981; font-weight: 600;">Status: Paid / Verified</p>
            </div>

            ${pdf_url ? `
              <div style="text-align: center; margin-top: 20px;">
                <a href="${pdf_url}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Download Official PDF Invoice</a>
              </div>
            ` : ''}

            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0;">Thank you for choosing ${pharmacy_name || 'us'}.</p>
              <p style="margin: 4px 0 0 0;">MedGuard AI Verified Pharmacy System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MedGuard Invoices <onboarding@resend.dev>",
        to: [recipient_email],
        subject: `Your Pharmacy Invoice: ${invoice_number} from ${pharmacy_name || 'MedGuard'}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API failed:", resendData);
      
      if (supabase && invoice_id && pharmacy_id) {
        await supabase.from("email_logs").insert({
          pharmacy_id,
          invoice_id,
          recipient_email,
          status: "failed",
          error_message: resendData.message || "Failed to send email via Resend",
        });

        await supabase.from("invoices")
          .update({ status: "email_failed" })
          .eq("id", invoice_id);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: resendData.message || "Resend email delivery failed",
          status: "email_failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success
    if (supabase && invoice_id && pharmacy_id) {
      await supabase.from("email_logs").insert({
        pharmacy_id,
        invoice_id,
        recipient_email,
        status: "sent",
        resend_id: resendData.id,
      });

      await supabase.from("invoices")
        .update({ status: "emailed" })
        .eq("id", invoice_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "emailed",
        resend_id: resendData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-invoice error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
