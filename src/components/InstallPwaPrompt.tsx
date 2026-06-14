import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-prompt-dismissed";

export function InstallPwaPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 8000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }
  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    dismiss();
  }

  if (!visible || !evt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 glass-strong rounded-2xl p-4 shadow-2xl animate-fade-in">
      <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl gradient-bg shrink-0">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Instalează AdPilot</div>
          <p className="text-xs text-muted-foreground mt-0.5">Acces rapid din ecranul principal, fără browser.</p>
          <button onClick={install}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg gradient-bg px-3 py-1.5 text-xs font-semibold text-white">
            Instalează acum
          </button>
        </div>
      </div>
    </div>
  );
}
