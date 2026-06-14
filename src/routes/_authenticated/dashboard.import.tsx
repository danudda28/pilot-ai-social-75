import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { importPostsCsv } from "@/lib/bulk-csv.functions";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/import")({
  head: () => ({ meta: [{ title: "Import CSV — Social Spark" }] }),
  component: ImportPage,
});

type ParsedRow = {
  title?: string;
  copy: string;
  hashtags?: string;
  platform?: string;
  scheduled_date?: string | null;
  _error?: string;
};

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const idx = {
    title: header.indexOf("title"),
    copy: header.indexOf("copy"),
    hashtags: header.indexOf("hashtags"),
    platform: header.indexOf("platform"),
    scheduled_date: header.indexOf("scheduled_date"),
  };
  if (idx.copy === -1) {
    throw new Error("Lipsește coloana obligatorie 'copy' în CSV.");
  }
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const copy = cells[idx.copy]?.trim();
    if (!copy) continue;
    const platform = (cells[idx.platform]?.trim().toLowerCase() || "instagram");
    const validPlatform = ["instagram", "facebook", "both"].includes(platform) ? platform : "instagram";
    let scheduled: string | null = null;
    const rawDate = cells[idx.scheduled_date]?.trim();
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) scheduled = d.toISOString();
    }
    rows.push({
      title: cells[idx.title]?.trim() || undefined,
      copy,
      hashtags: cells[idx.hashtags]?.trim() || undefined,
      platform: validPlatform,
      scheduled_date: scheduled,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function ImportPage() {
  const navigate = useNavigate();
  const importCsv = useServerFn(importPostsCsv);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result));
        if (parsed.length === 0) throw new Error("Fișier gol sau fără rânduri valide.");
        if (parsed.length > 100) throw new Error("Maxim 100 de rânduri per import.");
        setRows(parsed);
      } catch (e: any) {
        setParseError(e.message);
        setRows([]);
      }
    };
    reader.readAsText(file);
  }

  async function submit() {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const payload = rows.map(r => ({
        title: r.title,
        copy: r.copy,
        hashtags: r.hashtags,
        platform: (r.platform ?? "instagram") as "instagram" | "facebook" | "both",
        scheduled_date: r.scheduled_date ?? null,
      }));
      const r = await importCsv({ data: { rows: payload } });
      toast.success(`${r.count} postări importate cu succes!`);
      navigate({ to: "/dashboard/calendar" });
    } catch (e: any) {
      toast.error(e.message ?? "Eroare la import.");
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const csv = "title,copy,hashtags,platform,scheduled_date\n" +
      "\"Promo Vineri\",\"Reducere 20% la toate serviciile vinerea asta!\",\"#promo #weekend\",instagram,2026-06-20T18:00:00Z\n" +
      "\"Tutorial rapid\",\"3 pași simpli pentru un ten radiant\",\"#beauty #skincare\",both,\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-postari.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-7 w-7 text-primary" /> Import postări din CSV
        </h1>
        <p className="text-muted-foreground mt-1">
          Încarcă un fișier .csv cu postările tale (max. 100). Coloane acceptate: <code className="text-xs">title, copy, hashtags, platform, scheduled_date</code>. Doar <code className="text-xs">copy</code> e obligatoriu.
        </p>
      </div>

      <div className="glass-strong rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={downloadTemplate}
            className="text-xs underline text-primary hover:text-primary/80">
            Descarcă template CSV
          </button>
          <span className="text-xs text-muted-foreground">Format date: ISO 8601 (ex. 2026-06-20T18:00:00Z)</span>
        </div>

        <label className="block">
          <div className="border-2 border-dashed border-border/60 rounded-xl p-10 text-center hover:border-primary/60 cursor-pointer transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm font-medium">{fileName || "Click pentru a alege fișierul .csv"}</div>
            <div className="text-xs text-muted-foreground mt-1">sau trage-l aici</div>
          </div>
          <input type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>

        {parseError && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="h-4 w-4" /> {rows.length} rânduri valide
            </div>
            <div className="rounded-lg border border-border/40 overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary/40 sticky top-0">
                  <tr><th className="text-left p-2">Title</th><th className="text-left p-2">Copy</th><th className="text-left p-2">Platform</th><th className="text-left p-2">Programat</th></tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t border-border/30">
                      <td className="p-2 truncate max-w-[120px]">{r.title || "—"}</td>
                      <td className="p-2 truncate max-w-[300px]">{r.copy}</td>
                      <td className="p-2 capitalize">{r.platform}</td>
                      <td className="p-2">{r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString("ro-RO") : "draft"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && <div className="p-2 text-center text-xs text-muted-foreground">...și încă {rows.length - 20} rânduri</div>}
            </div>
            <button onClick={submit} disabled={loading}
              className="w-full sm:w-auto inline-flex items-center gap-2 rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Se importă...</> : <><Upload className="h-4 w-4" /> Importă {rows.length} postări</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
