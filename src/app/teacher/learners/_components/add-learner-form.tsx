"use client";

import { useRef, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  MapPin,
  Mars,
  Users,
  IdCard,
  GraduationCap,
  Layers,
  CalendarRange,
  Plus,
  Trash2,
  ImagePlus,
  Upload,
  ArrowLeft,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api";
import {
  calculateAge,
  calculateAgeYearsMonths,
  getBirthdateRange,
  MIN_LEARNER_AGE,
  MAX_LEARNER_AGE,
  extensionNames,
  gradeLevels,
  PHOTO_ACCEPT,
  photoError,
} from "@/lib/learners";
import ProvinceSelect from "@/components/learner/province-select";
import SectionSelect from "@/components/learner/section-select";
import {
  displaySchoolYear,
  useActiveSchoolYear,
  useActiveSchoolYearFailed,
} from "@/hooks/useActiveSchoolYear";

const inp = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] bg-white ${err ? "border-red-400" : "border-gray-400"}`;

type AddLearnerState = {
  success: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
};

const initialState: AddLearnerState = {
  success: false,
  error: null,
  fieldErrors: {},
};

async function addLearner(formData: FormData): Promise<AddLearnerState> {
  // An untouched file input still submits an empty File, so drop it.
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size === 0) formData.delete("photo");
  else if (photo instanceof File) {
    // Checked here so a wrong photo fails before it uploads; the API checks it again.
    const problem = photoError(photo);
    if (problem) return { success: false, error: null, fieldErrors: { photo: problem } };
  }

  try {
    const res = await apiFetch("/api/learners", { method: "POST", body: formData });
    if (res.ok) return { success: true, error: null, fieldErrors: {} };
    if (res.status === 422) {
      const { errors } = (await res.json()) as { errors: Record<string, string[]> };
      const fieldErrors = Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages[0]]));
      return { success: false, error: "Please fix the highlighted fields.", fieldErrors };
    }
    if (res.status === 413) {
      return { success: false, error: null, fieldErrors: { photo: "Photo must be 3MB or smaller." } };
    }
    return { success: false, error: "Could not add the learner. Please try again.", fieldErrors: {} };
  } catch {
    return { success: false, error: "Could not reach the server. Please try again.", fieldErrors: {} };
  }
}

// Only grade level the app offers right now — see gradeLevels in lib/learners.
const GRADE_LEVEL = gradeLevels[0];

/** One guardian entry in the repeatable list. `id` is a stable React key,
 *  independent of the entry's position — position (recomputed every render)
 *  is what becomes the `_${index}` suffix on its field names, which is what
 *  add-learner-action.ts reads back out. */
interface GuardianEntry {
  id: number;
  relationship: string;
}

/** Drives both the section cards' numbering and the sidebar nav — one list,
 *  so the two can never drift out of sync with each other. */
const SECTIONS = [
  {
    id: "section-learner",
    label: "Learner Details",
    subtitle: "Demographics & Photo",
    icon: User,
  },
  {
    id: "section-address",
    label: "Address Info",
    subtitle: "Zoning & Location",
    icon: MapPin,
  },
  {
    id: "section-guardian",
    label: "Guardian & Contact",
    subtitle: "Emergency representatives",
    icon: Users,
  },
] as const;

export default function AddLearnerForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<AddLearnerState>(initialState);
  const [pending, setPending] = useState(false);

  // onSubmit + fetch rather than a form action, so an API rejection leaves every typed field in place.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeYear) return;
    setPending(true);
    setState(await addLearner(new FormData(e.currentTarget)));
    setPending(false);
  }
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [ageDetail, setAgeDetail] = useState<{
    years: number;
    months: number;
  } | null>(null);
  // One entry to start; the teacher can add more. Each entry's relationship
  // is tracked here (not just via the DOM) so the "Other" text box can
  // appear per-entry.
  const [guardians, setGuardians] = useState<GuardianEntry[]>([
    { id: 0, relationship: "" },
  ]);
  const nextGuardianId = useRef(1);
  const [birthdateRange, setBirthdateRange] = useState<{
    min: string;
    max: string;
  } | null>(null);
  // The database's active year is the only one a learner can be enrolled in;
  // undefined while loading, null when no year is active.
  const activeYear = useActiveSchoolYear();
  const activeYearFailed = useActiveSchoolYearFailed();
  const yearNotice = activeYearFailed
    ? "Could not load the active school year. Reload the page to try again."
    : activeYear === null
      ? "No active school year. Set an active school year in Settings before adding learners."
      : null;
  // Multi-step wizard: only one section renders at a time, driven by index
  // rather than by scroll position.
  const [currentStep, setCurrentStep] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fieldErrors = state?.fieldErrors ?? {};
  const formError = state?.error ?? null;
  const ageOutOfRange =
    age !== null && (age < MIN_LEARNER_AGE || age > MAX_LEARNER_AGE);

  function handleBirthdateChange(birthdate: string) {
    setAge(birthdate ? calculateAge(birthdate) : null);
    setAgeDetail(birthdate ? calculateAgeYearsMonths(birthdate) : null);
  }

  function handlePhotoChange(file: File | null) {
    // Revoke the previous preview URL before replacing it — otherwise every
    // photo the teacher picks before settling on one leaks its blob URL for
    // the rest of the page's life.
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function addGuardian() {
    setGuardians((prev) => [
      ...prev,
      { id: nextGuardianId.current++, relationship: "" },
    ]);
  }

  function removeGuardian(id: number) {
    // At least one guardian is required — the last entry can't be removed.
    setGuardians((prev) =>
      prev.length > 1 ? prev.filter((g) => g.id !== id) : prev,
    );
  }

  function setGuardianRelationship(id: number, value: string) {
    setGuardians((prev) =>
      prev.map((g) => (g.id === id ? { ...g, relationship: value } : g)),
    );
  }

  useEffect(() => {
    // Client's clock, not server's — must run post-hydration to avoid a min/max mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBirthdateRange(getBirthdateRange());
  }, []);

  // Revoke the preview's blob URL when the page navigates away — otherwise
  // it lives until the tab closes.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (state.success) {
      toast.success("Learner added successfully!", { position: "top-center" });
      router.push("/teacher/learners");
      router.refresh();
      return;
    }
    // A failed submit can land on a field in a step that isn't the current
    // one (hidden sections still submit their values) — jump the wizard to
    // that step, then bring the field into view once it's actually rendered.
    if (state.error || Object.keys(state.fieldErrors).length > 0) {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"]',
      );
      if (firstInvalid) {
        const sectionEl = firstInvalid.closest<HTMLElement>('[id^="section-"]');
        const stepIndex = sectionEl
          ? SECTIONS.findIndex((s) => s.id === sectionEl.id)
          : -1;
        if (stepIndex !== -1) setCurrentStep(stepIndex);
        requestAnimationFrame(() => {
          firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
          firstInvalid.focus();
        });
      }
    }
  }, [state, router]);

  // A few fields are always populated (gradeLevel is fixed, guardianCount
  // just tracks the list length) — excluded here so an untouched form still
  // reads as "nothing typed" instead of always prompting to confirm.
  const NON_DIRTY_FIELDS = new Set(["gradeLevel", "guardianCount", "schoolYear"]);

  function handleCancelClick() {
    const form = formRef.current;
    const isDirty =
      !!form &&
      Array.from(new FormData(form).entries()).some(([key, value]) => {
        if (NON_DIRTY_FIELDS.has(key)) return false;
        // An untouched <input type="file"> still contributes a zero-byte
        // File to FormData, not an empty string.
        if (value instanceof File) return value.size > 0;
        return value !== "";
      });
    if (isDirty) {
      setConfirmOpen(true);
    } else {
      router.push("/teacher/learners");
    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
          {yearNotice && (
            <p
              role="alert"
              className="mb-6 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              {yearNotice}
            </p>
          )}

          {/* Section 1: Learner Details */}
          <div
            id="section-learner"
            className={`scroll-mt-24 space-y-4${currentStep !== 0 ? " hidden" : ""}`}
          >
            <SectionHeader
              step={1}
              icon={User}
              title="Learner Details & Demographics"
              subtitle="Official student registry data and identification"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo Preview */}
              <div className="flex gap-4 rounded-xl border border-dashed border-gray-300 p-4">
                <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-200 shrink-0 overflow-hidden flex flex-col items-center justify-center text-gray-400">
                  {photoPreview ? (
                    // Local blob preview only — never submitted itself, the
                    // file input below is what the form actually posts.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6" aria-hidden="true" />
                      <span className="text-[10px] font-semibold mt-1">
                        Photo Preview
                      </span>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Photo
                    </button>
                  </div>
                  <input
                    ref={photoInputRef}
                    id="photo"
                    name="photo"
                    type="file"
                    accept={PHOTO_ACCEPT}
                    onChange={(e) =>
                      handlePhotoChange(e.target.files?.[0] ?? null)
                    }
                    aria-invalid={!!fieldErrors.photo}
                    aria-describedby={
                      fieldErrors.photo ? "photo-error" : undefined
                    }
                    className="sr-only"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Standard 2x2 ID photo on plain background. Max 3MB
                    (JPG/PNG).
                  </p>
                  {fieldErrors.photo && (
                    <p id="photo-error" className="text-xs text-red-500 mt-1">
                      {fieldErrors.photo}
                    </p>
                  )}
                </div>
              </div>

              {/* LRN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="lrn"
                    className="text-xs font-bold text-gray-700"
                  >
                    LRN (Reference No.)
                  </label>
                  <span className="text-[10px] font-semibold text-gray-400">
                    Optional
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <IdCard
                    className="w-5 h-5 text-[#5b0610] shrink-0"
                    aria-hidden="true"
                  />
                  <input
                    id="lrn"
                    name="lrn"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="e.g. 109283746152"
                    aria-invalid={!!fieldErrors.lrn}
                    aria-describedby={
                      fieldErrors.lrn ? "lrn-error" : "lrn-hint"
                    }
                    className={inp(fieldErrors.lrn)}
                  />
                </div>
                {fieldErrors.lrn ? (
                  <p id="lrn-error" className="text-xs text-red-500 mt-1">
                    {fieldErrors.lrn}
                  </p>
                ) : (
                  <p id="lrn-hint" className="text-[11px] text-gray-400 mt-1">
                    For transferees with an existing permanent 12-digit DepEd
                    LRN.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <User
                    className="w-5 h-5 text-[#5b0610] shrink-0"
                    aria-hidden="true"
                  />
                  <input
                    id="firstName"
                    name="firstName"
                    autoFocus
                    placeholder="e.g. Juan"
                    aria-invalid={!!fieldErrors.firstName}
                    aria-describedby={
                      fieldErrors.firstName ? "firstName-error" : undefined
                    }
                    className={inp(fieldErrors.firstName) + " capitalize"}
                  />
                </div>
                {fieldErrors.firstName && (
                  <p id="firstName-error" className="text-xs text-red-500 mt-1">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="middleName"
                  className="block text-xs font-bold text-gray-500 mb-1.5"
                >
                  Middle Name{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="middleName"
                  name="middleName"
                  placeholder="e.g. Santos"
                  className={inp() + " capitalize"}
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  placeholder="e.g. Dela Cruz"
                  aria-invalid={!!fieldErrors.lastName}
                  aria-describedby={
                    fieldErrors.lastName ? "lastName-error" : undefined
                  }
                  className={inp(fieldErrors.lastName) + " capitalize"}
                />
                {fieldErrors.lastName && (
                  <p id="lastName-error" className="text-xs text-red-500 mt-1">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="extensionName"
                  className="block text-xs font-bold text-gray-500 mb-1.5"
                >
                  Extension Name{" "}
                  <span className="text-gray-400 font-normal">(Suffix)</span>
                </label>
                <select
                  id="extensionName"
                  name="extensionName"
                  defaultValue=""
                  className={inp()}
                >
                  <option value="">None</option>
                  {extensionNames.map((suffix) => (
                    <option key={suffix} value={suffix}>
                      {suffix}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="birthdate"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Birthdate <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Calendar
                    className="w-5 h-5 text-[#5b0610] shrink-0"
                    aria-hidden="true"
                  />
                  <input
                    id="birthdate"
                    type="date"
                    name="birthdate"
                    aria-invalid={!!fieldErrors.birthdate}
                    aria-describedby={
                      fieldErrors.birthdate ? "birthdate-error" : undefined
                    }
                    className={inp(fieldErrors.birthdate)}
                    min={birthdateRange?.min}
                    max={birthdateRange?.max}
                    onChange={(e) => handleBirthdateChange(e.target.value)}
                  />
                </div>
                {fieldErrors.birthdate && (
                  <p id="birthdate-error" className="text-xs text-red-500 mt-1">
                    {fieldErrors.birthdate}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="age"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Calculated Age
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="age"
                    type="text"
                    readOnly
                    value={
                      ageDetail
                        ? `${ageDetail.years} yrs, ${ageDetail.months} mos`
                        : ""
                    }
                    placeholder="Auto-calculated"
                    aria-invalid={ageOutOfRange}
                    aria-describedby={ageOutOfRange ? "age-error" : undefined}
                    className={
                      inp() +
                      (ageOutOfRange
                        ? " bg-red-50 cursor-default text-red-600"
                        : " bg-gray-200 cursor-default text-gray-600")
                    }
                  />
                  {age !== null && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                        ageOutOfRange
                          ? "bg-red-100 text-red-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {ageOutOfRange ? "Not Eligible" : "Eligible"}
                    </span>
                  )}
                </div>
                {ageOutOfRange && (
                  <p id="age-error" className="text-xs text-red-500 mt-1">
                    Learner must be between {MIN_LEARNER_AGE} and{" "}
                    {MAX_LEARNER_AGE} years old.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="gender"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Biological Sex <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Mars
                    className="w-5 h-5 text-[#5b0610] shrink-0"
                    aria-hidden="true"
                  />
                  <select
                    id="gender"
                    name="gender"
                    aria-invalid={!!fieldErrors.gender}
                    aria-describedby={
                      fieldErrors.gender ? "gender-error" : undefined
                    }
                    className={inp(fieldErrors.gender)}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                {fieldErrors.gender && (
                  <p id="gender-error" className="text-xs text-red-500 mt-1">
                    {fieldErrors.gender}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="gradeLevel"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Grade Level
                </label>
                <div className="flex items-center gap-2">
                  <GraduationCap
                    className="w-5 h-5 text-[#5b0610] shrink-0"
                    aria-hidden="true"
                  />
                  {/* Only one grade level exists right now — a plain readonly
                      field, same pattern as Age, instead of a one-item dropdown. */}
                  <input
                    id="gradeLevel"
                    type="text"
                    readOnly
                    value={GRADE_LEVEL}
                    className={
                      inp() + " bg-gray-200 cursor-default text-gray-600"
                    }
                  />
                  <input type="hidden" name="gradeLevel" value={GRADE_LEVEL} />
                </div>
              </div>

              <div>
                <label
                  htmlFor="section"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Section <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Layers
                    className="w-5 h-5 text-[#5b0610] shrink-0"
                    aria-hidden="true"
                  />
                  {/* Remounts when the active year changes, so it never keeps
                      listing the previous year's sections. */}
                  <SectionSelect
                    key={activeYear?.schoolYearId ?? "none"}
                    enabled={true}
                    gradeLevel={GRADE_LEVEL}
                    error={fieldErrors.section}
                    inputClassName={inp}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="schoolYear"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  School Year <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <CalendarRange
                    className="w-5 h-5 text-[#5b0610] shrink-0"
                    aria-hidden="true"
                  />
                  {/* Display-only, like Grade Level: shows "SY 2026–2027",
                      submits the stored "2026-2027". */}
                  <input
                    id="schoolYear"
                    type="text"
                    readOnly
                    value={activeYear ? displaySchoolYear(activeYear.name) : ""}
                    placeholder={
                      activeYear === undefined && !activeYearFailed
                        ? "Loading…"
                        : "No active school year"
                    }
                    aria-invalid={!!fieldErrors.schoolYear}
                    aria-describedby={
                      fieldErrors.schoolYear ? "schoolYear-error" : undefined
                    }
                    className={
                      inp(fieldErrors.schoolYear) +
                      " bg-gray-200 cursor-default text-gray-600"
                    }
                  />
                  {activeYear && (
                    <input type="hidden" name="schoolYear" value={activeYear.name} />
                  )}
                </div>
                {fieldErrors.schoolYear && (
                  <p
                    id="schoolYear-error"
                    className="text-xs text-red-500 mt-1"
                  >
                    {fieldErrors.schoolYear}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Address — its own learner_addresses row, written in
              the same transaction as the learner. */}
          <div
            id="section-address"
            className={`scroll-mt-24 space-y-4${currentStep !== 1 ? " hidden" : ""}`}
          >
            <SectionHeader
              step={2}
              icon={MapPin}
              title="Residential Address"
              subtitle="Current residence for zoning and emergency routing"
            />

            <div>
              <label
                htmlFor="houseStreet"
                className="block text-xs font-bold text-gray-700 mb-1.5"
              >
                House No. / Block &amp; Lot / Street Address{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="houseStreet"
                name="houseStreet"
                placeholder="e.g. Blk 4 Lot 12, Mabini Street, Villa Consuelo"
                aria-invalid={!!fieldErrors.houseStreet}
                aria-describedby={
                  fieldErrors.houseStreet ? "houseStreet-error" : undefined
                }
                className={inp(fieldErrors.houseStreet)}
              />
              {fieldErrors.houseStreet && (
                <p id="houseStreet-error" className="text-xs text-red-500 mt-1">
                  {fieldErrors.houseStreet}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="provinceId"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Province <span className="text-red-500">*</span>
                </label>
                <ProvinceSelect
                  enabled={true}
                  error={fieldErrors.provinceId}
                  inputClassName={inp}
                />
              </div>

              <div>
                <label
                  htmlFor="cityMunicipality"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Town / City <span className="text-red-500">*</span>
                </label>
                <input
                  id="cityMunicipality"
                  name="cityMunicipality"
                  placeholder="e.g. Antipolo City"
                  aria-invalid={!!fieldErrors.cityMunicipality}
                  aria-describedby={
                    fieldErrors.cityMunicipality
                      ? "cityMunicipality-error"
                      : undefined
                  }
                  className={inp(fieldErrors.cityMunicipality)}
                />
                {fieldErrors.cityMunicipality && (
                  <p
                    id="cityMunicipality-error"
                    className="text-xs text-red-500 mt-1"
                  >
                    {fieldErrors.cityMunicipality}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="barangay"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  Barangay <span className="text-red-500">*</span>
                </label>
                <input
                  id="barangay"
                  name="barangay"
                  placeholder="e.g. San Roque"
                  aria-invalid={!!fieldErrors.barangay}
                  aria-describedby={
                    fieldErrors.barangay ? "barangay-error" : undefined
                  }
                  className={inp(fieldErrors.barangay)}
                />
                {fieldErrors.barangay && (
                  <p id="barangay-error" className="text-xs text-red-500 mt-1">
                    {fieldErrors.barangay}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="zipCode"
                  className="block text-xs font-bold text-gray-700 mb-1.5"
                >
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="zipCode"
                  name="zipCode"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 1870"
                  aria-invalid={!!fieldErrors.zipCode}
                  aria-describedby={
                    fieldErrors.zipCode ? "zipCode-error" : undefined
                  }
                  className={inp(fieldErrors.zipCode)}
                />
                {fieldErrors.zipCode && (
                  <p id="zipCode-error" className="text-xs text-red-500 mt-1">
                    {fieldErrors.zipCode}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Guardian & Contact Information — repeatable: a
              learner can have more than one guardian on file. */}
          <div
            id="section-guardian"
            className={`scroll-mt-24 space-y-4${currentStep !== 2 ? " hidden" : ""}`}
          >
            <SectionHeader
              step={3}
              icon={Users}
              title="Parent / Guardian Information"
              subtitle="Authorized primary adult contact for student emergencies"
              badge="Primary Contact"
            />
            {fieldErrors.guardians && (
              <p className="text-xs text-red-500">{fieldErrors.guardians}</p>
            )}

            <div className="space-y-5">
              {guardians.map((guardian, index) => (
                <div
                  key={guardian.id}
                  className={
                    guardians.length > 1
                      ? "rounded-xl border border-gray-100 p-4"
                      : ""
                  }
                >
                  {guardians.length > 1 && (
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-gray-500">
                        Guardian {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeGuardian(guardian.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  )}
                  <GuardianFields
                    index={index}
                    relationship={guardian.relationship}
                    onRelationshipChange={(value) =>
                      setGuardianRelationship(guardian.id, value)
                    }
                    fieldErrors={fieldErrors}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addGuardian}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-3 text-xs font-semibold text-gray-500 hover:border-[#5b0610] hover:text-[#5b0610] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Secondary Contact / Guardian
            </button>

            <input
              type="hidden"
              name="guardianCount"
              value={guardians.length}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {formError}
            </p>
          )}

          {/* Stepper footer — always visible, regardless of which step is
              showing. Back/Cancel on the left, Next (or the real submit, on
              the last step) on the right. */}
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-6 mt-6">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="h-10 px-6 text-sm border-gray-400"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelClick}
                className="h-10 px-6 text-sm border-gray-400"
              >
                Cancel
              </Button>
              {currentStep < SECTIONS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep((s) => s + 1)}
                  className="bg-[#5b0610] hover:bg-[#4d050d] text-white h-10 px-6 text-sm"
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <SubmitButton pending={pending} disabled={!activeYear} />
              )}
            </div>
          </div>
        </div>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this form?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything you typed will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                router.push("/teacher/learners");
              }}
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** One guardian's Name/Contact/Relationship fields, named `${field}_${index}`
 *  to match how add-learner-action.ts reads the repeatable list back out of
 *  FormData. */
function GuardianFields({
  index,
  relationship,
  onRelationshipChange,
  fieldErrors,
}: {
  index: number;
  relationship: string;
  onRelationshipChange: (value: string) => void;
  fieldErrors: Record<string, string>;
}) {
  const nameKey = `guardianName_${index}`;
  const contactKey = `contactNumber_${index}`;
  const relKey = `relationshipToLearner_${index}`;
  const otherKey = `relationshipOther_${index}`;
  const emailKey = `guardianEmail_${index}`;
  const occupationKey = `occupation_${index}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor={nameKey}
            className="block text-xs font-bold text-gray-700 mb-1.5"
          >
            Legal Name <span className="text-red-500">*</span>
          </label>
          <input
            id={nameKey}
            name={nameKey}
            placeholder="e.g. Maria Clara Dela Cruz"
            aria-invalid={!!fieldErrors[nameKey]}
            aria-describedby={
              fieldErrors[nameKey] ? `${nameKey}-error` : undefined
            }
            className={inp(fieldErrors[nameKey])}
          />
          {fieldErrors[nameKey] && (
            <p id={`${nameKey}-error`} className="text-xs text-red-500 mt-1">
              {fieldErrors[nameKey]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={contactKey}
            className="block text-xs font-bold text-gray-700 mb-1.5"
          >
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            id={contactKey}
            name={contactKey}
            type="tel"
            maxLength={11}
            placeholder="0917 123 4567"
            aria-invalid={!!fieldErrors[contactKey]}
            aria-describedby={
              fieldErrors[contactKey] ? `${contactKey}-error` : undefined
            }
            className={inp(fieldErrors[contactKey])}
          />
          {fieldErrors[contactKey] && (
            <p id={`${contactKey}-error`} className="text-xs text-red-500 mt-1">
              {fieldErrors[contactKey]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={relKey}
            className="block text-xs font-bold text-gray-700 mb-1.5"
          >
            Relationship <span className="text-red-500">*</span>
          </label>
          <select
            id={relKey}
            name={relKey}
            value={relationship}
            onChange={(e) => onRelationshipChange(e.target.value)}
            aria-invalid={!!fieldErrors[relKey]}
            aria-describedby={
              fieldErrors[relKey] ? `${relKey}-error` : undefined
            }
            className={inp(fieldErrors[relKey])}
          >
            <option value="">Select</option>
            <option value="MOTHER">Mother</option>
            <option value="FATHER">Father</option>
            <option value="GRANDMOTHER">Grandmother</option>
            <option value="GRANDFATHER">Grandfather</option>
            <option value="SISTER">Sister</option>
            <option value="BROTHER">Brother</option>
            <option value="AUNT">Aunt</option>
            <option value="UNCLE">Uncle</option>
            <option value="OTHER">Other</option>
          </select>
          {fieldErrors[relKey] && (
            <p id={`${relKey}-error`} className="text-xs text-red-500 mt-1">
              {fieldErrors[relKey]}
            </p>
          )}

          {/* "Other" on its own says nothing — collect what it is. */}
          {relationship === "OTHER" && (
            <div className="mt-2">
              <label htmlFor={otherKey} className="sr-only">
                Specify the relationship
              </label>
              <input
                id={otherKey}
                name={otherKey}
                maxLength={50}
                placeholder="Specify the relationship"
                aria-invalid={!!fieldErrors[otherKey]}
                aria-describedby={
                  fieldErrors[otherKey] ? `${otherKey}-error` : undefined
                }
                className={inp(fieldErrors[otherKey]) + " capitalize"}
              />
              {fieldErrors[otherKey] && (
                <p
                  id={`${otherKey}-error`}
                  className="text-xs text-red-500 mt-1"
                >
                  {fieldErrors[otherKey]}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={emailKey}
            className="block text-xs font-bold text-gray-700 mb-1.5"
          >
            Email Address{" "}
            <span className="font-normal text-gray-400">(Optional)</span>
          </label>
          <input
            id={emailKey}
            name={emailKey}
            type="email"
            placeholder="mariaclara@example.com"
            aria-invalid={!!fieldErrors[emailKey]}
            aria-describedby={
              fieldErrors[emailKey] ? `${emailKey}-error` : undefined
            }
            className={inp(fieldErrors[emailKey])}
          />
          {fieldErrors[emailKey] && (
            <p id={`${emailKey}-error`} className="text-xs text-red-500 mt-1">
              {fieldErrors[emailKey]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={occupationKey}
            className="block text-xs font-bold text-gray-700 mb-1.5"
          >
            Occupation / Workplace
          </label>
          <input
            id={occupationKey}
            name={occupationKey}
            placeholder="e.g. Government Employee"
            aria-invalid={!!fieldErrors[occupationKey]}
            aria-describedby={
              fieldErrors[occupationKey] ? `${occupationKey}-error` : undefined
            }
            className={inp(fieldErrors[occupationKey])}
          />
          {fieldErrors[occupationKey] && (
            <p
              id={`${occupationKey}-error`}
              className="text-xs text-red-500 mt-1"
            >
              {fieldErrors[occupationKey]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  step,
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  step: number;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5b0610] text-xs font-bold text-white">
          {step}
        </span>
        <Icon
          className="w-4 h-4 text-[#5b0610] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {badge && (
        <span className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500">
          {badge}
        </span>
      )}
    </div>
  );
}

function SubmitButton({ pending, disabled }: { pending: boolean; disabled: boolean }) {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="bg-[#5b0610] hover:bg-[#4d050d] text-white h-10 px-6 text-sm"
    >
      {pending ? "Adding..." : "Add Learner"}
    </Button>
  );
}
