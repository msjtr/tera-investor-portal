// Follow this setup guide to integrate the Deno runtime and Supabase functions:
// https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!;
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, playerIds, title, body, url, data, silent } = await req.json();

    if ((!userId && !playerIds) || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title, ar: title },
      contents: { en: body, ar: body },
      data: data || {},
      url: url || undefined,
      priority: 10,
    };

    // If playerIds are provided, send directly to those devices
    if (playerIds && playerIds.length > 0) {
      payload.include_player_ids = playerIds;
    } else if (userId) {
      // Otherwise use external_id (assuming userId equals external_id)
      payload.include_external_user_ids = [userId];
    }

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.id) {
      return new Response(
        JSON.stringify({ success: true, notificationId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: result.errors || result }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
