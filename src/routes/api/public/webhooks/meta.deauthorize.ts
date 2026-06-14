import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Meta calls this when a user removes the app from their Facebook account.
// Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
export const Route = createFileRoute("/api/public/webhooks/meta/deauthorize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();

        // Meta sends `signed_request` as form-urlencoded.
        const params = new URLSearchParams(body);
        const signedRequest = params.get("signed_request");
        if (!signedRequest) {
          return Response.json({ error: "missing signed_request" }, { status: 400 });
        }

        const appSecret = process.env.META_APP_SECRET;
        if (!appSecret) {
          return Response.json({ error: "server misconfigured" }, { status: 500 });
        }

        const [encodedSig, payload] = signedRequest.split(".");
        if (!encodedSig || !payload) {
          return Response.json({ error: "invalid signed_request" }, { status: 400 });
        }

        const decodeB64Url = (s: string) =>
          Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

        const expected = createHmac("sha256", appSecret).update(payload).digest();
        const provided = decodeB64Url(encodedSig);
        if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
          return Response.json({ error: "signature mismatch" }, { status: 401 });
        }

        const data = JSON.parse(decodeB64Url(payload).toString("utf8")) as { user_id?: string };
        const fbUserId = data.user_id;
        if (!fbUserId) {
          return Response.json({ error: "missing user_id" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("meta_connections").delete().eq("fb_user_id", fbUserId);

        // Meta requires a confirmation URL + code so the user can check status.
        const confirmationCode = `dauth-${Date.now()}`;
        return Response.json({
          url: "https://pilot-ai-social-75.lovable.app/dashboard/integrari",
          confirmation_code: confirmationCode,
        });
      },
    },
  },
});
