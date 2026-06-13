import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePost } from "@/lib/ai.functions";
import { generatePostImage, uploadPostImage } from "@/lib/image.functions";
import { updatePost } from "@/lib/posts.functions";
import { toast } from "sonner";
import { Wand2, Loader2, ImageIcon, RefreshCw, Upload, Pencil, Check as CheckIcon } from "lucide-react";
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
  const savePost = useServerFn(updatePost);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({ title: "", copy: "", short_copy: "", hashtags: "", call_to_action: "" });
  const [form, setForm] = useState({
    domain: "", businessType: "", tone: "profesional", goal: "vanzare",
    platform: "instagram", contentType: "static", extraContext: "",
  });

  useEffect(() => {
    if (result?.post) {
      setEdit({
        title: result.post.title ?? "",
        copy: result.post.copy ?? "",
        short_copy: result.post.short_copy ?? "",
        hashtags: result.post.hashtags ?? "",
        call_to_action: result.post.call_to_action ?? "",
      });
      setEditing(false);
    }
  }, [result?.post?.id]);

  async function saveEdits() {
    if (!result?.post?.id) return;
    setSaving(true);
    try {
      await savePost({ data: { postId: result.post.id, ...edit } });
      setResult({ ...result, post: { ...result.post, ...edit } });
      setEditing(false);
      toast.success("Modificări salvate.");
    } catch (e: any) {
      toast.error(e?.message || "Salvare eșuată.");
    } finally {
      setSaving(false);
    }
  }

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
          <div className="flex items-start justify-between gap-4">
            {editing ? (
              <input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })}
                className="flex-1 font-display text-2xl font-bold bg-input/50 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
            ) : (
              <h2 className="font-display text-2xl font-bold gradient-text flex-1">{edit.title || result.post.title}</h2>
            )}
            {editing ? (
              <button onClick={saveEdits} disabled={saving}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg gradient-bg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
                Salvează
              </button>
            ) : (
              <button onClick={() => setEditing(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg glass-strong px-3 py-2 text-xs font-medium hover:bg-secondary">
                <Pencil className="h-3 w-3" /> Editează
              </button>
            )}
          </div>

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

          <EditableSection label="Copy complet" editing={editing} value={edit.copy}
            onChange={v => setEdit({ ...edit, copy: v })} rows={8} />
          <EditableSection label="Variantă scurtă" editing={editing} value={edit.short_copy}
            onChange={v => setEdit({ ...edit, short_copy: v })} rows={2} />
          <EditableSection label="Hashtaguri" editing={editing} value={edit.hashtags}
            onChange={v => setEdit({ ...edit, hashtags: v })} rows={2} accent />
          <Section label="Idee vizuală"><p className="text-sm">{result.post.visual_idea}</p></Section>
          <EditableSection label="Call to action" editing={editing} value={edit.call_to_action}
            onChange={v => setEdit({ ...edit, call_to_action: v })} rows={1} />
          {result.ai?.image_suggestion && <Section label="Sugestie imagine/video"><p className="text-sm">{result.ai.image_suggestion}</p></Section>}
          {result.ai?.recommended_date && <Section label="Dată recomandată"><p className="text-sm">{result.ai.recommended_date}</p></Section>}
          <Section label="Preview Instagram/Facebook">
            <SocialPreview title={edit.title} copy={edit.copy} hashtags={edit.hashtags} imageUrl={imgUrl} />
          </Section>
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

function EditableSection({ label, editing, value, onChange, rows, accent }: {
  label: string; editing: boolean; value: string; onChange: (v: string) => void; rows: number; accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="glass rounded-xl p-4">
        {editing ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
            className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-y" />
        ) : (
          <p className={`whitespace-pre-wrap text-sm ${accent ? "text-accent" : ""}`}>{value}</p>
        )}
      </div>
    </div>
  );
}

function SocialPreview({ title, copy, hashtags, imageUrl }: {
  title: string; copy: string; hashtags: string; imageUrl: string | null;
}) {
  return (
    <div className="max-w-sm mx-auto bg-white text-black rounded-xl overflow-hidden shadow-xl">
      <div className="flex items-center gap-2 p-3 border-b border-gray-200">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500" />
        <span className="text-xs font-semibold">your_business</span>
      </div>
      {imageUrl ? (
        <img src={imageUrl} alt="preview" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gray-100 grid place-items-center text-xs text-gray-400">
          [imagine]
        </div>
      )}
      <div className="p-3 space-y-1">
        {title && <p className="text-sm font-bold">{title}</p>}
        <p className="text-xs whitespace-pre-wrap line-clamp-6">{copy}</p>
        {hashtags && <p className="text-xs text-blue-700">{hashtags}</p>}
      </div>
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
