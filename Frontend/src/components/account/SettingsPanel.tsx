import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated text-primary">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Separator className="my-5" />
      {children}
    </section>
  );
}

export function SettingsPanel({ extra }: { extra?: React.ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="grid max-w-3xl gap-6">
      {extra}

      <Section
        icon={Lock}
        title="Password"
        description="Update the password used to sign in to your account."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next">New password</Label>
            <Input id="next" type="password" autoComplete="new-password" />
          </div>
        </div>
        <Button className="mt-5" variant="secondary">
          Update password
        </Button>
      </Section>

      <div className="flex justify-end">
        <Button variant="destructive" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
