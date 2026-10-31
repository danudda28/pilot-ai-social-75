import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isLocalDevAuthEnabled } from "@/lib/local-dev-auth";
import { sendEmail, contactConfirmationEmail, contactOwnerNotification, welcomeEmail } from "./email.server";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(5).max(2000),
});

/** Public: contact form — stores the message, then emails visitor + owner via Resend. */
export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const supabaseUrl = process.env["SUPABASE_URL"];
    if (!publishableKey || !supabaseUrl) return { ok: false, error: "not_configured" };

    // Dev local rulează fără cloud: doar emailurile, fără salvare în baza de date
    if (!isLocalDevAuthEnabled()) {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(supabaseUrl, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      });
      const { error } = await sb.from("contact_messages").insert({
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message,
      });
      if (error) {
        console.error("contact_messages insert failed:", error.message);
        return { ok: false, error: "insert_failed" };
      }
    }

    const confirm = { ...contactConfirmationEmail({ name: data.name }) };
    confirm.to = data.email;
    const [confirmRes, ownerRes] = await Promise.all([
      sendEmail(confirm),
      sendEmail(contactOwnerNotification(data)),
    ]);
    return { ok: true, emailed: confirmRes.ok && ownerRes.ok };
  });

/** Authenticated: welcome email to the signed-in user's own address (sent right after signup). */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims?.email;
    if (!email) return { ok: false, error: "no_email" };
    const { data: profile } = await context.supabase
      .from("users_profiles")
      .select("full_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    const res = await sendEmail(welcomeEmail(email, (profile?.full_name as string | null) ?? null));
    return { ok: res.ok };
  });
