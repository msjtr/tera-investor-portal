/**
 * location-reverse/index.ts
 * يستدعي LocationIQ ويعيد بيانات شاملة مع CORS
 */
export default {
  async fetch(req: Request): Promise<Response> {
    // إعداد CORS شامل
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
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

      const apiKey = Deno.env.get("LOCATIONIQ_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Server configuration error", lookup_status: 0 }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // بناء الرابط مع كل المعاملات المفيدة
      const params = new URLSearchParams({
        key: apiKey,
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
        "accept-language": "native",   // سيعيد الأسماء باللغة المحلية (عربية في السعودية)
      });

      // استخدام الرابط الثابت (لن نحتاج BASE_URL و ENDPOINT)
      const locationIQUrl = `https://us1.locationiq.com/v1/reverse?${params.toString()}`;

      console.log("Requesting:", locationIQUrl.replace(apiKey, "***"));

      const response = await fetch(locationIQUrl);

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ error: `LocationIQ ${response.status}: ${errorText}`, lookup_status: 0 }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();

      return new Response(
        JSON.stringify({ ...data, lookup_status: 1 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (error: any) {
      console.error("Edge Function error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error", lookup_status: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
