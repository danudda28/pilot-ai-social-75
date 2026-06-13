import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const listPublishedTestimonials = createServerFn({ method: "GET" })
  .handler(async () => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data } = await sb.from("testimonials").select("*").eq("published", true).order("display_order");
    return data ?? [];
  });
