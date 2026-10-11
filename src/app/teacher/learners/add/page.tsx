import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import AddLearnerForm from "../_components/add-learner-form";

export const metadata: Metadata = {
  title: "IEDCSK | Add Learner",
};

export default async function AddLearnerPage() {
  await requireTeacher();

  return (
    <div className="space-y-4">
      <PageHeader className="mb-5" />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Adding New Learner</h1>
        <p className="mt-1 text-sm text-gray-700 font-medium">
          Complete student profiling to establish kindergarten entry record.
        </p>
      </div>

      <AddLearnerForm />
    </div>
  );
}
