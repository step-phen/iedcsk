// ponytail: the Strengths and Developing tabs stay empty until their reports are built on the recorded activity results.
export default function EmptyReportSection({
  title,
  heading,
  message,
}: {
  title: string;
  heading: string;
  message: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-[#5b0610] flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="p-5">
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-gray-800">{heading}</p>
          <p className="text-xs text-gray-500 mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}
