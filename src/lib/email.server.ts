/** Email sending via Resend (connector gateway). Server only. */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "SocialSpark <no-reply@socialspark.ro>";

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Sends one email through the Resend gateway. Never throws; returns status. */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["RESEND_API_KEY"];
  if (!apiKey || !connKey) return { ok: false, error: "email_not_configured" };
  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Connection-Api-Key": connKey,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend send failed [${res.status}]: ${body}`);
      return { ok: false, error: `resend_${res.status}` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (e) {
    console.error("Resend send error", e);
    return { ok: false, error: "network_error" };
  }
}

// ---------- Branded layout ----------

function wrap(inner: string): string {
  return `<!doctype html><html lang="ro"><body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="background:#ffffff;border-radius:16px;padding:36px 32px;">
    <p style="margin:0 0 24px;font-size:15px;font-weight:700;color:#6d28d9;letter-spacing:0.5px;">SocialSpark</p>
    ${inner}
  </div>
  <p style="margin:20px 4px 0;font-size:12px;color:#9ca3af;">SocialSpark.ro — echipa ta de social media cu AI · 0784 227 844</p>
</div>
</body></html>`;
}

// ---------- Templates ----------

export function contactConfirmationEmail(d: { name: string }): SendEmailInput {
  return {
    to: "",
    subject: "Am primit mesajul tău — SocialSpark",
    html: wrap(
      `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Bună, ${escapeHtml(d.name)}!</h1>
       <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Am primit mesajul tău și îți răspundem în maximum 24 de ore, la telefon sau pe email.</p>
       <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">Între timp, poți crea cont gratuit și testa totul 30 de zile, fără card: <a href="https://socialspark.ro/auth" style="color:#6d28d9;">socialspark.ro/auth</a></p>
       <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">Bogdan — SocialSpark</p>`,
    ),
  };
}

export function contactOwnerNotification(d: { name: string; email: string; phone?: string; message: string }): SendEmailInput {
  return {
    to: "bogdansergiu.arghir@gmail.com",
    subject: `Mesaj nou de la ${d.name} (contact site)`,
    replyTo: d.email,
    html: wrap(
      `<h1 style="margin:0 0 12px;font-size:20px;color:#111827;">Mesaj nou din formularul de contact</h1>
       <p style="margin:0 0 8px;font-size:15px;color:#374151;"><strong>Nume:</strong> ${escapeHtml(d.name)}</p>
       <p style="margin:0 0 8px;font-size:15px;color:#374151;"><strong>Email:</strong> ${escapeHtml(d.email)}</p>
       ${d.phone ? `<p style="margin:0 0 8px;font-size:15px;color:#374151;"><strong>Telefon:</strong> ${escapeHtml(d.phone)}</p>` : ""}
       <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#374151;white-space:pre-wrap;">${escapeHtml(d.message)}</p>`,
    ),
  };
}

export function welcomeEmail(to: string, name: string | null): SendEmailInput {
  const greeting = name ? `Bine ai venit, ${escapeHtml(name)}!` : "Bine ai venit!";
  return {
    to,
    subject: "Bine ai venit la SocialSpark!",
    html: wrap(
      `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${greeting}</h1>
       <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Contul tău e activ și ai 30 de zile gratuite, fără card. Iată ce poți face imediat:</p>
       <p style="margin:0 0 8px;font-size:15px;line-height:1.8;color:#374151;">1. Completezi Brand Brain cu datele firmei tale<br>2. Generezi postări și imagini cu AI în română<br>3. Le programezi în calendar și se publică singure pe Facebook și Instagram</p>
       <p style="margin:24px 0 0;"><a href="https://socialspark.ro/dashboard" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600;">Începe în dashboard</a></p>
       <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">Dacă ai întrebări, răspund la bogdansergiu.arghir@gmail.com sau la 0784 227 844.</p>`,
    ),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
