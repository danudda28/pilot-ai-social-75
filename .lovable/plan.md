# Plan finalizare AdPilot Social (fără Stripe)

Voi livra în 5 etape secvențiale. La final, aplicația publică postări real pe Meta, are scheduler funcțional, este conformă GDPR și are flow-uri complete de colaborare + notificări.

---

## Etapa 1 — Publicare reală Meta (Instagram + Facebook)

- Server function `publishPost` care folosește `META_APP_ID`/`META_APP_SECRET` (deja setate) + token-ul din `meta_connections` pentru a publica pe Facebook Page și Instagram Business prin Graph API v21.
- Endpoint public `/api/public/meta/oauth-callback` pentru fluxul OAuth Meta (long-lived token + page tokens).
- UI în Dashboard → Setări → "Conectează Facebook/Instagram" cu butonul real (nu mai e stub).
- Tratare erori: token expirat, lipsă permisiuni, lipsă cont Instagram Business asociat.

## Etapa 2 — Scheduler + reset cuote (cron)

- Endpoint `/api/public/cron/publish-scheduled` care rulează la fiecare 5 minute: ia postările cu `scheduled_at <= now()` și `status = 'scheduled'`, le publică prin funcția din etapa 1, marchează `status = 'published'` sau `'failed'` cu mesaj.
- Endpoint `/api/public/cron/reset-quotas` care rulează zilnic la 02:00 și apelează `reset_monthly_quotas()`.
- Configurare `pg_cron` cu `apikey` header (anon).
- UI nou: în Dashboard → "Calendar editorial" cu vizualizare lună/săptămână (drag&drop pentru reprogramare).

## Etapa 3 — Generare imagini AI + bibliotecă media + hashtag suggestions

- Buton "Generează imagine" în pagina de generare postare → Lovable AI Gateway (`google/gemini-2.5-flash-image`).
- Upload manual în bucket-ul `post-images` (există deja) + galerie reutilizabilă per brand.
- Sugestii hashtag-uri și "best time to post" generate de AI pe baza domeniului + obiectivului.

## Etapa 4 — Colaborare, notificări, emailuri

- Flow complet invitații brand: trimitere email cu token → pagina `/invitatie/$token` deja există, o conectez la `brand_invitations` + accept/refuse.
- Roluri (owner / editor / viewer) aplicate real în UI (ascunde butoane, blochează acțiuni).
- Approval workflow: status `draft → pending_approval → approved → scheduled/published`.
- Emailuri tranzacționale prin infrastructura Lovable Emails (nu Resend extern): welcome, publicare reușită, publicare eșuată, invitație, reset cuotă, factură (placeholder până la Stripe).
- Notificări in-app (dropdown clopoțel) folosind `notification_preferences`.

## Etapa 5 — GDPR + Trust + Admin + Onboarding

- Pagini publice noi: `/termeni`, `/confidentialitate`, `/cookies`.
- Banner consent cookies (accept/reject/setări) cu salvare în localStorage.
- Drept GDPR: în Setări cont → "Exportă datele mele" (JSON download) + "Șterge cont definitiv".
- Pagina `/status` cu uptime simplu și status componente (DB, AI, Meta).
- Panou admin (`/admin`) protejat cu rol `admin` (tabel `user_roles` separat — nu pe profile): mesaje contact, useri, postări, statistici globale.
- Onboarding wizard post-signup: 3 pași (denumire brand, ton, conectare Meta).

---

## Detalii tehnice cheie

- **Roluri admin**: tabel nou `user_roles` + enum `app_role` + funcție `has_role()` SECURITY DEFINER (nu se stochează rolul pe `users_profiles` — risc de privilege escalation).
- **Cron auth**: header `apikey` cu anon key — nu inventez `CRON_SECRET`.
- **Meta tokens**: long-lived page tokens stocate criptat în `meta_connections` (există deja), refresh automat la 50 zile.
- **Emailuri**: voi verifica `email_domain--check_email_domain_status` la începutul etapei 4 și, dacă nu există domeniu, voi cere să-l configurezi prin dialogul oficial.
- **Migrări DB necesare**:
  - `user_roles` + enum + `has_role()`
  - coloane noi pe `generated_posts`: `approval_status`, `failure_reason`
  - tabel `notifications` (in-app)
  - tabel `cookie_consents` (opțional, pentru audit GDPR)
  - tabel `media_library` cu legătură la `post-images`
- **Pagini noi în `src/routes/`**: `termeni.tsx`, `confidentialitate.tsx`, `cookies.tsx`, `status.tsx`, `_authenticated/calendar.tsx`, `_authenticated/admin/*.tsx`, `_authenticated/setari/cont.tsx`, `_authenticated/onboarding.tsx`.

---

## Ordinea de execuție și acordul tău

Recomand să le fac în ordinea de mai sus (Etapa 1 → 5). Fiecare etapă o livrez într-un turn separat, ca să poți testa între ele. Spune-mi:

1. **Aprobi planul așa cum e?** Dacă da, încep direct cu **Etapa 1 (publicare reală Meta)**.
2. **Vrei o ordine diferită?** (ex: să încep cu GDPR pentru că ai nevoie de el înainte de lansare).
3. **Sari ceva?** (ex: nu vrei admin panel acum).
