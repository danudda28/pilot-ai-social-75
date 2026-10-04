import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/dashboard/inbox")({
  head: () => ({ meta: [{ title: "Inbox AI — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Inbox AI" description="Toate mesajele și comentariile din Facebook și Instagram, într-un singur loc." items={["Primești mesaje și comentarii din paginile conectate", "AI-ul pregătește răspunsuri doar din informațiile aprobate în Brand Brain", "Preiei oricând conversația manual"]} />,
});
