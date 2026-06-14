// Traducere mesaje Supabase Auth în română.
export function translateAuthError(message: string | undefined | null): string {
  if (!message) return "A apărut o eroare. Reîncearcă.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email sau parolă greșită.";
  if (m.includes("email not confirmed")) return "Trebuie să confirmi adresa de email înainte să te loghezi.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "Există deja un cont cu acest email. Loghează-te.";
  if (m.includes("password should be at least")) return "Parola trebuie să aibă cel puțin 6 caractere.";
  if (m.includes("rate limit") || m.includes("too many requests")) return "Prea multe încercări. Așteaptă câteva minute și reîncearcă.";
  if (m.includes("network")) return "Conexiune instabilă. Verifică internetul.";
  if (m.includes("invalid email") || m.includes("invalid format")) return "Adresa de email nu este validă.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) return "Înregistrările sunt momentan dezactivate. Contactează-ne.";
  if (m.includes("user not found")) return "Nu există cont cu acest email.";
  if (m.includes("unsupported provider")) return "Această metodă de login nu este disponibilă acum.";
  if (m.includes("captcha")) return "Verificarea CAPTCHA a eșuat. Reîncearcă.";
  if (m.includes("token has expired") || m.includes("jwt expired")) return "Sesiunea a expirat. Loghează-te din nou.";
  return message;
}
