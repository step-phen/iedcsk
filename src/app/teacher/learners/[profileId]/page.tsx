import Image from "next/image";
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import type { Guardian, LearnerAddress } from "@/types/db";
import { calculateAge, calculateAgeYearsMonths, middleInitial } from "@/lib/learners";
import { formatDatePH, formatWeekdayPH } from "@/lib/datetime";
import { User, UserRound, TrendingUp, CalendarCheck, GraduationCap } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import BackLink from "./_components/back-link";
import EditProfileDrawer from "./_components/edit-profile-drawer";
import ProfileTab from "./_components/profile-tab";
import AttendanceTab from "./_components/attendance-tab";
import ProgressTab, { type ProgressItem } from "./_components/progress-tab";

type LearnerProfile = {
  learnerId: number;
  lrn: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  extensionName: string | null;
  birthdate: string;
  gender: string;
  photoUrl: string | null;
  gradeLevel: string | null;
  section: string | null;
  address: LearnerAddress | null;
  guardians: Guardian[];
  attendances: { date: string; status: "present" | "absent" | "late" | "excused"; recordedAt: string; reason: string | null }[];
  progress: ProgressItem[];
};

// cache() so the metadata and the page share one request per render.
const getLearnerProfile = cache(async (profileId: string): Promise<LearnerProfile | null> => {
  if (!/^\d+$/.test(profileId)) return null;
  // The API only returns the signed-in teacher's own learners; anyone else's is a 404.
  const res = await serverApi(`/api/learners/${profileId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/learners/${profileId} failed: ${res.status}`);
  return res.json();
});

const ATTENDANCE_LABEL = { present: "Present", late: "Late", absent: "Absent", excused: "Excused" } as const;

function ComingSoonTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-semibold text-gray-800">{title} is coming soon.</p>
      <p className="mt-1 text-xs text-gray-500">This tab will fill in once its data is recorded in the app.</p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ profileId: string }>;
}): Promise<Metadata> {
  const { profileId } = await params;
  // Redirects a signed-out visitor to /login before the fetch below can fail on a 401.
  await requireTeacher();
  // Scoped like the page below — the title must not leak another teacher's
  // learner name via the browser tab.
  const learner = await getLearnerProfile(profileId);

  return {
    title: learner
      ? `${learner.firstName} ${learner.lastName} | Profile`
      : "Learner Profile | Teacher Portal",
  };
}

export default async function LearnerProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const teacher = await requireTeacher();

  // Ownership is enforced by the API: a learner belonging to another teacher
  // is indistinguishable from one that doesn't exist, so this is a 404 rather
  // than a 403 and never reveals which learner ids are in use.
  const learner = await getLearnerProfile(profileId);
  if (!learner) notFound();

  const birthdate = new Date(learner.birthdate);

  const years = calculateAge(birthdate);
  const age = calculateAgeYearsMonths(birthdate);

  const initial = middleInitial(learner.middleName);
  const displayName = `${learner.lastName}, ${learner.firstName}${initial ? ` ${initial}` : ""}`;

  // PH-explicit formatting — the server's own local timezone getters don't
  // necessarily match Philippine time, which would shift dates by a day.
  const attendanceData = learner.attendances.map((a) => {
    const date = new Date(a.date);
    return {
      isoDate: a.date.slice(0, 10),
      reason: a.reason,
      date: formatDatePH(date, { month: "short", day: "numeric", year: "numeric" }),
      day: formatWeekdayPH(date),
      status: ATTENDANCE_LABEL[a.status],
      // When the attendance was recorded — this app has no per-learner
      // check-in timestamp, so it stands in as this day's time-in.
      time: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      }).format(new Date(a.recordedAt)),
    };
  });

  return (
    <div className="space-y-3">
      <PageHeader className="mb-3" start={<BackLink />} />

      <Tabs defaultValue="profile">
        {/* Learner header — its own card, separate from the tabs/content card
            below so the two don't read as one connected block. */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#5b0610] shadow-sm mb-0">
          <div className="px-4 py-4 flex items-center gap-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 bg-white/20 overflow-hidden">
              {learner.photoUrl ? (
                <Image src={learner.photoUrl} alt="" width={96} height={96} loading="eager" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 opacity-90" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-white truncate">{displayName}</h1>
                <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
                  LRN: {learner.lrn ?? "N/A"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white">
                  <GraduationCap size={12} />
                  {learner.gradeLevel} - {learner.section}
                </span>
                <p className="text-xs text-white/80">
                  Age: {age.years} yrs {age.months} mos (DOB: {formatDatePH(birthdate, { month: "long", day: "numeric", year: "numeric" })})
                  {" • "}Gender: {learner.gender}
                  {" • "}Adviser: {teacher.teacherName ?? teacher.username}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar — sits directly on the page background, not inside a card. */}
        <div className="px-1 py-1 mb-0">
            <TabsList variant="line" className="min-w-0 overflow-x-auto scrollbar-hide">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-1.5 px-3 md:px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap text-gray-500 data-active:text-[#4a0e1c] after:bg-[#4a0e1c]"
              >
                <UserRound size={14} />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="attendance"
                className="flex items-center gap-1.5 px-3 md:px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap text-gray-500 data-active:text-[#4a0e1c] after:bg-[#4a0e1c]"
              >
                <CalendarCheck size={14} />
                Attendance
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="flex items-center gap-1.5 px-3 md:px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap text-gray-500 data-active:text-[#4a0e1c] after:bg-[#4a0e1c]"
              >
                <TrendingUp size={14} />
                Progress
              </TabsTrigger>
              <TabsTrigger
                value="grades"
                className="flex items-center gap-1.5 px-3 md:px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap text-gray-500 data-active:text-[#4a0e1c] after:bg-[#4a0e1c]"
              >
                <GraduationCap size={14} />
                Grades
              </TabsTrigger>
            </TabsList>
        </div>

        {/* Active panel — its own card, separate from the tab bar above. */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <TabsContent value="profile" className="animate-in fade-in-0 duration-300">
            <ProfileTab
              learner={{
                id: learner.learnerId,
                firstName: learner.firstName,
                middleName: learner.middleName,
                lastName: learner.lastName,
                extensionName: learner.extensionName,
                birthdate,
                gender: learner.gender,
                photoUrl: learner.photoUrl,
                address: learner.address,
                gradeLevel: learner.gradeLevel,
                section: learner.section,
                guardians: learner.guardians,
              }}
              years={years}
              editAction={
                <EditProfileDrawer
                  learner={{
                    id: learner.learnerId,
                    lrn: learner.lrn,
                    firstName: learner.firstName,
                    middleName: learner.middleName,
                    lastName: learner.lastName,
                    extensionName: learner.extensionName,
                    birthdate,
                    gender: learner.gender,
                    photoUrl: learner.photoUrl,
                    address: learner.address,
                    guardians: learner.guardians.map(({ guardianName, contactNumber, relationshipToLearner }) => ({
                      guardianName,
                      contactNumber,
                      relationshipToLearner,
                    })),
                  }}
                />
              }
            />
          </TabsContent>

          <TabsContent value="progress" className="animate-in fade-in-0 duration-300">
            <ProgressTab items={learner.progress} learnerName={learner.firstName} />
          </TabsContent>

          <TabsContent value="attendance" className="animate-in fade-in-0 duration-300">
            <AttendanceTab
              data={attendanceData}
              learner={{ id: learner.learnerId, name: displayName, lrn: learner.lrn, gradeLevel: learner.gradeLevel, section: learner.section, teacherName: teacher.teacherName }}
            />
          </TabsContent>

          <TabsContent value="grades" className="animate-in fade-in-0 duration-300">
            <ComingSoonTab title="Grades" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
