import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePost } from "@/lib/ai.functions";
import { generatePostImage, uploadPostImage } from "@/lib/image.functions";
import { toast } from "sonner";
import { Wand2, Loader2, ImageIcon, RefreshCw, Upload } from "lucide-react";
import { PublishActions } from "@/components/PublishActions";

export const Route = createFileRoute("/_authenticated/dashboard/generate")({
  head: () => ({ meta: [{ title: "Generează postare — Social Spark" }] }),
  component: Generate,
});

const tones = [
  { v: "profesional", l: "Profesional" },
  { v: "prietenos", l: "Prietenos" },
  { v: "premium", l: "Premium" },
  { v: "amuzant", l: "Amuzant" },
  { v: "direct", l: "Direct" },
];
const goals = [
  { v: "vanzare", l: "Vânzare" },
  { v: "awareness", l: "Awareness" },
  { v: "promovare", l: "Promovare ofertă" },
  { v: "educare", l: "Educare" },
  { v: "testimonial", l: "Testimonial" },
];
const platforms = [
  { v: "instagram", l: "Instagram" },
  { v: "facebook", l: "Facebook" },
  { v: "both", l: "Ambele" },
];
const contentTypes = [
  { v: "static", l: "Postare statică" },
  { v: "carousel", l: "Carousel" },
  { v: "video", l: "Idee video" },
  { v: "reels", l: "Reels script" },
];

function Generate() {
  const navigate = useNavigate();
  const generate = useServerFn(generatePost);
  const generateImage = useServerFn(generatePostImage);
  const uploadImage = useServerFn(uploadPostImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    domain: "", businessType: "", tone: "profesional", goal: "vanzare",
    platform: "instagram", contentType: "static", extraContext: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.domain || !form.businessType) { toast.error("Completează domeniul și tipul afacerii."); return; }
    setLoading(true); setResult(null); setImgUrl(null);
    try {
      const r = await generate({ data: form as any });
      setResult(r);
      toast.success("Postare generată! Generez și imaginea...");
      const imgPrompt = r.post.visual_idea || r.ai?.image_suggestion || `${form.businessType}, ${form.domain}`;
      generateImageFor(r.post.id, imgPrompt);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("402")) toast.error("Creditele AI s-au epuizat. Reîncarcă în Settings.");
      else if (msg.includes("429")) toast.error("Prea multe cereri. Reîncearcă în câteva secunde.");
      else toast.error(msg || "Eroare la generare.");
    } finally {
      setLoading(false);
    }
  }

  async function generateImageFor(postId: string, prompt: string) {
    setImgLoading(true);
    try {
      const { signedUrl } = await generateImage({ data: { postId, prompt } });
      setImgUrl(signedUrl);
    } catch (e: any) {
      toast.error(e?.message || "Eroare la generarea imaginii.");
    } finally {
      setImgLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !result?.post?.id) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Format acceptat: PNG, JPG sau WEBP."); return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Imagine prea mare (max 6 MB)."); return;
    }
    setImgLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("Citire eșuată"));
        r.readAsDataURL(file);
      });
      const { signedUrl } = await uploadImage({
        data: { postId: result.post.id, dataUrl, mimeType: file.type as any },
      });
      setImgUrl(signedUrl);
      toast.success("Imagine încărcată!");
    } catch (e: any) {
      toast.error(e?.message || "Upload eșuat.");
    } finally {
      setImgLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Generează postare cu AI</h1>
        <p className="text-muted-foreground mt-1">Spune-i AI-ului ce vrei și primești în câteva secunde.</p>
      </div>

      <form onSubmit={submit} className="glass-strong rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Domeniu de activitate" placeholder="ex: frumusețe, food, auto, fitness"
            v={form.domain} on={v => setForm({...form, domain: v})} />
          <Input label="Tip afacere" placeholder="ex: salon de înfrumusețare, restaurant pizza"
            v={form.businessType} on={v => setForm({...form, businessType: v})} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Ton" v={form.tone} on={v => setForm({...form, tone: v})} options={tones} />
          <Select label="Obiectiv" v={form.goal} on={v => setForm({...form, goal: v})} options={goals} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Platformă" v={form.platform} on={v => setForm({...form, platform: v})} options={platforms} />
          <Select label="Tip conținut" v={form.contentType} on={v => setForm({...form, contentType: v})} options={contentTypes} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Detalii suplimentare (opțional)</label>
          <textarea value={form.extraContext} onChange={e => setForm({...form, extraContext: e.target.value})} rows={3}
            placeholder="ex: ofertă reducere 20% până vineri, produs nou X..."
            className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
        </div>
        <button disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generează...</> : <><Wand2 className="h-4 w-4" /> Generează cu AI</>}
        </button>
      </form>

      {result && (
        <div className="glass-strong rounded-2xl p-6 sm:p-8 space-y-5 animate-fade-in">
          <h2 className="font-display text-2xl font-bold gradient-text">{result.post.title}</h2>

          <Section label="Imagine generată">
            {imgLoading ? (
              <div className="aspect-square w-full max-w-md mx-auto rounded-xl bg-secondary/40 grid place-items-center text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs">AI desenează imaginea...</span>
                </div>
              </div>
            ) : imgUrl ? (
              <div className="space-y-3">
                <img src={imgUrl} alt={result.post.title ?? "Imagine postare"}
                  className="w-full max-w-md mx-auto rounded-xl shadow-lg" />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => generateImageFor(result.post.id, result.post.visual_idea ?? "")}
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
                    <RefreshCw className="h-3 w-3" /> Regenerează cu AI
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
                    <Upload className="h-3 w-3" /> Înlocuiește cu poza ta
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => generateImageFor(result.post.id, result.post.visual_idea ?? "")}
                  className="inline-flex items-center gap-2 rounded-xl glass-strong px-4 py-2.5 text-sm">
                  <ImageIcon className="h-4 w-4" /> Generează cu AI
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl glass-strong px-4 py-2.5 text-sm">
                  <Upload className="h-4 w-4" /> Încarcă poza ta
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Section>

          <Section label="Copy complet"><p className="whitespace-pre-wrap text-sm">{result.post.copy}</p></Section>
          <Section label="Variantă scurtă"><p className="text-sm">{result.post.short_copy}</p></Section>
          <Section label="Hashtaguri"><p className="text-sm text-accent">{result.post.hashtags}</p></Section>
          <Section label="Idee vizuală"><p className="text-sm">{result.post.visual_idea}</p></Section>
          <Section label="Call to action"><p className="text-sm font-medium">{result.post.call_to_action}</p></Section>
          {result.ai?.image_suggestion && <Section label="Sugestie imagine/video"><p className="text-sm">{result.ai.image_suggestion}</p></Section>}
          {result.ai?.recommended_date && <Section label="Dată recomandată"><p className="text-sm">{result.ai.recommended_date}</p></Section>}
          <Section label="Publicare">
            <PublishActions postId={result.post.id} defaultPlatform={form.platform} />
          </Section>
          <div className="pt-4 flex gap-3">
            <button onClick={() => navigate({ to: "/dashboard" })} className="rounded-xl glass-strong px-5 py-2.5 text-sm font-semibold">
              Vezi în dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, v, on, placeholder }: { label: string; v: string; on: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input value={v} onChange={e => on(e.target.value)} placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}
function Select({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select value={v} onChange={e => on(e.target.value)}
        className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary">
        {options.map(o => <option key={o.v} value={o.v} className="bg-card">{o.l}</option>)}
      </select>
    </div>
  );
}
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="glass rounded-xl p-4">{children}</div>
    </div>
  );
}
