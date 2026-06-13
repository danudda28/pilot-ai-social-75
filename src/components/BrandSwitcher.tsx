import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyBrands, switchBrand, createBrand } from "@/lib/brands.functions";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Check, Plus, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Brand = { id: string; name: string; role: string };

export function BrandSwitcher() {
  const list = useServerFn(listMyBrands);
  const switchFn = useServerFn(switchBrand);
  const createFn = useServerFn(createBrand);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function refresh() {
    try {
      const b = await list();
      setBrands(b as any);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("users_profiles").select("current_brand_id").eq("user_id", user.id).maybeSingle();
        setCurrentId(data?.current_brand_id ?? b[0]?.id ?? null);
      }
    } catch {}
  }
  useEffect(() => { refresh(); }, []);

  const current = brands.find(b => b.id === currentId) ?? brands[0];

  async function pick(id: string) {
    setCurrentId(id);
    setOpen(false);
    try { await switchFn({ data: { brandId: id } }); toast.success("Brand schimbat."); window.location.reload(); }
    catch (e: any) { toast.error(e?.message); }
  }

  async function create() {
    if (newName.trim().length < 2) return;
    setCreating(true);
    try {
      const b = await createFn({ data: { name: newName.trim() } });
      setNewName("");
      await refresh();
      await pick((b as any).id);
    } catch (e: any) { toast.error(e?.message); }
    finally { setCreating(false); }
  }

  if (!current) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 rounded-lg glass px-3 py-2 text-sm hover:bg-secondary">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="flex-1 truncate text-left font-medium">{current.name}</span>
        <span className="text-[10px] uppercase text-muted-foreground">{current.role}</span>
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 glass-strong rounded-lg border border-border/50 z-50 p-2 space-y-1">
          {brands.map(b => (
            <button key={b.id} onClick={() => pick(b.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-secondary">
              {b.id === current.id ? <Check className="h-3 w-3 text-primary" /> : <span className="w-3" />}
              <span className="flex-1 text-left truncate">{b.name}</span>
              <span className="text-[10px] text-muted-foreground">{b.role}</span>
            </button>
          ))}
          <div className="border-t border-border/40 pt-2 mt-2 flex gap-1">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Brand nou..."
              className="flex-1 bg-input/50 rounded px-2 py-1 text-xs outline-none border border-border focus:border-primary" />
            <button onClick={create} disabled={creating}
              className="rounded gradient-bg px-2 py-1 text-xs text-white">
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
