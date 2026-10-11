import Link from "next/link";
import { UserPlus } from "lucide-react";
import QuartersButton from "./quarters-modal";

/** The dashboard's quick action; a plain Link keeps its browser-native affordances (ctrl/middle-click). */
export default function DashboardActions() {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <QuartersButton />
      {/* Same look as the Learners page's Add Learners link (class-list.tsx). */}
      <Link
        href="/teacher/learners/add"
        className="group inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-sidebar hover:bg-[#7e1422] rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
      >
        <UserPlus size={16} className="text-amber-300 transition-transform group-hover:rotate-90 duration-300" />
        Add Learners
      </Link>
    </div>
  );
}
