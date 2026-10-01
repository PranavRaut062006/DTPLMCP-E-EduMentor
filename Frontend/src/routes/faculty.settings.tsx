import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mic, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SettingsPanel } from "@/components/account/SettingsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { voiceService } from "@/services";

export const Route = createFileRoute("/faculty/settings")({
  head: () => ({
    meta: [
      { title: "Faculty settings — TeachAI" },
      {
        name: "description",
        content: "Notifications, password, appearance and your AI voice profile for narrated lectures.",
      },
      { property: "og:title", content: "Faculty settings — TeachAI" },
      { property: "og:description", content: "Control notifications, security and your AI voice profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FacultySettings,
});

function VoiceProfileSection() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const statusQuery = useQuery({ queryKey: ["voice", "status"], queryFn: voiceService.status });
  const hasVoice = statusQuery.data?.has_voice ?? false;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    try {
      await voiceService.uploadSample(file);
      await statusQuery.refetch();
    } catch (err) {
      console.error(err);
      alert("Failed to upload voice sample.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="panel p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
          <Mic className="h-4.5 w-4.5" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">AI voice profile</h2>
            <Badge variant={hasVoice ? "default" : "secondary"}>
              {hasVoice ? "ready" : "not set up"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a short sample of your own narration so generated lectures can be spoken in your
            voice. Nothing is generated until you request it.
          </p>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-2">Please read the following sentence clearly to clone your voice:</p>
          <p className="italic">"Hello, my name is [Your Name]. I am a faculty member recording my voice for TeachAI to create personalized, high-quality educational videos for my students."</p>
          <p className="mt-2 text-xs">Recommended: 60–120 seconds of clear speech, minimal background noise. You can read additional text if needed.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" asChild disabled={uploading}>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" /> {uploading ? "Uploading..." : "Upload voice sample"}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </Button>
          {fileName ? (
            <span className="text-sm text-muted-foreground">Selected: {fileName}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FacultySettings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Account preferences, security and voice options for generated lectures."
        crumbs={[{ label: "Faculty", to: "/faculty" }, { label: "Settings" }]}
      />
      <SettingsPanel extra={<VoiceProfileSection />} />
    </>
  );
}
