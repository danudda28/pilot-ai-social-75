# AdPilot Social: AI Post Automation

Creează o aplicație web SaaS profesională numită “AdPilot Social”, pentru afaceri care vor să își automatizeze postările pe Instagram și Facebook cu ajutorul AI.

Aplicația trebuie să aibă un design premium, modern, curat, tech, care să capteze instant atenția clientului. Stil vizual: dark premium cu accente mov/albastru electric, efecte glassmorphism, carduri elegante, butoane mari, animații subtile, font modern, layout aerisit, responsive perfect pe mobil și desktop.

Scopul aplicației:
Clientul își creează cont, conectează Instagram/Facebook prin API de social media publishing, alege domeniul de activitate, iar AI-ul îi generează automat postări statice, idei de video/Reels, texte de copywriting, hashtaguri și calendar de postări. Clientul poate aproba, edita și programa postările.

PAGINI PRINCIPALE:

1. Homepage
Creează o secțiune hero foarte puternică cu titlul:
“Postările afacerii tale, create automat cu AI.”

Subtitlu:
“AdPilot Social te ajută să creezi, programezi și publici postări pentru Instagram și Facebook fără să pierzi timp, fără agenție și fără idei blocate.”

Buton principal:
“Începe acum”

Buton secundar:
“Vezi abonamentele”

Adaugă o secțiune cu beneficii:
- AI care înțelege domeniul tău de activitate
- Postări generate automat
- Texte persuasive pentru social media
- Idei de Reels și video
- Programare automată a postărilor
- Calendar editorial lunar
- Recomandări pentru creșterea paginii
- Economie de timp și bani

Adaugă o secțiune “Cum funcționează” cu 4 pași:
1. Îți creezi contul
2. Conectezi Instagram/Facebook
3. Alegi domeniul de activitate
4. AI-ul generează și programează postările

2. Despre noi
Creează pagina “Despre noi” cu următorul text, rescris frumos și premium:

“AdPilot Social a fost creat pentru antreprenorii care știu că prezența online contează, dar nu au timp să stea zilnic să gândească postări, texte, idei și campanii. Aplicația noastră folosește inteligența artificială pentru a transforma orice afacere într-un brand activ, coerent și profesionist pe social media.

Fie că ai un salon, restaurant, clinică, service auto, magazin online, firmă de construcții sau orice alt tip de business, AdPilot Social te ajută să comunici mai clar, mai des și mai convingător cu publicul tău.

Nu înlocuim creativitatea umană, ci eliminăm blocajele, lipsa de timp și haosul din postări. Tu te ocupi de afacere, iar AI-ul nostru te ajută să fii prezent constant online.”

Adaugă și 3 carduri:
- Creat pentru afaceri reale
- Automatizare simplă
- Conținut adaptat brandului tău

3. Prețuri / Abonamente
Creează o pagină de prețuri cu 3 abonamente:

Basic — 29€/lună
Include:
- 12 postări generate lunar
- Texte pentru Instagram și Facebook
- Hashtaguri recomandate
- Idei de postări
- Calendar editorial basic
- Newsletter cu noutăți și promoții

Buton: “Alege Basic”

Pro — 79€/lună
Include:
- 30 postări generate lunar
- Postări statice cu design AI
- Idei de Reels și video
- Programare automată prin API
- Analiză profil Instagram/Facebook
- Recomandări de creștere
- Calendar editorial complet
- Newsletter cu noutăți și promoții

Buton: “Alege Pro”

Business — 199€/lună
Include:
- 90 postări generate lunar
- Mai multe branduri / pagini
- Video scripts pentru Reels
- Automatizare completă postări
- Rapoarte de performanță
- Recomandări AI personalizate
- Prioritate suport
- Funcții avansate de API publishing
- Newsletter cu noutăți și promoții

Buton: “Alege Business”

Adaugă integrare Stripe pentru abonamente. Dacă Stripe nu este configurat încă, creează structura de checkout și lasă variabile placeholder pentru cheile API.

4. Dashboard client
După login, clientul trebuie să aibă dashboard cu:
- status abonament
- număr postări disponibile luna curentă
- buton “Generează postare nouă”
- buton “Conectează Instagram/Facebook”
- calendar postări
- listă postări generate
- status: draft / aprobată / programată / publicată

Formular “Generează postare”:
- domeniu de activitate
- tip afacere
- tonul comunicării: profesional, prietenos, premium, amuzant, direct
- obiectiv postare: vânzare, awareness, promovare ofertă, educare, testimonial
- platformă: Instagram / Facebook / ambele
- tip conținut: postare statică / carousel / idee video / Reels script
- buton “Generează cu AI”

AI-ul trebuie să genereze:
- titlu postare
- copy complet
- variantă scurtă
- hashtaguri
- idee vizuală
- call to action
- sugestie imagine/video
- dată recomandată de publicare

5. API pentru postări
Creează o structură backend pregătită pentru API de social media publishing, cu posibilitatea de conectare la o platformă externă gen Publer, Ayrshare sau Buffer.

Adaugă o secțiune în dashboard numită “Integrări” unde clientul poate:
- conecta Instagram
- conecta Facebook
- vedea status conexiune
- deconecta platformele
- trimite o postare spre programare

Creează endpoint-uri sau funcții pregătite:
- connectSocialAccount()
- generatePost()
- schedulePost()
- publishPost()
- getPostAnalytics()
- getConnectedAccounts()

Folosește placeholder pentru API key:
SOCIAL_PUBLISHING_API_KEY
SOCIAL_PUBLISHING_API_URL

6. Contact
Creează pagina “Contact” cu formular:
- Nume
- Email
- Telefon
- Mesaj
- Buton “Trimite mesaj”

Adaugă date de contact vizibile:
Telefon: 0784227844
Email: bogdansergiu.arghir@gmail.com

Adaugă text:
“Vrei să vezi cum poate AdPilot Social să îți automatizeze prezența online? Contactează-ne și îți arătăm cum poți economisi timp, bani și energie în fiecare lună.”

7. Newsletter
Adaugă posibilitatea ca utilizatorii să se aboneze la newsletter pentru noutăți și promoții.

Formular newsletter:
- email
- checkbox GDPR: “Sunt de acord să primesc noutăți și promoții despre AdPilot Social.”
- buton “Abonează-mă”

Salvează emailurile într-o tabelă Supabase numită newsletter_subscribers.

8. Autentificare
Creează login/register cu email și parolă.
După înregistrare, utilizatorul ajunge în dashboard.
Adaugă protecție pentru paginile dashboard, abonament și integrări.

9. Bază de date Supabase
Creează tabele:
users_profiles:
- id
- user_id
- full_name
- company_name
- phone
- business_type
- subscription_plan
- subscription_status
- created_at

generated_posts:
- id
- user_id
- platform
- content_type
- title
- copy
- short_copy
- hashtags
- visual_idea
- call_to_action
- status
- scheduled_date
- created_at

connected_accounts:
- id
- user_id
- platform
- account_name
- account_id
- access_token_placeholder
- status
- created_at

newsletter_subscribers:
- id
- email
- gdpr_accepted
- created_at

contact_messages:
- id
- name
- email
- phone
- message
- created_at

10. Design extra
Adaugă:
- navbar sticky
- footer complet
- testimoniale demo
- secțiune FAQ
- badge-uri de încredere
- animații la scroll
- carduri cu hover effect
- CTA final pe homepage:
“Lasă AI-ul să lucreze pentru social media-ul afacerii tale.”

Footer:
AdPilot Social
“Automatizare AI pentru Instagram și Facebook.”
Linkuri: Acasă, Despre noi, Prețuri, Contact, Login
Contact: 0784227844 / bogdansergiu.arghir@gmail.com

Important:
Aplicația trebuie să arate ca un SaaS real, premium, pregătit pentru lansare comercială. Textele trebuie să fie persuasive, clare și orientate spre antreprenori care vor mai multă prezență online fără să piardă timp.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pilot-ai-social-75.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7e78f7e-7f2c-4e33-a059-94727fc60058).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
