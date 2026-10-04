/** Checks Meta connections and stores results in social_connection_health. Server only. */
export async function runHealthChecks(admin: any, filter: { userId?: string } = {}) {
  const { inspectConnection, getPageInstagram } = await import("./meta.server");
  let q = admin.from("meta_connections").select("id,user_id,page_id,page_access_token,user_access_token,ig_business_id");
  if (filter.userId) q = q.eq("user_id", filter.userId);
  const { data: conns, error } = await q;
  if (error) throw new Error(error.message);
  let checked = 0;
  for (const c of conns ?? []) {
    try {
      const r = await inspectConnection({ pageAccessToken: c.page_access_token, userAccessToken: c.user_access_token });
      const ig = r.valid ? await getPageInstagram(c.page_id, c.page_access_token) : null;
      await admin.from("social_connection_health").upsert({
        connection_id: c.id, user_id: c.user_id, token_valid: r.valid, expires_at: r.expiresAt,
        scopes: r.scopes, missing_scopes: r.missing, instagram_linked: !!(ig?.id ?? c.ig_business_id),
        last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        ...(r.valid ? {} : { last_error: "Conexiunea nu mai este validă. Reconectează pagina." }),
      }, { onConflict: "connection_id" });
      checked++;
    } catch (e: any) {
      console.warn("[meta-health]", c.id, e?.message);
    }
  }
  return { checked };
}
