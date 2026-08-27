import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/student")({
  component: StudentLayout,
});

const NAV = [{ to: "/student", label: "Published Content", icon: BookOpen }];

function StudentLayout() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role === "faculty") {
      void navigate({ to: "/faculty" });
    }
  }, [loading, role, navigate]);

  if (loading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell nav={NAV} roleLabel="Student portal">
      <Outlet />
    </AppShell>
  );
}
