import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2, Presentation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardPath, useAuth } from "@/lib/auth";
import type { Role } from "@/services/types";
import { AuthLayout } from "./login";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — TeachAI" },
      {
        name: "description",
        content: "Create a TeachAI account as faculty or student and start generating course material.",
      },
      { property: "og:title", content: "Create your account — TeachAI" },
      { property: "og:description", content: "Join TeachAI as faculty or student." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

const roles: { value: Role; label: string; description: string; icon: typeof Presentation }[] = [
  {
    value: "faculty",
    label: "Faculty",
    description: "Create classrooms and generate teaching content",
    icon: Presentation,
  },
  {
    value: "student",
    label: "Student",
    description: "Join classrooms and study published material",
    icon: GraduationCap,
  },
];

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("faculty");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 2) next['fullName'] = "Enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next['email'] = "Enter a valid email address.";
    if (form.password.length < 8) next['password'] = "Use at least 8 characters.";
    if (form.confirm !== form.password) next['confirm'] = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const user = await signUp({
        fullName: form.fullName.trim(),
        email: form.email,
        password: form.password,
        role,
      });
      toast.success("Account created");
      void navigate({ to: dashboardPath(user.role), replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Choose your role — the workspace adapts to it."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((r) => (
            <button
              type="button"
              key={r.value}
              onClick={() => setRole(r.value)}
              aria-pressed={role === r.value}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                role === r.value
                  ? "border-primary/60 bg-primary/5"
                  : "border-border hover:border-primary/30",
              )}
            >
              <r.icon className={cn("h-4.5 w-4.5", role === r.value ? "text-primary" : "text-muted-foreground")} />
              <p className="mt-2 text-sm font-medium">{r.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
            </button>
          ))}
        </div>

        <Field id="fullName" label="Full name" error={errors['fullName']}>
          <Input
            id="fullName"
            className="h-11"
            placeholder="Dr. Anita Rao"
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
        </Field>
        <Field id="email" label="Email" error={errors['email']}>
          <Input
            id="email"
            type="email"
            className="h-11"
            placeholder="you@university.edu"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field id="password" label="Password" error={errors['password']}>
          <Input
            id="password"
            type="password"
            className="h-11"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </Field>
        <Field id="confirm" label="Confirm password" error={errors['confirm']}>
          <Input
            id="confirm"
            type="password"
            className="h-11"
            placeholder="Re-enter password"
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
          />
        </Field>

        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
