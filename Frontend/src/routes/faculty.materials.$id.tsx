import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileQuestion, Play, Share2, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { materialService } from "@/services";
import { kindMeta } from "@/components/faculty/MaterialRow";

export const Route = createFileRoute("/faculty/materials/$id")({
  head: () => ({
    meta: [
      { title: "Material workspace — TeachAI" },
      {
        name: "description",
        content: "Preview a generated material, review its outline and publish it to your classroom.",
      },
      { property: "og:title", content: "Material workspace — TeachAI" },
      { property: "og:description", content: "Preview, refine and publish AI-generated teaching material." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaterialDetail,
});

function MaterialDetail() {
  const { id } = Route.useParams();
  const material = useQuery({
    queryKey: ["material", id],
    queryFn: () => materialService.detail(id),
  });

  if (material.isLoading) {
    return <Skeleton className="h-80 rounded-2xl" />;
  }

  if (!material.data) {
    return (
      <>
        <PageHeader
          title="Material"
          crumbs={[
            { label: "Faculty", to: "/faculty" },
            { label: "Materials", to: "/faculty/materials" },
            { label: "Not available" },
          ]}
        />
        <EmptyState
          icon={FileQuestion}
          title="This material isn't available"
          description="It may still be generating, or it hasn't been created yet."
          secondary={
            <Button variant="outline" asChild>
              <Link to="/faculty/materials">Back to materials</Link>
            </Button>
          }
        />
      </>
    );
  }

  const item = material.data;
  const meta = kindMeta[item.kind];

  return (
    <>
      <PageHeader
        title={item.title}
        description={`${meta.label}${item.durationMinutes ? ` · ${item.durationMinutes} min session` : ""}`}
        crumbs={[
          { label: "Faculty", to: "/faculty" },
          { label: "Materials", to: "/faculty/materials" },
          { label: item.title },
        ]}
        actions={
          <>
            <Badge variant={item.status === "published" ? "default" : "secondary"}>
              {item.status}
            </Badge>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button>
              <Upload className="mr-2 h-4 w-4" /> Publish
            </Button>
          </>
        }
      />

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="outline">Outline</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-6">
          <div className="panel flex aspect-video items-center justify-center">
            <div className="text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-elevated text-primary">
                {item.kind === "video" ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <meta.icon className="h-5 w-5" />
                )}
              </span>
              <p className="text-sm font-medium">Preview will render here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The rendered {meta.label.toLowerCase()} appears once generation finishes.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="outline" className="mt-6">
          <EmptyState icon={meta.icon} title="No outline yet" description="Section-by-section structure appears after generation." />
        </TabsContent>

        <TabsContent value="references" className="mt-6">
          <EmptyState icon={FileQuestion} title="No references recorded" description="Sources used by the generator are listed here." />
        </TabsContent>
      </Tabs>
    </>
  );
}
