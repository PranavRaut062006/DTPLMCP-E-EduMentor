import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { ProfilePanel } from "@/components/account/ProfilePanel";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "Your student profile — TeachAI" },
      {
        name: "description",
        content: "Update the name, course and short introduction your classmates and teachers see.",
      },
      { property: "og:title", content: "Your student profile — TeachAI" },
      { property: "og:description", content: "Manage how you appear in your classrooms." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentProfile,
});

function StudentProfile() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="This is how you appear to teachers in the classrooms you joined."
        crumbs={[{ label: "Student", to: "/student" }, { label: "Profile" }]}
      />
      <ProfilePanel departmentLabel="Course" />
    </>
  );
}
