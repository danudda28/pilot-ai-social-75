/**
 * Buffer API v1 helper. Server-only.
 * Docs: https://buffer.com/developers/api
 */
const BUFFER_API = "https://api.bufferapp.com/1";

function token() {
  const t = process.env.BUFFER_ACCESS_TOKEN;
  if (!t) throw new Error("BUFFER_ACCESS_TOKEN nu este configurat.");
  return t;
}

export type BufferProfile = {
  id: string;
  service: string; // "instagram" | "facebook" | ...
  service_username?: string;
  formatted_username?: string;
  avatar?: string;
};

export async function listBufferProfiles(): Promise<BufferProfile[]> {
  const res = await fetch(`${BUFFER_API}/profiles.json?access_token=${token()}`);
  if (!res.ok) throw new Error(`Buffer profiles error: ${res.status} ${await res.text()}`);
  return (await res.json()) as BufferProfile[];
}

type CreateUpdateOpts = {
  profileIds: string[];
  text: string;
  /** Unix timestamp (seconds). Omit + now=true to publish immediately. */
  scheduledAt?: number;
  now?: boolean;
  /** Public URL to image (Buffer needs to fetch it). */
  imageUrl?: string;
};

export async function createBufferUpdate(opts: CreateUpdateOpts) {
  const body = new URLSearchParams();
  body.append("access_token", token());
  body.append("text", opts.text);
  opts.profileIds.forEach(id => body.append("profile_ids[]", id));
  if (opts.now) body.append("now", "true");
  else if (opts.scheduledAt) body.append("scheduled_at", String(opts.scheduledAt));
  if (opts.imageUrl) {
    body.append("media[photo]", opts.imageUrl);
    body.append("media[picture]", opts.imageUrl);
    body.append("media[thumbnail]", opts.imageUrl);
  }

  const res = await fetch(`${BUFFER_API}/updates/create.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = await res.json() as any;
  if (!res.ok || json.success === false) {
    throw new Error(`Buffer publish error: ${json?.message ?? res.status}`);
  }
  return json;
}
