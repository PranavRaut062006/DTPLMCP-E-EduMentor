import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Key,
  Link2,
  Loader2,
  Mic,
  RotateCcw,
  Upload,
  Volume2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SettingsPanel } from "@/components/account/SettingsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { voiceService, youtubeService } from "@/services";

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

/**
 * AI Voice Profile Section:
 * Only ONE voice input method: Choose Audio File (.mp3 or .wav).
 * Clones the faculty voice directly from that file.
 */
function VoiceProfileSection() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ["voice", "status"],
    queryFn: voiceService.status,
  });

  const hasVoice = Boolean(statusQuery.data?.has_voice);
  const voiceId = statusQuery.data?.voice_id;
  const sampleName = statusQuery.data?.sample_name;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (ext !== ".mp3" && ext !== ".wav") {
        toast.error("Please select an audio file in .mp3 or .wav format only.");
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
    }
  };

  const submitVoiceClone = async () => {
    if (!selectedFile) {
      toast.error("Please choose an audio file (.mp3 or .wav) first.");
      return;
    }
    if (!consentConfirmed) {
      toast.error("Please confirm authorization and consent before cloning.");
      return;
    }

    setUploading(true);
    try {
      const res = await voiceService.uploadSample(selectedFile, consentConfirmed);
      toast.success(res.message || "Faculty voice cloned successfully from audio file!");
      setSelectedFile(null);
      setConsentConfirmed(false);
      queryClient.invalidateQueries({ queryKey: ["voice", "status"] });
    } catch (err: any) {
      console.error("Voice upload error:", err);
      toast.error(err?.message || "Failed to clone voice from uploaded audio file.");
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewVoice = async () => {
    setPreviewing(true);
    try {
      const res = await voiceService.preview();
      const apiHost = ((import.meta.env as any)["VITE_API_URL"] || "http://localhost:3001/api").replace("/api", "");
      const fullUrl = `${apiHost}${res.preview_url}`;
      setPreviewAudioUrl(fullUrl);
      const audio = new Audio(fullUrl);
      await audio.play();
      toast.success("Playing cloned voice preview.");
    } catch (err: any) {
      console.error("Voice preview error:", err);
      toast.error(err?.message || "Could not play voice preview.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleResetVoice = async () => {
    if (!confirm("Reset voice profile to default academic voice?")) return;
    try {
      await voiceService.reset();
      toast.success("Voice profile reset to default.");
      queryClient.invalidateQueries({ queryKey: ["voice", "status"] });
      setPreviewAudioUrl(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset voice profile.");
    }
  };

  return (
    <section className="panel p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
          <Mic className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">AI Voice Profile (Voice Cloning)</h2>
            <Badge variant={hasVoice ? "default" : "secondary"}>
              {hasVoice ? "Cloned Voice Active" : "Default Voice"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your audio recording. TeachAI clones your voice from this file and uses it to narrate
            all generated lecture videos.
          </p>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Voice Status & Preview if configured */}
      {hasVoice && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Your custom faculty voice is active</p>
                <p className="text-xs text-muted-foreground">
                  Voice ID: <span className="font-mono text-foreground/80">{voiceId}</span>
                  {sampleName ? ` • Source file: ${sampleName}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewVoice}
                disabled={previewing}
                className="gap-2"
              >
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                Preview Voice
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetVoice}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4" /> Reset to Default
              </Button>
            </div>
          </div>
          {previewAudioUrl && (
            <div className="mt-3">
              <audio controls className="h-8 w-full" src={previewAudioUrl} />
            </div>
          )}
        </div>
      )}

      {/* Upload Instructions & Single File Upload Option */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-elevated/40 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Audio File Requirements:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Supported Formats:</strong> <code>.mp3</code> or <code>.wav</code> format only.</li>
            <li><strong>Recommended Length:</strong> 60 to 120 seconds of clear speech without background noise or music.</li>
            <li><strong>Language:</strong> Spoken clearly in English at your natural lecture pacing.</li>
          </ul>
          <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
            <p className="text-xs font-semibold text-foreground mb-1">Suggested passage to record and upload:</p>
            <p className="italic text-xs text-foreground/90 leading-relaxed">
              "Hello students, my name is [Your Name]. Welcome to our lecture session. Today we will explore core foundational
              principles, system architecture, trade-offs, and practical industrial engineering applications."
            </p>
          </div>
        </div>

        {/* The single audio file input */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" asChild disabled={uploading}>
            <label className="cursor-pointer gap-2">
              <Upload className="h-4 w-4" /> Choose Audio File (.mp3 / .wav)
              <input
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </Button>

          {selectedFile && (
            <span className="text-xs text-foreground font-medium">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
          )}
        </div>

        {/* Consent Checkbox */}
        <div className="rounded-xl border border-border bg-elevated/20 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={consentConfirmed}
              onCheckedChange={(checked) => setConsentConfirmed(Boolean(checked))}
              className="mt-0.5"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Authorization & Consent Confirmation:</strong> I confirm that I
              am uploading my own voice recording, or have explicit permission and authorization from the speaker
              to clone this voice for academic lecture generation in TeachAI.
            </span>
          </label>
        </div>

        {/* Upload and Clone Button */}
        <div>
          <Button
            type="button"
            onClick={submitVoiceClone}
            disabled={uploading || !selectedFile || !consentConfirmed}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading & Cloning Voice...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" /> {hasVoice ? "Replace & Re-clone Voice" : "Upload & Clone Voice"}
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * YouTube Channel Integration Section:
 * Takes Google OAuth credentials directly from faculty so videos can be published to their YouTube channel.
 */
function YouTubeSettingsSection() {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [channelName, setChannelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["youtube", "status"],
    queryFn: youtubeService.status,
  });

  const isConnected = Boolean(statusQuery.data?.connected);
  const isConfigured = Boolean(statusQuery.data?.configured);
  const currentChannelTitle = statusQuery.data?.channelTitle || statusQuery.data?.channelName;

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Please provide both Google Client ID and Client Secret.");
      return;
    }

    setSaving(true);
    try {
      await youtubeService.saveCredentials({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        channelName: channelName.trim() || undefined,
      });
      toast.success("YouTube OAuth credentials saved successfully!");
      setClientId("");
      setClientSecret("");
      queryClient.invalidateQueries({ queryKey: ["youtube", "status"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save YouTube credentials.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await youtubeService.getAuthUrl();
      window.location.href = res.authUrl;
    } catch (err: any) {
      toast.error(err?.message || "Could not start YouTube authorization. Save credentials first.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your YouTube channel from TeachAI?")) return;
    try {
      await youtubeService.disconnect();
      toast.success("YouTube channel disconnected.");
      queryClient.invalidateQueries({ queryKey: ["youtube", "status"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect YouTube account.");
    }
  };

  return (
    <section className="panel p-6 mt-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500">
          <Youtube className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">YouTube Channel Publishing</h2>
            <Badge variant={isConnected ? "default" : isConfigured ? "outline" : "secondary"}>
              {isConnected ? "Connected" : isConfigured ? "Credentials Configured" : "Not Configured"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your YouTube channel credentials so you can directly publish AI-generated lecture videos
            to your channel with one click.
          </p>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Connected Channel Info */}
      {isConnected ? (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Connected to YouTube Channel</p>
              <p className="text-xs text-muted-foreground">
                Channel: <strong className="text-foreground">{currentChannelTitle || "Authorized Faculty Channel"}</strong>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-destructive hover:text-destructive">
            Disconnect Channel
          </Button>
        </div>
      ) : isConfigured ? (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Google OAuth credentials are configured</p>
              <p className="text-xs text-muted-foreground">
                Authorize TeachAI to upload videos to your channel.
              </p>
            </div>
          </div>
          <Button onClick={handleConnect} disabled={connecting} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
            Connect YouTube Channel
          </Button>
        </div>
      ) : null}

      {/* Setup Instructions */}
      <div className="mb-4 rounded-xl border border-border bg-elevated/40 p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground">How to get your YouTube credentials:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary underline">Google Cloud Console</a> and create or select a project.</li>
          <li>Enable the <strong>YouTube Data API v3</strong> in APIs & Services &gt; Library.</li>
          <li>Go to <strong>APIs & Services &gt; Credentials</strong> and create an <strong>OAuth Client ID</strong> (Application type: <em>Web application</em>).</li>
          <li>Add this exact URL to <strong>Authorized redirect URIs</strong>:
            <code className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">http://localhost:3001/api/youtube/callback</code>
          </li>
          <li>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong> into the fields below and click Save.</li>
        </ol>
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSaveCredentials} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="yt-client-id">Google Client ID</Label>
            <Input
              id="yt-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yt-client-secret">Google Client Secret</Label>
            <Input
              id="yt-client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter your Client Secret"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5 max-w-sm">
          <Label htmlFor="yt-channel-name">YouTube Channel Name (Optional)</Label>
          <Input
            id="yt-channel-name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="e.g. Prof. Pranav Raut Lectures"
            className="text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" disabled={saving || !clientId.trim() || !clientSecret.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            Save YouTube Credentials
          </Button>

          {isConfigured && !isConnected && (
            <Button
              type="button"
              variant="outline"
              onClick={handleConnect}
              disabled={connecting}
              className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-600"
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
              Connect with Google
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

function FacultySettings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Account preferences, security, AI voice profile, and YouTube publishing."
        crumbs={[{ label: "Faculty", to: "/faculty" }, { label: "Settings" }]}
      />
      <SettingsPanel
        extra={
          <>
            <VoiceProfileSection />
            <YouTubeSettingsSection />
          </>
        }
      />
    </>
  );
}
