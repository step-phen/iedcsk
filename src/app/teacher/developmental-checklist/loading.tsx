import PageHeader from "@/app/teacher/_components/layout/page-header";
import { PageLoader } from "@/components/ui/page-loader";

export default function ChecklistLoading() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader className="mb-3" />
      <PageLoader />
    </div>
  );
}
