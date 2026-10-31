/** Shared auth for /api/public/cron/* — requires apikey header (anon or service role). */
export function assertCronAuth(request: Request): Response | null {
  const key = request.headers.get("apikey") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const allowed = [
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.CRON_SECRET,
  ].filter(Boolean) as string[];
  if (!allowed.length) {
    // Misconfigured host — refuse rather than open the worker publicly.
    return Response.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!key || !allowed.includes(key)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
