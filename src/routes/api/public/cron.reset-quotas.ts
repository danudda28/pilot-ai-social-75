import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/cron/reset-quotas')({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("reset_monthly_quotas");
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        return Response.json({ ok: true, reset: data });
      }
    }
  }
})
