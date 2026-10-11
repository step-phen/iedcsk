import { cookies } from "next/headers";
import { requireTeacher } from "@/lib/auth";
import { formatDatePH } from "@/lib/datetime";
import TeacherShell from "@/app/teacher/_components/layout/teacher-shell";

// Gates every page under /teacher, since Laravel verifies the session on /api/me.
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await requireTeacher();

  // Read on the server so the rail renders at its final width immediately.
  const collapsedCookie = (await cookies()).get("sidebar_collapsed");
  const collapsed = collapsedCookie?.value === "1";
  // No cookie yet = teacher never touched the toggle, so the client is free
  // to pick a width based on viewport instead of forcing the desktop default.
  const hasCollapsedPreference = collapsedCookie !== undefined;

  // Formatted here rather than in the header itself: PageHeader is a Client
  // Component, and a new Date() there would render one day on the server and
  // possibly another on the client. PH time, like the rest of the app's
  // "today" (see lib/datetime.ts).
  const today = formatDatePH(new Date(), {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <TeacherShell
      teacherId={teacher.teacherId}
      username={teacher.username}
      teacherName={teacher.teacherName}
      defaultCollapsed={collapsed}
      hasCollapsedPreference={hasCollapsedPreference}
      today={today}
    >
      {children}
    </TeacherShell>
  );
}
