import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Library, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { materialService } from "@/services";
import { MaterialRow } from "@/components/faculty/MaterialRow";

export const Route = createFileRoute("/faculty/materials/")({
  head: () => ({
    meta: [
      { title: "Materials library — TeachAI" },
      {
        name: "description",
        content: "Every teaching plan, deck, note set and AI lecture you have generated, drafts and published.",
      },
      { property: "og:title", content: "Materials library — TeachAI" },
      { property: "og:description", content: "Review, publish and share AI-generated teaching material." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FacultyMaterials,
});

function FacultyMaterials() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const materials = useQuery({ queryKey: ["materials"], queryFn: () => materialService.list() });

  const filtered = (materials.data ?? []).filter(
    (m) =>
      m.title.toLowerCase().includes(query.trim().toLowerCase()) &&
      (tab === "all" || m.status === tab),
  );

  return (
    <>
      <PageHeader
        title="Materials"
        description="Your generated library. Review drafts, then publish to a classroom when they're ready."
        crumbs={[{ label: "Faculty", to: "/faculty" }, { label: "Materials" }]}
        actions={
          <Button asChild>
            <Link to="/faculty/generate">
              <Sparkles className="mr-2 h-4 w-4" /> Generate content
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search materials"
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {materials.isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : filtered.length > 0 ? (
        <div className="panel divide-y divide-border overflow-hidden">
          {filtered.map((m) => (
            <MaterialRow key={m.id} material={m} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Library}
          title={query ? "No matching materials" : "Your library is empty"}
          description={
            query
              ? "Try a different search term or switch tabs."
              : "Generate a teaching plan, deck, notes or an AI lecture and it will appear here."
          }
          secondary={
            query ? null : (
              <Button asChild>
                <Link to="/faculty/generate">Generate content</Link>
              </Button>
            )
          }
        />
      )}
    </>
  );
}
