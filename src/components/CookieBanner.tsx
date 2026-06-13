import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

const KEY = "ss_cookie_consent_v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  function set(value: "accept" | "reject") {
    localStorage.setItem(KEY, value);
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl glass-strong rounded-2xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Social Spark folosește cookie-uri pentru autentificare și analiza
            traficului. Continuând, ești de acord cu{" "}
            <a href="/politica-confidentialitate" className="text-primary underline">
              politica de confidențialitate
            </a>
            .
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => set("reject")}
            className="rounded-lg glass-strong px-4 py-2 text-xs font-medium hover:bg-secondary"
          >
            Doar esențiale
          </button>
          <button
            onClick={() => set("accept")}
            className="rounded-lg gradient-bg px-4 py-2 text-xs font-semibold text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
