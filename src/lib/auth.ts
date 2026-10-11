import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";

export type Me = { teacherId: number; username: string; teacherName: string | null; handoverPending: boolean };

/** Returns the signed-in teacher from Laravel, or redirects to /login (or to /accept-handover while a handover waits). */
export async function requireTeacher(): Promise<Me> {
  const res = await serverApi("/api/me");
  if (res.status === 401) redirect("/login");
  if (!res.ok) throw new Error(`GET /api/me failed: ${res.status}`);
  const me = (await res.json()) as Me;
  if (me.handoverPending) redirect("/accept-handover");
  return me;
}
