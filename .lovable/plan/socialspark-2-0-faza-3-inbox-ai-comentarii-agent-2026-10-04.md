# SocialSpark 2.0 — Faza 3: Inbox AI, comentarii, agent

## Ce livrez

1. **Primirea mesajelor și comentariilor de la Meta**: o adresă securizată la care Meta trimite mesajele (Messenger, Instagram Direct) și comentariile, în momentul în care apar. Fiecare notificare se verifică cu semnătura Meta. Se salvează o singură dată, chiar dacă Meta o retrimite.
2. **Inbox AI** (nu mai e „În curând”):
   - listă de conversații, pe Facebook, Instagram și comentarii, cu filtre: necitite, așteaptă răspuns, preluate de om, închise;
   - firul complet al conversației și un răspuns scris de tine, trimis prin Meta;
   - **draft AI**: pentru fiecare mesaj nou, AI-ul propune un răspuns, iar tu îl aprobi, îl editezi sau îl respingi. În această fază nimic nu pleacă automat.
   - **preluare umană**: butonul „Preiau eu” oprește AI-ul pe conversația respectivă.
   Inboxul afișează doar mesaje reale. Când nu există niciunul, explic de ce, de exemplu „lipsește permisiunea de mesaje” sau „nu a venit niciun mesaj încă”.
3. **Comentarii**: comentariile la postări apar în Inbox, separat de mesaje. Ai răspuns propus de AI și acțiunile răspunde, ascunde sau marchează ca rezolvat.
4. **Configurare agent** (pagină nouă „Agent AI”):
   - pornit sau oprit și programul de lucru;
   - subiectele la care nu are voie să răspundă: prețuri neconfirmate, reclamații, date medicale sau juridice;
   - situațiile în care predă conversația unui om: client nervos, cerere de rambursare, cuvinte-cheie alese de tine;
   - mesajul afișat clientului la predare.
   Modul este fixat pe „doar drafturi”. Trimiterea automată vine în Faza 4.
5. **Răspunsuri bazate pe informațiile tale**: AI-ul caută în Brand Brain (FAQ, produse, politici, locații, surse confirmate) doar ce e relevant pentru întrebare. Dacă nu găsește răspunsul, spune asta și propune predarea către un om, în loc să inventeze. Fiecare draft arată sursele pe care le-a folosit.
6. **Test Lab**: scrii un mesaj ca și cum ai fi client și vezi ce ar răspunde agentul, ce surse a folosit și dacă ar preda conversația unui om. Merge și fără Meta conectat, pentru că nu trimite nimic nicăieri.

## Ce e nevoie de la tine/Meta (nu simulez)

- Generez automat un cod secret de verificare. Îți dau adresa de webhook și codul, ca să le pui în Meta Developer, la Webhooks (Page + Instagram).
- Permisiuni necesare, toate cu App Review:
  - pentru mesaje: `pages_messaging`, `instagram_manage_messages`, `pages_manage_metadata`;
  - pentru comentarii: `pages_read_user_content`, `pages_manage_engagement`, `instagram_manage_comments`.
  Le adaug în cererea de conectare. Până la aprobare, ele funcționează doar pentru conturile de test sau administratorii aplicației.
- După reconectare, abonez automat fiecare pagină la notificările Meta (`subscribed_apps`).

## Detalii tehnice

- Migrație nouă, doar cu adăugări:
  - `webhook_events`: payload brut, semnătură validă, procesat, cheie unică pentru deduplicare;
  - `conversations`: brand, conexiune, canal messenger/instagram/comment, id extern, client (id, nume), status open/pending/human/closed, `ai_paused`, `last_message_at`, `unread`;
  - `messages`: conversation, direcție in/out, text, id extern unic, autor, `sent_at`;
  - `ai_reply_drafts`: conversation, message, text, surse (JSON), încredere, `handoff_suggested`, status pending/approved/rejected/sent, `edited_text`;
  - `agent_settings`: unul per brand; enabled, mode='draft', ore, subiecte interzise, cuvinte-cheie de predare, mesaj de predare.
  - Toate au `organization_id` prin trigger și RLS prin is_org_member/has_org_role. Agentul de tip „agent” poate citi și răspunde, dar nu poate schimba setările.
- Rută `/api/public/webhooks/meta`: GET face verificarea `hub.challenge` cu `META_WEBHOOK_VERIFY_TOKEN`; POST verifică HMAC `X-Hub-Signature-256` cu `META_APP_SECRET`, salvează evenimentul, îl normalizează în conversație și mesaj, apoi generează draftul AI.
- Trimiterea se face prin Graph API: `/{page_id}/messages` pentru Messenger și IG DM (fereastra de 24h e verificată), respectiv `/{comment_id}/replies` și `/{ig_comment_id}/replies` pentru comentarii.
- Căutarea informațiilor: potrivire pe cuvinte-cheie în română (fără diacritice, cu scor) peste datele confirmate din Brand Brain, cu top 6 fragmente. Embeddings se adaugă în Faza 5, dacă va fi nevoie.
- Generarea folosește Gemini 2.5 Flash cu ieșire JSON {reply, sources, confidence, handoff, reason}. Mesajul clientului e tratat ca date, nu ca instrucțiuni.
- Verificare: build, test în browser (Test Lab, Inbox gol cu explicație, setări agent) și un POST de test semnat pe webhook.
