import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/dashboard/campanii")({
  head: () => ({ meta: [{ title: "Campanii — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Campanii" description="Grupează postările pe obiective, perioade și oferte." items={["Creezi campanii cu dată de start și final", "Legi postări, oferte și răspunsuri AI de o campanie", "Vezi rezultatele per campanie"]} />,
});
