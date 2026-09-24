import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Presentation,
  Settings,
  User,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { RoleGuard } from "@/lib/auth";

export const Route = createFileRoute("/faculty")({
  component: FacultyLayout,
});

const items: NavItem[] = [
  { label: "Dashboard", to: "/faculty", icon: LayoutDashboard, exact: true },
  { label: "Classrooms", to: "/faculty/classrooms", icon: Presentation },
  { label: "Profile", to: "/faculty/profile", icon: User },
  { label: "Settings", to: "/faculty/settings", icon: Settings },
];

function FacultyLayout() {
  return (
    <RoleGuard role="faculty">
      <AppShell items={items} roleLabel="Faculty workspace">
        <Outlet />
      </AppShell>
    </RoleGuard>
  );
}
