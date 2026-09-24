import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { ProfilePanel } from "@/components/account/ProfilePanel";

export const Route = createFileRoute("/faculty/profile")({
  head: () => ({
    meta: [
      { title: "Your faculty profile — TeachAI" },
      {
        name: "description",
        content: "Update the name, department and introduction your students see across TeachAI.",
      },
      { property: "og:title", content: "Your faculty profile — TeachAI" },
      { property: "og:description", content: "Manage how you appear to your classrooms." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FacultyProfile,
});

function FacultyProfile() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="This is how you appear to students in your classrooms."
        crumbs={[{ label: "Faculty", to: "/faculty" }, { label: "Profile" }]}
      />
      <ProfilePanel departmentLabel="Department" />
    </>
  );
}
