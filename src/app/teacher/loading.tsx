import PageHeader from "@/app/teacher/_components/layout/page-header";
import { PageLoader } from "@/components/ui/page-loader";

/** Generic fallback for teacher routes without their own loading.tsx. */
export default function TeacherLoading() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader className="mb-5" />
      <PageLoader />
    </div>
  );
}
