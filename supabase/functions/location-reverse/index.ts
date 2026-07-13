// Supabase Edge Function: location-reverse
// المسار: supabase/functions/location-reverse/index.ts
// النشر: supabase functions deploy location-reverse

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---- قراءة متغيرات البيئة (Secrets) ----
const LOCATIONIQ_API_KEY = Deno.env.get("LOCATIONIQ_API_KEY")!;
const LOCATIONIQ_BASE_URL = Deno.env.get("LOCATIONIQ_BASE_URL") || "https://us1.locationiq.com";
const LOCATIONIQ_ENDPOINT = Deno.env.get("LOCATIONIQ_ENDPOINT") || "/v1/reverse";

// ---- إعدادات CORS ----
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // قم بتقييده بنطاق موقعك في الإنتاج
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request) => {
  // معالجة طلبات OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    // ---- التحقق من وجود الإحداثيات ----
    if (!lat || !lon) {
      return new Response(
        JSON.stringify({
          error: "Latitude and Longitude are required",
          lookup_status: 0,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // ---- التحقق من صحة القيم ----
    if (
      isNaN(latNum) || isNaN(lonNum) ||
      latNum < -90 || latNum > 90 ||
      lonNum < -180 || lonNum > 180
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid coordinates",
          lookup_status: 0,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---- بناء طلب LocationIQ (المفتاح لا يغادر الخادم) ----
    const params = new URLSearchParams({
      key: LOCATIONIQ_API_KEY,
      lat: latNum.toString(),
      lon: lonNum.toString(),
      format: "json",
      addressdetails: "1",
      normalizeaddress: "1",
      normalizecity: "1",
      postaladdress: "1",
      matchquality: "1",
      statecode: "1",
      namedetails: "1",
      extratags: "1",
      "accept-language": "native",
    });

    const locationIQUrl = `${LOCATIONIQ_BASE_URL}${LOCATIONIQ_ENDPOINT}?${params.toString()}`;
    console.log("Requesting LocationIQ:", locationIQUrl.replace(LOCATIONIQ_API_KEY, "***"));

    // ---- استدعاء LocationIQ من الخادم ----
    const response = await fetch(locationIQUrl);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `LocationIQ returned ${response.status}`,
          http_status: response.status,
          lookup_status: 0,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    // ---- إعادة البيانات كاملة + علامة نجاح ----
    return new Response(
      JSON.stringify({
        ...data,
        lookup_status: 1,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        lookup_status: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
