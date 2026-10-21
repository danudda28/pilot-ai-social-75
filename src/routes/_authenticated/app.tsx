import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { CalendarDays, Coins, LayoutGrid, LogOut, Plug, Settings2, Sparkles, Tag, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getWorkspace,
  workspaceChat,
  workspaceDeletePhoto,
  workspaceDeletePost,
  workspaceEditImage,
  workspaceGenerate,
  workspaceRenderVideo,
  workspaceAttachVideo,
  workspaceUpdatePost,
  type ChatAction,
  type WorkspacePhoto,
  type WorkspacePost,
} from "@/lib/workspace.functions";
import { blobToDataUrl, burnSubtitles, canBurnSubtitles } from "@/lib/burn-subtitles.client";
import { publishStudioSelection, uploadStudioReference } from "@/lib/studio.functions";
import { ChatPanel, type ChatMsg, type Progress, type QuickAction } from "@/components/workspace/ChatPanel";
import { CalendarBoard } from "@/components/workspace/CalendarBoard";
import { EditDialog, PostPreview, PostsGrid, PublishDialog, type Target } from "@/components/workspace/PostsBoard";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Spark — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: WorkspacePage,
});

type Workspace = {
  brand: { id: string | null; name: string; short_description: string | null };
  hasProfile: boolean;
  posts: WorkspacePost[];
  photos: WorkspacePhoto[];
  targets: Target[];
  plan: string;
  isFree: boolean;
  remaining: number;
};

type NewMsg = ChatMsg extends infer M ? (M extends ChatMsg ? Omit<M, "id" | "ts"> : never) : never;

const IMAGE_STAGES = ["Caut idei creative pentru postări…", "Scriu descrierile în română…", "Creez vizualurile cu produsul tău…", "Verific textele și detaliile…"];
const VIDEO_STAGES = ["Planific scenariul reelului…", "Filmez cadrele cu produsul tău…", "Pregătesc subtitrarea corectată…", "Montez clipul final…"];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function greeting(ws: Workspace): ChatMsg {
  return {
    id: uid(),
    role: "assistant",
    ts: Date.now(),
    text: ws.hasProfile
      ? `Bine ai revenit! Ce creăm azi pentru ${ws.brand.name}? Pot face un reel nou, mai multe poze sau pot modifica o postare existentă.`
      : "👋 Salut, sunt Spark — social media managerul tău AI. Creez reels și postări care opresc scrollul și le public pentru tine pe Facebook și Instagram.\n\nHai să începem simplu: spune-mi în câteva cuvinte cu ce se ocupă afacerea ta.",
  };
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Nu am putut citi fișierul."));
    r.readAsDataURL(file);
  });
}

function WorkspacePage() {
  const navigate = useNavigate();
  const loadFn = useServerFn(getWorkspace);
  const chatFn = useServerFn(workspaceChat);
  const genFn = useServerFn(workspaceGenerate);
  const renderFn = useServerFn(workspaceRenderVideo);
  const attachVideoFn = useServerFn(workspaceAttachVideo);
  const editImgFn = useServerFn(workspaceEditImage);
  const updateFn = useServerFn(workspaceUpdatePost);
  const delPostFn = useServerFn(workspaceDeletePost);
  const delPhotoFn = useServerFn(workspaceDeletePhoto);
  const uploadFn = useServerFn(uploadStudioReference);
  const publishFn = useServerFn(publishStudioSelection);

  const [ws, setWs] = useState<Workspace | null>(null);
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>(null);
  const [placeholders, setPlaceholders] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"posts" | "calendar">("posts");
  const [editPost, setEditPost] = useState<WorkspacePost | null>(null);
  const [publishPost, setPublishPost] = useState<WorkspacePost | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const chatKey = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const data = (await loadFn()) as Workspace;
    setWs(data);
    return data;
  }, [loadFn]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    refresh()
      .then((data) => {
        chatKey.current = `ss-ws-chat:${data.brand.id ?? "default"}`;
        let saved: ChatMsg[] = [];
        try {
          saved = JSON.parse(localStorage.getItem(chatKey.current) ?? "[]");
        } catch {
          saved = [];
        }
        setMessages(saved.length ? saved : [greeting(data)]);
        if (data.posts[0]) setSelectedId(data.posts[0].id);
      })
      .catch((e) => toast.error(e?.message ?? "Nu am putut încărca spațiul de lucru."));
  }, []);

  useEffect(() => {
    if (!chatKey.current || !messages.length) return;
    try {
      localStorage.setItem(chatKey.current, JSON.stringify(messages.slice(-80)));
    } catch {
      /* quota */
    }
  }, [messages]);

  const anyCreating = !!ws?.posts.some((p) => p.state === "creating");
  useEffect(() => {
    if (!anyCreating || busy) return;
    const t = window.setInterval(() => void refresh().catch(() => {}), 15000);
    return () => window.clearInterval(t);
  }, [anyCreating, busy, refresh]);

  const push = (m: NewMsg) => setMessages((prev) => [...prev, { id: uid(), ts: Date.now(), ...m } as ChatMsg]);

  const mergePost = (post: WorkspacePost) =>
    setWs((w) => (w ? { ...w, posts: w.posts.some((p) => p.id === post.id) ? w.posts.map((p) => (p.id === post.id ? post : p)) : [post, ...w.posts] } : w));

  const selected = useMemo(() => ws?.posts.find((p) => p.id === selectedId) ?? null, [ws, selectedId]);

  async function renderVideo(postId: string, instruction?: string) {
    setProgress({ stages: VIDEO_STAGES, startedAt: Date.now(), etaSec: 240 });
    try {
      const r = await renderFn({ data: { postId, instruction } });
      mergePost(r.post);
      setSelectedId(r.post.id);
      if (r.subtitles?.length && r.post.mediaUrl && canBurnSubtitles()) {
        setProgress({ stages: ["Adaug subtitrarea… lasă pagina deschisă câteva secunde"], startedAt: Date.now(), etaSec: 12 });
        try {
          const blob = await burnSubtitles(r.post.mediaUrl, r.subtitles);
          if (blob) {
            const saved = await attachVideoFn({ data: { postId: r.post.id, dataUrl: await blobToDataUrl(blob) } });
            mergePost(saved.post);
          }
        } catch (subErr) {
          console.error("[workspace subtitles]", subErr);
        }
      }
      push({ role: "assistant", text: instruction ? "Am refilmat reelul cu modificările tale. Uită-te și spune-mi dacă mai schimbăm ceva." : "Reelul tău e gata! 🎬 Îl vezi chiar acum în dreapta — spune-mi ce părere ai." });
      if (r.note) push({ role: "system", text: r.note });
    } catch (e: any) {
      push({ role: "assistant", text: `Nu am reușit să filmez reelul: ${e?.message ?? "eroare necunoscută"}. Poți încerca din nou din previzualizare.` });
      await refresh().catch(() => {});
    } finally {
      setProgress(null);
    }
  }

  async function generate(mode: "demo" | "video" | "images", opts: { count?: number; instruction?: string } = {}) {
    if (!ws) return;
    if (ws.photos.length === 0 && mode === "demo") {
      push({ role: "assistant", text: "Ca să creez primul reel am nevoie de o poză reală cu produsul sau locația ta. Atașeaz-o cu agrafa de jos." });
      return;
    }
    setBusy(true);
    const images = mode === "video" ? 0 : mode === "demo" ? 2 : opts.count ?? 2;
    const videos = mode === "images" ? 0 : 1;
    push({ role: "system", tone: "info", text: mode === "images" ? "Generarea pozelor a început" : "Generarea reelului a început" });
    setPlaceholders(images + videos);
    setTab("posts");
    setProgress({ stages: IMAGE_STAGES, startedAt: Date.now(), etaSec: 20 + images * 22 });
    try {
      const r = await genFn({ data: { mode, count: opts.count, instruction: opts.instruction || undefined } });
      setPlaceholders(0);
      setWs((w) => (w ? { ...w, posts: [...r.posts, ...w.posts.filter((p) => !r.posts.some((n) => n.id === p.id))], remaining: Math.max(0, w.remaining - r.posts.length) } : w));
      if (r.posts[0]) setSelectedId(r.posts[0].id);
      const imgCount = r.posts.filter((p) => p.kind === "image").length;
      if (imgCount) push({ role: "assistant", text: `Am pregătit ${imgCount} ${imgCount === 1 ? "postare foto" : "postări foto"} cu descrieri. ${r.videoPostIds.length ? "Acum filmez reelul — durează câteva minute." : "Alege una și apasă Publică."}` });
      setProgress(null);
      for (const id of r.videoPostIds) await renderVideo(id);
    } catch (e: any) {
      setPlaceholders(0);
      setProgress(null);
      push({ role: "assistant", text: e?.message ?? "A apărut o eroare la generare. Reîncearcă." });
    } finally {
      setBusy(false);
    }
  }

  async function runEdit(post: WorkspacePost, instruction: string) {
    setEditPost(null);
    setBusy(true);
    push({ role: "user", text: `Modificare: ${instruction}` });
    try {
      if (post.kind === "video") {
        mergePost({ ...post, state: "creating" });
        await renderVideo(post.id, instruction);
      } else {
        setProgress({ stages: ["Aplic modificarea…", "Păstrez produsul identic…", "Finalizez imaginea…"], startedAt: Date.now(), etaSec: 25 });
        const r = await editImgFn({ data: { postId: post.id, instruction } });
        mergePost(r.post);
        push({ role: "assistant", text: "Gata, am actualizat imaginea. Dacă mai vrei ceva, spune-mi." });
      }
    } catch (e: any) {
      push({ role: "assistant", text: `Modificarea a eșuat: ${e?.message ?? "eroare"}` });
      await refresh().catch(() => {});
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  async function handleAction(action: ChatAction, count: number, instruction: string) {
    switch (action) {
      case "create_demo":
        return generate("demo", { instruction });
      case "create_video":
        return generate("video", { instruction });
      case "create_images":
        return generate("images", { count, instruction });
      case "edit_video":
      case "edit_image": {
        const target = selected && selected.state === "ready" ? selected : null;
        if (!target) {
          push({ role: "assistant", text: "Selectează în dreapta postarea pe care vrei s-o modific și spune-mi din nou ce schimbăm." });
          return;
        }
        if (instruction) return runEdit(target, instruction);
        setEditPost(target);
        return;
      }
      case "delete_photo":
        push({ role: "system", text: "Deschide „Pozele tale” din colțul chatului și apasă pe coșul de gunoi de pe poză." });
        return;
      case "connect_facebook":
        push({ role: "system", tone: "action", text: "Conectează pagina ca să public automat.", link: { to: "/dashboard/integrari", label: "Conectează Facebook" } });
        return;
      default:
        return;
    }
  }

  async function sendToSpark(text: string, event: "message" | "photo_added" = "message", photoCount?: number) {
    if (!ws) return;
    if (event === "message") push({ role: "user", text });
    setTyping(true);
    try {
      const history = messages
        .filter((m): m is Extract<ChatMsg, { role: "user" | "assistant" }> => m.role !== "system")
        .slice(-12)
        .map((m) => ({ role: m.role, text: m.text.slice(0, 1500) }));
      const r = await chatFn({
        data: { message: text, event, history, photoCount: photoCount ?? ws.photos.length, postCount: ws.posts.length },
      });
      setTyping(false);
      if (r.profileUpdated) {
        push({ role: "system", tone: "success", text: "Profilul afacerii a fost actualizat" });
        void refresh().catch(() => {});
      }
      push({ role: "assistant", text: r.reply });
      await handleAction(r.action, r.count, r.instruction);
    } catch (e: any) {
      setTyping(false);
      push({ role: "assistant", text: e?.message ?? "Nu am putut răspunde acum. Reîncearcă." });
    }
  }

  async function onFiles(files: File[]) {
    if (!ws) return;
    const ok = files.filter((f) => f.type.startsWith("image/") && f.size <= 6_000_000).slice(0, 6);
    if (ok.length < files.length) toast.error("Unele fișiere au fost ignorate (doar imagini până la 6 MB).");
    if (!ok.length) return;
    setBusy(true);
    const urls: string[] = [];
    try {
      for (const f of ok) {
        const mime = f.type === "image/png" || f.type === "image/webp" ? f.type : "image/jpeg";
        const res = await uploadFn({ data: { dataUrl: await fileToDataUrl(f), mimeType: mime as "image/png" | "image/jpeg" | "image/webp", fileName: f.name } });
        urls.push(res.signedUrl);
      }
      push({ role: "user", text: "", images: urls });
      push({ role: "system", tone: "success", text: urls.length === 1 ? "Poză adăugată" : `${urls.length} poze adăugate` });
      const data = await refresh();
      await sendToSpark("[poză încărcată]", "photo_added", data.photos.length);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload eșuat.");
    } finally {
      setBusy(false);
    }
  }

  function onQuick(a: QuickAction) {
    if (a === "what_can_you_do") return void sendToSpark("Ce poți face pentru afacerea mea?");
    if (a === "what_info") return void sendToSpark("Ce informații ar trebui să-ți dau?");
    if (a === "more_video") {
      push({ role: "user", text: "Creează încă un reel" });
      return void generate("video");
    }
    if (a === "more_images") {
      push({ role: "user", text: "Creează mai multe poze" });
      return void generate("images", { count: 2 });
    }
    if (a === "edit_selected") {
      if (!selected || selected.state !== "ready") return void toast.message("Selectează întâi o postare din grilă.");
      return setEditPost(selected);
    }
    if (a === "delete_photo") {
      push({ role: "system", text: "Deschide „Pozele tale” (butonul cu numărul de poze din colțul chatului) și apasă coșul de pe poză." });
    }
  }

  async function doPublish(targets: string[], when: string | null) {
    if (!publishPost?.mediaPath) return;
    setPublishing(true);
    try {
      const res = await publishFn({ data: { postId: publishPost.id, path: publishPost.mediaPath, profileIds: targets, scheduledDate: when ?? undefined } });
      if (res.mode === "scheduled") {
        toast.success(`Programat pentru ${new Date(res.when).toLocaleString("ro-RO")}`);
        push({ role: "assistant", text: `Am programat postarea pentru ${new Date(res.when).toLocaleString("ro-RO", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}. O public automat.` });
      } else {
        const ok = res.results.filter((r) => r.ok).length;
        res.results.filter((r) => !r.ok).forEach((r) => toast.error(r.error ?? "Publicare eșuată"));
        if (ok) {
          toast.success(`Publicat pe ${ok} ${ok === 1 ? "cont" : "conturi"}`);
          push({ role: "assistant", text: "Am publicat postarea! 🚀 Pregătim următoarea?" });
        }
      }
      setPublishPost(null);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Publicarea a eșuat.");
    } finally {
      setPublishing(false);
    }
  }

  async function dropOnDay(postId: string, day: Date) {
    if (!ws) return;
    const post = ws.posts.find((p) => p.id === postId);
    if (!post) return;
    const when = new Date(day);
    when.setHours(10, 0, 0, 0);
    if (when.getTime() < Date.now() + 10 * 60_000) when.setTime(Date.now() + 60 * 60_000);
    try {
      if (ws.targets.length && post.mediaPath) {
        await publishFn({ data: { postId, path: post.mediaPath, profileIds: ws.targets.map((t) => t.target_id), scheduledDate: when.toISOString() } });
        toast.success(`Programat pe ${when.toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`);
      } else {
        await updateFn({ data: { postId, plannedAt: when.toISOString() } });
        toast.message("Planificat. Conectează Facebook ca să se publice automat.");
      }
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Nu am putut programa.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!ws) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  const hasPosts = ws.posts.length > 0 || placeholders > 0;

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <Aurora />
      <div className="relative z-10 flex h-full flex-col gap-3 p-3 lg:flex-row">
        <div className="h-[46dvh] shrink-0 lg:h-full lg:w-[400px]">
          <ChatPanel
            messages={messages}
            typing={typing}
            busy={busy || typing}
            progress={progress}
            photos={ws.photos}
            hasPosts={hasPosts}
            onSend={(t) => void sendToSpark(t)}
            onFiles={(f) => void onFiles(f)}
            onQuick={onQuick}
            onDeletePhoto={async (path) => {
              await delPhotoFn({ data: { path } });
              toast.success("Poză ștearsă");
              await refresh();
            }}
            onNavigate={(to) => navigate({ to })}
          />
        </div>

        <main className="flex min-h-0 flex-1 flex-col">
          <header className="mb-3 flex items-center gap-3 rounded-full border border-border bg-card/70 px-3 py-2 backdrop-blur-xl">
            <Link to="/" className="flex items-center gap-2 pl-1 font-display text-sm font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline">Social Spark</span>
            </Link>
            {hasPosts && (
              <nav className="mx-auto flex rounded-full bg-secondary p-1">
                {([
                  { id: "posts", label: "Postări", icon: LayoutGrid },
                  { id: "calendar", label: "Calendar", icon: CalendarDays },
                ] as const).map((t) => (
                  <button key={t.id} type="button" onClick={() => setTab(t.id)} className="relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold">
                    {tab === t.id && <motion.span layoutId="ws-tab" className="absolute inset-0 rounded-full bg-card shadow" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <t.icon className="relative h-3.5 w-3.5" />
                    <span className="relative">{t.label}</span>
                  </button>
                ))}
              </nav>
            )}
            <div className={`${hasPosts ? "" : "ml-auto"} flex items-center gap-2`}>
              <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium sm:inline-flex">
                <Coins className="h-3.5 w-3.5 text-primary" /> {ws.remaining} generări
              </span>
              <div className="relative">
                <button type="button" onClick={() => setMenuOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background hover:bg-secondary" aria-label="Contul meu">
                  <UserRound className="h-4 w-4" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                      >
                        <div className="border-b border-border p-3">
                          <p className="truncate text-sm font-medium">{email}</p>
                          <span className="mt-1.5 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                            {ws.plan} · {ws.remaining} generări rămase
                          </span>
                        </div>
                        <MenuLink to="/dashboard/integrari" icon={Plug} label="Conectează Facebook & Instagram" />
                        <MenuLink to="/preturi" icon={Tag} label="Abonamente" />
                        <MenuLink to="/dashboard" icon={Settings2} label="Unelte avansate" />
                        <button type="button" onClick={signOut} className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2.5 text-left text-sm text-destructive hover:bg-secondary">
                          <LogOut className="h-4 w-4" /> Deconectare
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!hasPosts ? (
              <EmptyHero hasProfile={ws.hasProfile} photoCount={ws.photos.length} />
            ) : tab === "posts" ? (
              <div className="flex flex-col gap-4 pb-6 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <PostsGrid posts={ws.posts} placeholders={placeholders} selectedId={selectedId} onSelect={setSelectedId} />
                </div>
                <AnimatePresence mode="wait">
                  {selected && (
                    <motion.div
                      key={selected.id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className="mx-auto w-full max-w-[360px] shrink-0 xl:sticky xl:top-0 xl:mx-0 xl:w-[320px] 2xl:w-[360px]"
                    >
                      <PostPreview
                        post={selected}
                        isFree={ws.isFree}
                        busy={busy}
                        onSaveText={async (caption, hashtags) => {
                          const r = await updateFn({ data: { postId: selected.id, caption, hashtags } });
                          mergePost(r.post);
                          toast.success("Descriere salvată");
                        }}
                        onEdit={() => setEditPost(selected)}
                        onPublish={() => (ws.isFree ? navigate({ to: "/preturi" }) : setPublishPost(selected))}
                        onDelete={async () => {
                          if (!confirm("Ștergi postarea?")) return;
                          await delPostFn({ data: { postId: selected.id } });
                          setWs((w) => (w ? { ...w, posts: w.posts.filter((p) => p.id !== selected.id) } : w));
                          setSelectedId(ws.posts.find((p) => p.id !== selected.id)?.id ?? null);
                        }}
                        onRetryVideo={() => {
                          setBusy(true);
                          mergePost({ ...selected, state: "creating" });
                          void renderVideo(selected.id).finally(() => setBusy(false));
                        }}
                        onUpgrade={() => navigate({ to: "/preturi" })}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <CalendarBoard
                posts={ws.posts}
                onOpen={(id) => {
                  setSelectedId(id);
                  setTab("posts");
                }}
                onDropOnDay={(id, d) => void dropOnDay(id, d)}
              />
            )}
          </div>
        </main>
      </div>

      <EditDialog post={editPost} onClose={() => setEditPost(null)} onSubmit={(i) => editPost && void runEdit(editPost, i)} />
      <PublishDialog
        post={publishPost}
        targets={ws.targets}
        busy={publishing}
        onClose={() => setPublishPost(null)}
        onConnect={() => navigate({ to: "/dashboard/integrari" })}
        onSubmit={(t, w) => void doPublish(t, w)}
      />
    </div>
  );
}

function MenuLink({ to, icon: Icon, label }: { to: string; icon: typeof Plug; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-secondary">
      <Icon className="h-4 w-4 text-muted-foreground" /> {label}
    </Link>
  );
}

function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[110px]"
        animate={{ x: [0, 80, -20, 0], y: [0, 40, 90, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-32 top-1/3 h-[460px] w-[460px] rounded-full bg-accent/20 blur-[110px]"
        animate={{ x: [0, -70, 10, 0], y: [0, -50, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-180px] left-1/3 h-[420px] w-[420px] rounded-full bg-[oklch(0.75_0.15_330/18%)] blur-[120px]"
        animate={{ x: [0, 60, -40, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function EmptyHero({ hasProfile, photoCount }: { hasProfile: boolean; photoCount: number }) {
  const steps = [
    { n: "01", title: "Povestește-i lui Spark", text: "Descrie afacerea în chat, în câteva cuvinte.", done: hasProfile },
    { n: "02", title: "Adaugă o poză reală", text: "Produsul, vitrina sau locația. Spark o păstrează identică.", done: photoCount > 0 },
    { n: "03", title: "Primești reels și postări", text: "Cu descrieri în română corectă, gata de publicat.", done: false },
    { n: "04", title: "Publici automat", text: "Aprobi o dată, Spark postează pe Facebook și Instagram.", done: false },
  ];
  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl"
        >
          Social media-ul tău,
          <br />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent [animation:ws-shine_6s_linear_infinite]">
            pe pilot automat.
          </span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-4 max-w-md text-muted-foreground">
          Spark planifică, creează și publică pentru tine. Tu doar îi spui cu ce te ocupi.
        </motion.p>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {steps.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="flex gap-5 py-4"
            >
              <span className={`font-display text-sm font-semibold ${s.done ? "text-success" : "text-primary"}`}>{s.done ? "✓" : s.n}</span>
              <div>
                <p className={`font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
