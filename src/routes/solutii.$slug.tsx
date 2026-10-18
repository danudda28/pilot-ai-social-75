import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoryView } from "@/components/marketing/StoryView";
import { findStory } from "@/lib/marketing";

export const Route = createFileRoute("/solutii/$slug")({
  loader: ({ params }) => {
    const story = findStory("solutie", params.slug);
    if (!story) throw notFound();
    return { story };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.story.nav ?? "Soluție"} — Social Spark` },
      { name: "description", content: loaderData?.story.lede ?? "" },
      { property: "og:title", content: `${loaderData?.story.nav ?? "Soluție"} — Social Spark` },
    ],
  }),
  component: SolutionPage,
});

function SolutionPage() {
  const { story } = Route.useLoaderData();
  return <StoryView story={story} />;
}
