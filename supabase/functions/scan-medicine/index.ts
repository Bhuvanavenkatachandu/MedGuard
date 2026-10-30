// Supabase Edge Function: scan-medicine
// Uses Gemma 4 via OpenRouter or Google AI Studio compatible API
// Extracts medicine packaging details with structured JSON & confidence scoring

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScanRequest {
  image_url?: string;
  image_base64?: string;
  pharmacy_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_url, image_base64, pharmacy_id } = (await req.json()) as ScanRequest;

    if (!image_url && !image_base64) {
      return new Response(
        JSON.stringify({
          error: "No image provided. Please supply image_url or image_base64.",
          confidence: 0,
          needs_manual_verification: true,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gemmaApiKey = Deno.env.get("GEMMA_API_KEY");

    // If Gemma API key is missing or not configured yet, return a structured fallback response
    // indicating verification required, rather than crashing
    if (!gemmaApiKey || gemmaApiKey.includes("PASTE_GEMMA_API_KEY")) {
      return new Response(
        JSON.stringify({
          success: false,
          warning: "GEMMA_API_KEY not configured in Supabase Edge Function secrets. Please enter medicine details manually or configure GEMMA_API_KEY.",
          confidence: 0,
          needs_manual_verification: true,
          extracted_data: {
            medicine_name: "",
            generic_name: "",
            brand: "",
            strength: "",
            manufacturer: "",
            batch_number: "",
            manufacturing_date: "",
            expiry_date: "",
            pieces_per_strip: 10,
            unit_of_measure: "tablet",
          },
          issues: ["AI key not configured in Edge Function secrets"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare image payload for vision model (Gemma / OpenRouter)
    const imageUrl = image_base64 
      ? (image_base64.startsWith("data:") ? image_base64 : `data:image/jpeg;base64,${image_base64}`)
      : image_url!;

    const systemPrompt = `You are MedGuard AI's high-precision medical packaging OCR and pharmacist assistant.
Analyze this image of a medicine pack, strip, bottle, or box.
Extract ONLY the following fields in strict JSON format:
{
  "is_medicine": true/false,
  "confidence_score": 0 to 100,
  "medicine_name": "Full medicine commercial name",
  "generic_name": "Active pharmaceutical ingredient (API) composition",
  "brand": "Brand or marketer name",
  "strength": "e.g. 500mg, 650mg, 10ml, etc.",
  "manufacturer": "Manufacturing pharmaceutical company name",
  "batch_number": "Batch or Lot number if visible, otherwise null",
  "manufacturing_date": "YYYY-MM-DD or YYYY-MM if visible, otherwise null",
  "expiry_date": "YYYY-MM-DD or YYYY-MM if visible, otherwise null",
  "pieces_per_strip": integer count of tablets/capsules in strip if detectable, default 10,
  "unit_of_measure": "tablet" | "capsule" | "syrup" | "injection",
  "issues": ["list of issues: blurry image, missing batch, missing expiry, low confidence, etc."],
  "needs_manual_verification": true/false
}

Guidelines:
1. If the image is blurry, dark, unreadable, or not a medicine, set confidence_score < 40 and needs_manual_verification = true.
2. If batch_number or expiry_date are missing or unclear, list them in issues and set needs_manual_verification = true.
3. If multiple medicines appear, flag it in issues.
4. Output STRICT JSON ONLY. Do not wrap in markdown quotes if possible.`;

    // Call OpenRouter / Google API with Gemma 4 or compatible multimodal model
    const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
    
    const response = await fetch(openRouterUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${gemmaApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://medguard.app",
        "X-Title": "MedGuard AI Scanner",
      },
      body: JSON.stringify({
        model: "google/gemma-2-27b-it:free,google/gemini-flash-1.5,meta-llama/llama-3.2-11b-vision-instruct",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract medicine details, batch, and expiry from this medicine packaging photo.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Provider error:", response.status, errText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `AI provider error: ${response.status}`,
          confidence: 0,
          needs_manual_verification: true,
          extracted_data: {
            medicine_name: "",
            generic_name: "",
            strength: "",
            manufacturer: "",
            batch_number: "",
            manufacturing_date: "",
            expiry_date: "",
          },
          issues: ["AI API failure - pharmacist manual verification required"],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    // Parse JSON safely from markdown or raw text
    let parsedData: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(content);
      }
    } catch (e) {
      console.warn("Failed to parse raw JSON from AI output:", content);
      parsedData = {
        confidence_score: 30,
        needs_manual_verification: true,
        issues: ["Unable to parse structured AI output"],
      };
    }

    // Safety checks
    const confidence = parsedData.confidence_score || 0;
    const needsVerification = 
      confidence < 75 || 
      !parsedData.medicine_name || 
      !parsedData.batch_number || 
      !parsedData.expiry_date || 
      parsedData.needs_manual_verification;

    return new Response(
      JSON.stringify({
        success: true,
        confidence: confidence,
        needs_manual_verification: needsVerification,
        extracted_data: {
          medicine_name: parsedData.medicine_name || "",
          generic_name: parsedData.generic_name || "",
          brand: parsedData.brand || "",
          strength: parsedData.strength || "",
          manufacturer: parsedData.manufacturer || "",
          batch_number: parsedData.batch_number || "",
          manufacturing_date: parsedData.manufacturing_date || "",
          expiry_date: parsedData.expiry_date || "",
          pieces_per_strip: parsedData.pieces_per_strip || 10,
          unit_of_measure: parsedData.unit_of_measure || "tablet",
        },
        issues: parsedData.issues || (needsVerification ? ["Confidence below threshold. Please verify all fields."] : []),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Scan Edge Function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Internal error in medicine scanner",
        confidence: 0,
        needs_manual_verification: true,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
