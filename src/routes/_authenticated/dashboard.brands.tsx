import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyBrands, createBrand, updateBrand } from "@/lib/brands.functions";
import { Building2, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/brands")({
  head: () => ({ meta: [{ title: "Brand-uri — Social Spark" }] }),
  component: BrandsPage,
});

function BrandsPage() {
  const list = useServerFn(listMyBrands);
  const create = useServerFn(createBrand);
  const update = useServerFn(updateBrand);
  const [brands, setBrands] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", description: "", business_type: "", domain: "" });
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [editFields, setEditFields] = useState<any>({});

  async function load() { setBrands(await list() as any); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (form.name.length < 2) return toast.error("Nume prea scurt.");
    setLoading(true);
    try { await create({ data: form }); setForm({ name: "", description: "", business_type: "", domain: "" }); await load(); toast.success("Brand creat."); }
    catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  }

  async function saveEdit() {
    if (!editId) return;
    try { await update({ data: { id: editId, ...editFields } }); await load(); setEditId(null); toast.success("Salvat."); }
    catch (e: any) { toast.error(e?.message); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Brand-urile tale</h1>
          <p className="text-muted-foreground mt-1">Gestionează mai multe afaceri sub același cont.</p>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Adaugă brand nou</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input placeholder="Nume brand" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <input placeholder="Tip afacere" value={form.business_type} onChange={e => setForm({ ...form, business_type: e.target.value })}
            className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <input placeholder="Domeniu" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}
            className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <input placeholder="Descriere scurtă" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <button onClick={add} disabled={loading}
          className="inline-flex items-center gap-2 gradient-bg rounded-lg px-4 py-2.5 text-sm font-semibold text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Creează brand
        </button>
      </div>

      <div className="space-y-3">
        {brands.map(b => (
          <div key={b.id} className="glass rounded-xl p-4">
            {editId === b.id ? (
              <div className="space-y-2">
                <input value={editFields.name ?? b.name} onChange={e => setEditFields({ ...editFields, name: e.target.value })}
                  className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm outline-none" />
                <textarea value={editFields.description ?? b.description ?? ""} onChange={e => setEditFields({ ...editFields, description: e.target.value })} rows={2}
                  className="w-full bg-input/50 border border-border rounded px-3 py-2 text-xs outline-none" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditId(null)} className="text-xs text-muted-foreground px-3 py-1.5">Anulează</button>
                  <button onClick={saveEdit} className="inline-flex items-center gap-1 gradient-bg rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
                    <Check className="h-3 w-3" /> Salvează
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-display font-bold flex items-center gap-2">{b.name} <span className="text-[10px] uppercase text-muted-foreground">{b.role}</span></div>
                  {b.description && <p className="text-xs text-muted-foreground mt-1">{b.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">{b.business_type ?? "—"} · {b.domain ?? "—"}</p>
                </div>
                {b.role === "owner" && (
                  <button onClick={() => { setEditId(b.id); setEditFields({}); }}
                    className="text-xs text-primary hover:underline">Editează</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
