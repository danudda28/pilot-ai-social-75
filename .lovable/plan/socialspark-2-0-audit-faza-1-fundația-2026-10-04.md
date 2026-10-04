# SocialSpark 2.0 — Audit + Faza 1 (fundația)

## 1. Audit — ce există azi

**Rute publice (păstrăm, unele se refac):** `/`, `/abonamente` (preturi), `/blog`, `/contact`, `/despre`, `/cookies`, `/status`, `/termeni-si-conditii`, `/politica-confidentialitate`, landing-uri SEO, `/invitatie/$token`, `/auth`, `/reset-password`, sitemap.

**Zona logată:** `/dashboard` + 15 subpagini (generate, bulk, import, video, calendar, history, approvals, media, ai-tools, analytics, integrari, brands, team, referral, settings), `/admin`, `/admin/api-runner`.

**Bază de date (17 obiecte):** `users_profiles`, `brands`, `brand_members`, `brand_invitations`, `generated_posts`, `meta_connections`, `notifications`, `notification_preferences`, `email_log`, `referrals`, `testimonials`, `contact_messages`, `newsletter_subscribers`, `user_roles` + funcții `has_role`, `has_brand_role`, `is_brand_member`. Enum-uri: `app_role (admin,user)`, `brand_role (owner,editor,viewer)`.

**RLS:** activ pe toate tabelele; izolarea se face pe `brand_id` + `user_id`. Nu există nivelul „organizație”.

**Funcții server:** AI (texte, imagini, video Replicate, hashtag), publicare Meta, cron (publicare programată, refresh token, sync insights, reset cote), webhook deauthorize Meta, GDPR export/ștergere, admin.

**Integrări:** Lovable AI, Replicate, Meta OAuth (publicare FB + IG), bucket `post-images`.

## 2. Comparație cu promptul

| Zonă | Verdict |
|---|---|
| Auth email/parolă, reset parolă, GDPR, admin cu `user_roles` | **Păstrăm** |
| Generator AI, imagini, video, calendar DnD, import CSV | **Păstrăm**, refactor în Faza 2 |
| Publicare Meta + cron-uri | **Păstrăm**, refactor în Faza 2 (job table + health) |
| Notificări in-app | **Păstrăm**, extindem în Faza 4 |
| `brands` / `brand_members` / roluri owner-editor-viewer | **Refactor**: se pun sub organizații, roluri noi Owner/Admin/Marketer/Agent/Viewer |
| Design (dark, glass, Space Grotesk, gradient peste tot) | **Refactor complet**: deschis + dark mode, carduri curate, gradient doar pe CTA/AI |
| Navigație (16 linkuri orizontale pe mobil) | **Refactor**: 12 secțiuni, sidebar + bottom nav pe mobil |
| Onboarding (dialog 3 pași) | **Înlocuit** cu wizard 6 pași (în Faza 1: pașii 1–3 + 6) |
| Dashboard Acasă | **Refăcut** orientat pe rezultate și „ce trebuie să fac” |
| Organizații, locații, Brand Brain, knowledge base, audit log | **De construit** |
| Inbox AI, conversații, agenți, leaduri, webhook-uri mesaje | **De construit** (Fazele 3–4) |
| Magic link, Google, Facebook login | **De construit** (Google + magic link în Faza 1; Facebook după App Review) |
| Contradicția „3 postări gratuite” vs „30 zile” | **De uniformizat** |

## 3. Migrații propuse (doar adăugări, nimic șters)

Faza 1:
- `organizations` (nume, slug, plan, trial_ends_at, automation_paused) + `organization_members` (rol enum nou `org_role`: owner/admin/marketer/agent/viewer).
- `brands`: coloane noi `organization_id`, `legal_name`, `short_description`, `long_description`, `category`, `subcategory`, `target_audience`, `differentiators`, `values`, `languages`, `timezone`, `currency`, `website_url`, `primary_goal`, `city`, `country`, `deleted_at`.
- `brand_locations` (adresă, oraș, telefon, program JSON, zone deservite, linkuri).
- `brand_voice_rules` (ton, tu/dumneavoastră, emoji, lungime, expresii preferate, cuvinte interzise, exemple postări/răspunsuri, culori, fonturi).
- `business_contacts`, `products_services` (cu preț public/necunoscut), `business_policies`, `faqs`.
- `knowledge_sources` (URL, document, manual; status draft/confirmat) + `knowledge_documents` + `knowledge_chunks` (vector search mai târziu, filtrat pe org + brand).
- `business_scans` (rezultat scanare website, stare „draft” până la confirmare).
- `audit_logs`.
- **Backfill sigur:** pentru fiecare owner existent se creează automat o organizație, brandurile lui sunt legate de ea, membrii existenți sunt copiați (owner→owner, editor→marketer, viewer→viewer). Tabelele vechi rămân funcționale.
- Funcții noi `is_org_member`, `has_org_role` (security definer) + RLS pe toate tabelele noi, cu GRANT-uri.

Fazele următoare: `social_connections`, `webhook_events`, `publishing_jobs`, `campaigns`, `conversations`, `messages`, `comments`, `agent_runs`, `leads`, `usage_events` etc.

## 4. Faze

- **Faza 1 (acum):** design system, organizații + roluri + RLS, branduri și locații, onboarding nou, scanare website, Brand Brain, knowledge base, dashboard Acasă nou, navigație nouă.
- **Faza 2:** strategie 30 zile, generator refăcut, campanii, publishing jobs, Meta OAuth refăcut + „Meta Connection Health”, analytics de bază.
- **Faza 3:** webhooks Meta, conversații, Inbox AI, comentarii, configurare agent, retrieval, draft mode, preluare umană, test lab.
- **Faza 4:** auto-send pentru intenții sigure, leaduri + scoring, notificări email, digest, feedback.
- **Faza 5:** coadă robustă, rate limits, monitorizare, costuri, funcții agenție, integrări CRM.

## 5. Credențiale, permisiuni și variabile

**Există deja:** `META_APP_ID`, `META_APP_SECRET`, `REPLICATE_API_KEY`, AI (inclus), backend.

**Vor fi necesare:**
- `META_WEBHOOK_VERIFY_TOKEN` (Faza 3, generat automat).
- `META_CONFIG_ID` pentru Facebook Login for Business (Faza 2, din Meta Developer).
- Domeniu de email verificat pentru emailuri (DNS `notify.` încă neverificat).
- Google login — se activează din Cloud, fără cheie proprie.
- Stripe — amânat.

**Permisiuni Meta (cerute treptat):**
- Publicare: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`.
- Comentarii: `pages_read_user_content`, `pages_manage_engagement`, `instagram_manage_comments`.
- Mesaje: `pages_messaging`, `instagram_manage_messages`, `pages_manage_metadata` (abonare webhook).
- Insights: `instagram_manage_insights`, `read_insights`.
- Toate necesită App Review + Advanced Access pentru clienți externi.

## 6. Ce livrez în Faza 1

1. **Design system nou**: fundal deschis + dark mode complet, violet-indigo + accent electric discret, Plus Jakarta Sans, radius 16px, umbre fine, gradient doar pe CTA/AI/progres. Componente comune: skeleton, empty state, indicator „Salvat”, confirmare acțiuni.
2. **Navigație nouă**: sidebar cu cele 12 secțiuni + selector afacere/locație; bottom nav pe mobil (5 principale + „Mai mult”). Secțiunile din fazele viitoare (Inbox AI, Leaduri, Campanii) apar marcate „În curând”, fără date false. Paginile existente rămân accesibile.
3. **Organizații și roluri**: creare automată la înregistrare, migrare pentru conturile existente, roluri noi aplicate în UI (Echipă).
4. **Branduri + locații**: CRUD complet, program per locație.
5. **Onboarding 6 pași** (pașii Meta și reguli agent apar ca „disponibil în curând”, nu simulat): date inițiale → scanare website (cu progres) → „Am găsit aceste informații” cu confirmare/corectare pe categorii → identitate brand → prima valoare (Brand Brain inițial + 7 idei de postări salvate ca drafturi).
6. **Brand Brain**: pagină cu secțiuni editabile cu autosave (profil, locații, contacte, produse/servicii, politici, FAQ, voce brand, cuvinte interzise), scor de completare și listă „informații lipsă”.
7. **Knowledge base**: surse (website, text manual, document), stare draft/confirmat; doar informațiile confirmate vor fi folosite de AI.
8. **Acasă nou**: „Ce se întâmplă / Ce trebuie să fac / Ce rezultat am obținut”, checklist de activare persistent, cifre doar din date reale.
9. **Audit log** pentru modificări în Brand Brain, branduri și membri.
10. Uniformizare ofertă trial („30 zile gratuit”) pe tot site-ul.

Nu ating: integrarea Meta, Inbox AI, landing page-ul public (se refac în fazele lor).

## Detalii tehnice

- Scanare website: funcție server care descarcă max ~8 pagini publice din același domeniu, curăță HTML, trimite textul la AI ca **date** (nu instrucțiuni) cu ieșire structurată; rezultat salvat în `business_scans` ca draft.
- RLS: toate tabelele noi au `organization_id` (și `brand_id` unde e cazul); politici prin `is_org_member` / `has_org_role`; scrierile sensibile (membri, roluri) doar owner/admin.
- `brand_id` rămâne cheia de lucru pentru tabelele existente; `brands.organization_id` face legătura, ca să nu stricăm `generated_posts`, calendarul, publicarea.
- Fiecare pas verificat cu build + test în browser pe cont logat.
