import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/dashboard/leaduri")({
  head: () => ({ meta: [{ title: "Leaduri — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Leaduri" description="Clienții interesați identificați din conversații." items={["Vezi cine a cerut preț, programare sau ofertă", "Muți leadurile pe etape până la vânzare", "Exporți lista în CSV"]} />,
});
