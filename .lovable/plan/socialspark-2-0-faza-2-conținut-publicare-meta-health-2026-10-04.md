# SocialSpark 2.0 — Faza 2: conținut, publicare, Meta Health

## Ce livrez

1. **Strategie pe 30 de zile**: AI-ul face un plan pe baza informațiilor confirmate din Brand Brain (obiectiv, public, produse, ton). Planul are teme pe săptămâni și un număr de postări pe zi. Îl poți edita și apoi îl transformi în drafturi, cu un singur buton.
2. **Generator refăcut**: folosește automat Brand Brain (vocea, cuvintele interzise, ofertele confirmate). Nu mai trebuie să completezi de fiecare dată domeniul și tonul. Fiecare postare trece printr-o verificare: dacă textul conține un cuvânt interzis, primești un avertisment.
3. **Campanii** (pagina nu mai apare „În curând”): poți crea o campanie, de exemplu o reducere sau un eveniment, cu perioadă, ofertă și obiectiv. Generezi postări legate de ea și vezi pentru fiecare câte sunt drafturi, programate sau publicate.
4. **Coadă de publicare sigură**: fiecare publicare programată devine o sarcină cu stare (în așteptare, se publică, publicat, eșuat). Reîncercările sunt automate, cu pauză între ele, iar mesajul de eroare e afișat pe înțeles. O postare nu poate fi publicată de două ori. Calendarul și Istoricul arată starea reală.
5. **Starea conexiunii Meta**: pe pagina Integrări vezi, pentru fiecare pagină conectată:
   - dacă tokenul e valid și când expiră;
   - dacă are Instagram legat;
   - ce permisiuni lipsesc;
   - când a reușit și când a eșuat ultima publicare.
   Primești o alertă pe Acasă când e nevoie să reconectezi. Conectarea Meta rămâne cea actuală. Facebook Login for Business se activează doar după ce adaugi codul de configurare primit de la Meta.
6. **Statistici de bază**: postări publicate, programate și eșuate, plus reach și interacțiuni, doar din datele sincronizate efectiv de la Meta. Unde nu există date, afișez un mesaj clar, nu cifre inventate.

Nu ating: Inbox AI, mesaje, comentarii (Faza 3), Stripe, landing page-ul public.

## Detalii tehnice

- Migrație nouă, doar cu adăugări:
  - `content_strategies` (brand, perioadă, obiectiv, plan în format JSON, stare);
  - `campaigns` (brand, nume, tip, ofertă, start/end, obiectiv, stare);
  - `publishing_jobs` (post, țintă fb/ig, connection, status, attempts, next_attempt_at, last_error, external_id, cheie unică post+țintă pentru idempotență);
  - `social_connection_health` (connection_id, token_valid, expires_at, scopes, missing_scopes, last_checked_at, last_success_at, last_error).
  - `generated_posts` primește coloanele `campaign_id` și `strategy_id` (nullable).
  - Toate tabelele au organization_id prin trigger, RLS prin is_org_member/has_org_role și GRANT-urile necesare.
- Cron-ul `publish-scheduled` va crea sarcinile de publicare și le va procesa cu backoff (1, 5, 15 minute, maximum 3 încercări). `publishPost`, cel pentru publicarea imediată, va folosi aceeași coadă.
- O funcție server `checkMetaHealth` apelează `debug_token` și `/me/permissions`. Rulează la cerere și zilnic, prin cron-ul de refresh care există deja.
- Generatorul și strategia apelează aceeași funcție, care construiește contextul din Brand Brain cu date confirmate, folosind Gemini 2.5 Flash.
- Fiecare pas e verificat cu build și cu un test în browser, pe contul logat.
