import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BookOpen, LayoutDashboard, PlusCircle, Settings, User } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { RoleGuard } from "@/lib/auth";

export const Route = createFileRoute("/student")({
  component: StudentLayout,
});

const items: NavItem[] = [
  { label: "Dashboard", to: "/student", icon: LayoutDashboard, exact: true },
  { label: "Join classroom", to: "/student/join", icon: PlusCircle },
  { label: "Materials", to: "/student/materials", icon: BookOpen },
  { label: "Profile", to: "/student/profile", icon: User },
  { label: "Settings", to: "/student/settings", icon: Settings },
];

function StudentLayout() {
  return (
    <RoleGuard role="student">
      <AppShell items={items} roleLabel="Student workspace">
        <Outlet />
      </AppShell>
    </RoleGuard>
  );
}
