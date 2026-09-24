import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { SettingsPanel } from "@/components/account/SettingsPanel";

export const Route = createFileRoute("/student/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TeachAI" },
      {
        name: "description",
        content: "Control notifications, your password and appearance preferences.",
      },
      { property: "og:title", content: "Settings — TeachAI" },
      { property: "og:description", content: "Manage your TeachAI account preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentSettings,
});

function StudentSettings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Notifications, password and appearance."
        crumbs={[{ label: "Student", to: "/student" }, { label: "Settings" }]}
      />
      <SettingsPanel />
    </>
  );
}
