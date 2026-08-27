import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, LayoutDashboard, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/faculty")({
  component: FacultyLayout,
});

const NAV = [
  { to: "/faculty", label: "Dashboard", icon: LayoutDashboard },
  { to: "/faculty/subjects", label: "My Subjects", icon: BookOpen },
];

function FacultyLayout() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && role !== "faculty") {
      void navigate({ to: "/student" });
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
    <AppShell nav={NAV} roleLabel="Faculty workspace">
      <Outlet />
    </AppShell>
  );
}
