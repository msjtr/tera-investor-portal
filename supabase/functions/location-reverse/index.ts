// supabase/functions/location-reverse/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// قراءة المتغيرات من Secrets (لا تكتب القيم هنا)
const LOCATIONIQ_API_KEY = Deno.env.get("LOCATIONIQ_API_KEY")!;
const LOCATIONIQ_BASE_URL = Deno.env.get("LOCATIONIQ_BASE_URL") || "https://us1.locationiq.com";
const LOCATIONIQ_ENDPOINT = Deno.env.get("LOCATIONIQ_ENDPOINT") || "/v1/reverse";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // قيده بنطاق موقعك في الإنتاج
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: "Latitude and Longitude are required", lookup_status: 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates", lookup_status: 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    console.log("Requesting:", locationIQUrl.replace(LOCATIONIQ_API_KEY, "***"));

    const response = await fetch(locationIQUrl);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `LocationIQ returned ${response.status}`, lookup_status: 0 }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ ...data, lookup_status: 1 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: "Internal server error", lookup_status: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
