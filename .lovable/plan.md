# Plan: AdPilot Social

Aplicație SaaS completă pentru automatizarea postărilor Instagram/Facebook cu AI. Stil dark premium, mov/albastru electric, glassmorphism.

## 1. Backend (Lovable Cloud)
Activez Lovable Cloud și creez:
- **Tabele**: `users_profiles`, `generated_posts`, `connected_accounts`, `newsletter_subscribers`, `contact_messages`
- **RLS**: fiecare user vede doar datele lui; `newsletter_subscribers` și `contact_messages` permit insert public
- **Trigger** auto-creare profil la signup
- **Auth**: email/parolă (Google adăugat ulterior dacă vrei)

## 2. AI (Lovable AI Gateway)
Server function `generatePost` care folosește `google/gemini-2.5-flash` pentru a genera: titlu, copy lung, copy scurt, hashtaguri, idee vizuală, CTA, sugestie imagine/video, dată recomandată — pe baza domeniului, tonului, obiectivului, platformei.

## 3. Stripe (placeholder)
Structură checkout pregătită cu butoane pe plan. Integrare reală Stripe o pornim când îmi confirmi (recomand `enable_stripe_payments` — fără cont propriu).

## 4. Social Publishing (placeholder Ayrshare/Publer/Buffer)
Server functions stub: `connectSocialAccount`, `schedulePost`, `publishPost`, `getPostAnalytics`, `getConnectedAccounts`. Citesc `SOCIAL_PUBLISHING_API_KEY` și `SOCIAL_PUBLISHING_API_URL` din secrete (le adăugăm când ai contul).

## 5. Pagini publice
- `/` Homepage — hero puternic, beneficii, „Cum funcționează" 4 pași, testimoniale, FAQ, CTA final, newsletter
- `/despre` — text rescris premium + 3 carduri
- `/preturi` — 3 planuri (Basic 29€, Pro 79€, Business 199€)
- `/contact` — formular + date contact (0784227844 / bogdansergiu.arghir@gmail.com)
- `/auth` — login/register

## 6. Pagini protejate (`_authenticated/`)
- `/dashboard` — status abonament, postări rămase, calendar, listă postări (draft/aprobată/programată/publicată), quick actions
- `/dashboard/generate` — formular generare AI cu toate câmpurile cerute
- `/dashboard/integrari` — conectare/deconectare Instagram & Facebook
- `/dashboard/calendar` — calendar editorial

## 7. Design system
- Tokens oklch: background `#0a0a14`, accent violet `#8b5cf6`, accent electric blue `#3b82f6`, glass surfaces
- Font: Space Grotesk (display) + Inter (body)
- Glassmorphism cards, gradient borders, soft glow shadows
- Animații subtile fade-in / scale la scroll
- Navbar sticky cu blur, footer complet

## 8. Detalii tehnice
- TanStack Start + Tailwind v4 + shadcn
- `mem://` setat cu paleta și regulile de design
- SEO: head() per pagină, sitemap.xml, robots.txt
- Responsive mobile-first

## Ce las pentru iterații ulterioare (confirmă dacă vrei acum)
- Activare Stripe reală (necesită confirmare ta — Pro plan)
- Conectare reală Ayrshare/Publer (am nevoie de cont + API key)
- Trimitere efectivă email pentru contact/newsletter (Resend)

Confirmi să pornesc cu tot pachetul de mai sus (Cloud + AI + UI complet + stubs pentru Stripe & publishing)?
