import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyBrands, createBrand, updateBrand, getBrandQuota, switchBrand } from "@/lib/brands.functions";
import { Building2, Plus, Check, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/brands")({
  head: () => ({ meta: [{ title: "Clienți / Branduri — Social Spark" }] }),
  component: BrandsPage,
});

type Quota = {
  planId: string;
  planName: string;
  used: number;
  max: number;
  remaining: number;
  isAgency: boolean;
  canCreate: boolean;
};

function BrandsPage() {
  const list = useServerFn(listMyBrands);
  const create = useServerFn(createBrand);
  const update = useServerFn(updateBrand);
  const quotaFn = useServerFn(getBrandQuota);
  const switchFn = useServerFn(switchBrand);
  const [brands, setBrands] = useState<any[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [form, setForm] = useState({ name: "", description: "", business_type: "", domain: "" });
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});

  async function load() {
    const [b, q] = await Promise.all([list() as Promise<any[]>, quotaFn() as Promise<Quota>]);
    setBrands(b);
    setQuota(q);
  }
  useEffect(() => { load(); }, []);

  const isAgency = quota?.isAgency ?? false;
  const noun = isAgency ? "client" : "brand";
  const nounPlural = isAgency ? "clienți" : "branduri";

  async function add() {
    if (form.name.length < 2) return toast.error("Nume prea scurt.");
    setLoading(true);
    try {
      await create({ data: form });
      setForm({ name: "", description: "", business_type: "", domain: "" });
      await load();
      toast.success(isAgency ? "Client adăugat." : "Brand creat.");
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    if (!editId) return;
    try {
      await update({ data: { id: editId, ...editFields } });
      await load();
      setEditId(null);
      toast.success("Salvat.");
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  async function openBrand(brandId: string) {
    try {
      await switchFn({ data: { brandId } });
      toast.success("Brand activ schimbat.");
    } catch (e: any) {
      toast.error(e?.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold">
              {isAgency ? "Clienții agenției" : "Brand-urile tale"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAgency
                ? "Un client = un brand izolat: Brand Brain, Meta, calendar și inbox separate. O factură pentru toți."
                : "Gestionează mai multe afaceri sub același cont."}
            </p>
          </div>
        </div>
        {quota && (
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Plan {quota.planName}</p>
            <p className="font-display text-2xl font-bold tabular-nums">
              {quota.used}<span className="text-muted-foreground text-lg font-normal">/{quota.max}</span>
            </p>
            <p className="text-xs text-muted-foreground">{nounPlural} folosiți</p>
          </div>
        )}
      </div>

      {isAgency && (
        <div className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 text-sm text-muted-foreground space-y-1">
          <p className="text-foreground font-medium">Flow tipic pe client</p>
          <p>1. Adaugi clientul → 2. Completezi Brand Brain → 3. Conectezi Instagram/Facebook → 4. Generezi în Studio → 5. Aprobare → 6. Publicare</p>
        </div>
      )}

      <div className="glass-strong rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Adaugă {noun} nou
        </h2>
        {!quota?.canCreate && quota && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Ai atins limita de {quota.max} {nounPlural} pe planul {quota.planName}.
            {isAgency ? " Scrie-ne pentru un plan de organizație." : " Fă upgrade ca să adaugi mai multe."}
            {!isAgency && (
              <>
                {" "}
                <Link to="/preturi" className="underline text-primary">Vezi planurile</Link>
              </>
            )}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            placeholder={isAgency ? "Nume client / brand" : "Nume brand"}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={!quota?.canCreate}
            className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
          <input
            placeholder="Tip afacere"
            value={form.business_type}
            onChange={(e) => setForm({ ...form, business_type: e.target.value })}
            disabled={!quota?.canCreate}
            className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
          <input
            placeholder="Domeniu"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            disabled={!quota?.canCreate}
            className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
          <input
            placeholder="Descriere scurtă"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={!quota?.canCreate}
            className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
        </div>
        <button
          onClick={add}
          disabled={loading || !quota?.canCreate}
          className="inline-flex items-center gap-2 gradient-bg rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Creează {noun}
        </button>
      </div>

      <div className="space-y-3">
        {brands.map((b) => (
          <div key={b.id} className="glass rounded-xl p-4">
            {editId === b.id ? (
              <div className="space-y-2">
                <input
                  value={editFields.name ?? b.name}
                  onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                  className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm outline-none"
                />
                <textarea
                  value={editFields.description ?? b.description ?? ""}
                  onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                  rows={2}
                  className="w-full bg-input/50 border border-border rounded px-3 py-2 text-xs outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditId(null)} className="text-xs text-muted-foreground px-3 py-1.5">
                    Anulează
                  </button>
                  <button
                    onClick={saveEdit}
                    className="inline-flex items-center gap-1 gradient-bg rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Check className="h-3 w-3" /> Salvează
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-display font-bold flex items-center gap-2">
                    {b.name}{" "}
                    <span className="text-[10px] uppercase text-muted-foreground">{b.role}</span>
                  </div>
                  {b.description && <p className="text-xs text-muted-foreground mt-1">{b.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {b.business_type ?? "—"} · {b.domain ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => openBrand(b.id)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Deschide <ArrowRight className="h-3 w-3" />
                  </button>
                  {b.role === "owner" && (
                    <button
                      onClick={() => {
                        setEditId(b.id);
                        setEditFields({});
                      }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Editează
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {brands.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Niciun {noun} încă. Adaugă primul ca să începi.
          </p>
        )}
      </div>
    </div>
  );
}
