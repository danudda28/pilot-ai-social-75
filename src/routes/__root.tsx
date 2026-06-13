import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-2xl p-10">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Pagina nu există</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pagina pe care o cauți a fost mutată sau nu există.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-bg px-5 py-2.5 text-sm font-medium text-white"
          >
            Înapoi acasă
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-2xl p-10">
        <h1 className="text-xl font-semibold">A apărut o eroare</h1>
        <p className="mt-2 text-sm text-muted-foreground">Reîncearcă sau întoarce-te acasă.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md gradient-bg px-4 py-2 text-sm font-medium text-white"
          >
            Reîncearcă
          </button>
          <a href="/" className="rounded-md border border-border px-4 py-2 text-sm">Acasă</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Social Spark — Postări AI pentru Instagram și Facebook" },
      { name: "description", content: "Automatizează postările de social media cu inteligență artificială. Generează, programează și publică conținut pentru Instagram și Facebook." },
      { property: "og:title", content: "Social Spark — Postări AI pentru Instagram și Facebook" },
      { property: "og:description", content: "Automatizează postările de social media cu inteligență artificială. Generează, programează și publică conținut pentru Instagram și Facebook." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Social Spark — Postări AI pentru Instagram și Facebook" },
      { name: "twitter:description", content: "Automatizează postările de social media cu inteligență artificială. Generează, programează și publică conținut pentru Instagram și Facebook." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cc226a76-53b0-493e-9723-f93581db235c/id-preview-096edac3--a7e78f7e-7f2c-4e33-a059-94727fc60058.lovable.app-1781366062433.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cc226a76-53b0-493e-9723-f93581db235c/id-preview-096edac3--a7e78f7e-7f2c-4e33-a059-94727fc60058.lovable.app-1781366062433.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/__l5e/assets-v1/c6cb4347-52bb-4ee9-bdf7-cb146996df05/social-spark-logo.png" },
      { rel: "apple-touch-icon", href: "/__l5e/assets-v1/c6cb4347-52bb-4ee9-bdf7-cb146996df05/social-spark-logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
}
