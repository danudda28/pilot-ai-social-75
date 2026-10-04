/** In-app notifications for org members. Server only. */

/** Inserts a notification for every owner/admin/marketer of the org. */
export async function notifyOrg(admin: any, organizationId: string, type: string, title: string, body: string, link?: string) {
  const { data: members } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin", "marketer"]);
  const rows = (members ?? []).map((m: any) => ({
    user_id: m.user_id, type, title, body, link: link ?? null,
  }));
  if (rows.length) await admin.from("notifications").insert(rows);
}
