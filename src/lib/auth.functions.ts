import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const recoverySchema = z.object({
  email: z.string().trim().email().max(255),
  redirectTo: z.string().url().max(500),
});

/**
 * Password reset emails go out as Social Spark via Lovable's Resend connector
 * (or direct Resend when RESEND_API_KEY is a raw `re_…` key in local .env.local).
 * Do not call supabase.auth.resetPasswordForEmail — that hits whatever SMTP is on
 * the client Supabase project (and used to send AdPilot mail).
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => recoverySchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: data.redirectTo },
    });

    // Same response whether or not the user exists — no account enumeration.
    if (linkError || !linkData?.properties?.action_link) {
      console.warn("[auth] recovery link:", linkError?.message ?? "no action_link");
      return { ok: true as const };
    }

    const actionLink = linkData.properties.action_link;
    const html = `<!DOCTYPE html><html lang="ro"><body style="margin:0;padding:0;background:#f4f5fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fb;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e8eaf2;">
<tr><td><strong style="font-size:22px;color:#111827;">Social Spark</strong></td></tr>
<tr><td style="padding-top:20px;font-size:16px;line-height:1.5;color:#374151;">
<p style="margin:0 0 12px;">Ai cerut resetarea parolei.</p>
<p style="margin:0 0 24px;">Apasă butonul de mai jos ca să alegi o parolă nouă. Linkul expiră în curând.</p>
<p style="margin:0 0 24px;"><a href="${actionLink.replace(/"/g, "&quot;")}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Resetează parola</a></p>
<p style="margin:0;font-size:13px;color:#6b7280;">Dacă nu ai cerut tu asta, ignoră emailul.</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">socialspark.ro</p>
</td></tr></table></body></html>`;

    const { sendEmail } = await import("./email.server");
    const sent = await sendEmail({
      to: data.email,
      subject: "Resetează-ți parola — Social Spark",
      html,
    });

    // Local/dev: Lovable gateway needs LOVABLE_API_KEY; fall back to raw Resend `re_…` key.
    if (!sent.ok) {
      const rawKey = process.env.RESEND_API_KEY?.trim();
      if (rawKey?.startsWith("re_")) {
        const from = process.env.RESEND_FROM?.trim() || "Social Spark <noreply@socialspark.ro>";
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${rawKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [data.email],
            subject: "Resetează-ți parola — Social Spark",
            html,
          }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error("[auth] resend direct", res.status, t.slice(0, 300));
          throw new Error("Emailul nu a putut fi trimis acum. Reîncearcă peste un minut.");
        }
        return { ok: true as const };
      }
      console.error("[auth] sendEmail", sent.error);
      throw new Error("Emailul nu a putut fi trimis acum. Reîncearcă peste un minut.");
    }

    return { ok: true as const };
  });
