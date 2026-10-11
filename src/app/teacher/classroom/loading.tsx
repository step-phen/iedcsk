import PageHeader from "@/app/teacher/_components/layout/page-header";
import { PageLoader } from "@/components/ui/page-loader";

// Shows the real header while the page loads, instead of the generic teacher loader.
export default function ClassroomLoading() {
  return (
    <>
      <PageHeader className="mb-5" />
      <PageLoader />
    </>
  );
}
