"use client"

import { useState, useEffect, useRef, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { apiFetch } from "@/lib/api"
import { extensionNames, formatMobile, guardianRelationships, hasMiddleName, PHOTO_ACCEPT, photoError } from "@/lib/learners"
import type { LearnerAddress } from "@/types/db"
import { Pencil, ImagePlus, Upload, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModalShell } from "@/components/ui/modal-shell"
import ProvinceSelect from "@/components/learner/province-select"

interface Learner {
  id: number
  lrn: string | null
  firstName: string
  middleName: string | null
  lastName: string
  /** null when the learner has no suffix. */
  extensionName: string | null
  birthdate: Date
  gender: string
  /** null when the learner has no photo uploaded yet. */
  photoUrl: string | null
  /** null when the learner has no learner_addresses row yet — the form still
   *  submits all five parts, which the service upserts. */
  address: LearnerAddress | null
  /** Every guardian on file, oldest first; the server matches form guardian N to the Nth one. */
  guardians: GuardianInput[]
}

interface GuardianInput {
  guardianName: string
  contactNumber: string
  /** Stored value: a preset token, or free text typed under "Other". */
  relationshipToLearner: string
  guardianEmail: string | null
  occupation: string | null
}

/**
 * The column holds the relationship itself, so a value that isn't one of the
 * presets came from the "Other" box and has to be put back there — otherwise
 * the dropdown would open on nothing and silently drop what was saved.
 */
const BLANK_GUARDIAN: GuardianInput = { guardianName: "", contactNumber: "", relationshipToLearner: "", guardianEmail: null, occupation: null }

function splitRelationship(stored: string) {
  const isPreset = (guardianRelationships as readonly string[]).includes(stored)
  return isPreset || stored === ""
    ? { selected: stored, other: "" }
    : { selected: "OTHER", other: stored }
}

const inp = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] shadow-xs bg-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${err ? "border-red-400" : "border-gray-300"}`

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-[#5b0610]" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a0e1c]">{title}</h3>
    </div>
  )
}

export default function EditProfileDrawer({ learner }: { learner: Learner }) {
  const [open, setOpen] = useState(false)
  // A learner with no guardian on file still gets one blank block to fill in.
  const saved = learner.guardians.length ? learner.guardians : [BLANK_GUARDIAN]
  // Keys of guardians added in this edit; only these can be removed, since the API never deletes saved ones.
  const [added, setAdded] = useState<number[]>([])
  const nextKey = useRef(0)
  const guardians = [
    ...saved.map((guardian, i) => ({ key: `saved-${i}`, guardian, onRemove: undefined })),
    ...added.map((k) => ({ key: `added-${k}`, guardian: BLANK_GUARDIAN, onRemove: () => setAdded((prev) => prev.filter((x) => x !== k)) })),
  ]
  // Starts as the learner's existing photo (a real URL); becomes a blob: URL once a new file is picked.
  const [photoPreview, setPhotoPreview] = useState<string | null>(learner.photoUrl)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  function handlePhotoChange(file: File) {
    setPhotoPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  // onSubmit + fetch rather than a form action, so an API rejection leaves every edited field in place.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // PHP only reads multipart bodies on POST, so the PUT travels as a spoofed method.
    formData.set("_method", "PUT")
    const photo = formData.get("photo")
    if (photo instanceof File && photo.size === 0) formData.delete("photo")
    else if (photo instanceof File) {
      const problem = photoError(photo)
      if (problem) return setFieldErrors({ photo: problem })
    }

    setPending(true)
    setFormError(null)
    try {
      const res = await apiFetch(`/api/learners/${learner.id}`, { method: "POST", body: formData })
      if (res.ok) {
        setFieldErrors({})
        toast.success("Profile updated successfully!")
        setOpen(false)
        router.refresh()
      } else if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> }
        setFieldErrors(Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages[0]])))
        setFormError("Please fix the highlighted fields.")
      } else {
        setFormError("Could not save the changes. Please try again.")
      }
    } catch {
      setFormError("Could not reach the server. Please try again.")
    } finally {
      setPending(false)
    }
  }

  // Revoke a staged blob preview once the drawer no longer needs it.
  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  return (
    <>
      <Button
        onClick={() => {
          setAdded([])
          setOpen(true)
        }}
        className="group bg-[#5b0610] hover:bg-[#4d050d] h-9.5 justify-center text-white text-sm font-semibold cursor-pointer px-3"
      >
        <Pencil size={14} className="transition-transform group-hover:rotate-90 duration-300" />
        Update Profile
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Update Profile"
        subtitle="Update the learner's profile information."
        headerId="edit-profile-title"
        headerPadding="px-8 py-5"
        maxWidth="max-w-4xl"
        panelClassName="max-h-[95vh] overflow-y-auto scrollbar-hide"
      >
            <form onSubmit={handleSubmit} className="space-y-5 px-8 py-6">
              <div className="space-y-4 rounded-xl bg-[#eae4c9]/25 border border-[#eae4c9] p-4">
                <SectionHeader title="Personal Information" />

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                      {photoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus className="w-7 h-7 text-gray-400" aria-hidden="true" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      Upload
                    </button>
                    <input
                      ref={photoInputRef}
                      id="photo"
                      name="photo"
                      type="file"
                      accept={PHOTO_ACCEPT}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoChange(file)
                      }}
                      aria-invalid={!!fieldErrors.photo}
                      className="sr-only"
                    />
                    {fieldErrors.photo && <p className="text-[10px] text-red-500 text-center">{fieldErrors.photo}</p>}
                  </div>

                  <div className="flex-1 flex flex-col gap-4">
                  <div className="max-w-xs">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      LRN <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      name="lrn"
                      defaultValue={learner.lrn || ""}
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="12-digit LRN"
                      className={inp(fieldErrors.lrn)}
                    />
                    {fieldErrors.lrn && <p className="text-xs text-red-500 mt-1">{fieldErrors.lrn}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_7rem] gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input name="firstName" defaultValue={learner.firstName} disabled className={inp()} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">
                        Middle Name <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      {/* Show the box empty rather than pre-filled with the
                          "N/A" sentinel, which the teacher would otherwise have
                          to delete by hand on every edit. */}
                      <input
                        name="middleName"
                        defaultValue={hasMiddleName(learner.middleName) ? learner.middleName! : ""}
                        disabled
                        className={inp()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input name="lastName" defaultValue={learner.lastName} disabled className={inp()} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">
                        (Suffix)
                      </label>
                      <select
                        name="extensionName"
                        defaultValue={learner.extensionName ?? ""}
                        disabled
                        className={inp()}
                      >
                        <option value="">None</option>
                        {extensionNames.map((suffix) => (
                          <option key={suffix} value={suffix}>{suffix}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl bg-[#eae4c9]/25 border border-[#eae4c9] p-4">
                <SectionHeader title="Address" />
                {/* Same order and track sizing as the Add form — the two must
                    stay in step. Province is fixed, House/Street takes the rest. */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_15rem] gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      House No./Blk. No./Lot No. &amp; Street <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="houseStreet"
                      defaultValue={learner.address?.houseStreet ?? ""}
                      required
                      className={inp(fieldErrors.houseStreet)}
                    />
                    {fieldErrors.houseStreet && <p className="text-xs text-red-500 mt-1">{fieldErrors.houseStreet}</p>}
                  </div>
                  <div>
                    <label htmlFor="provinceId" className="block text-xs font-bold text-gray-700 mb-1.5">
                      Province <span className="text-red-500">*</span>
                    </label>
                    {/* Loads from /api/provinces only once the drawer opens. */}
                    <ProvinceSelect
                      enabled={open}
                      defaultValue={learner.address?.provinceId}
                      error={fieldErrors.provinceId}
                      inputClassName={inp}
                    />
                  </div>
                </div>
                {/* ZIP on a fixed 8rem track so it sits flush right — same as
                    the Add form. */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_8rem] gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Town/City/Municipality <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="cityMunicipality"
                      defaultValue={learner.address?.cityMunicipality ?? ""}
                      required
                      className={inp(fieldErrors.cityMunicipality)}
                    />
                    {fieldErrors.cityMunicipality && <p className="text-xs text-red-500 mt-1">{fieldErrors.cityMunicipality}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Barangay <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="barangay"
                      defaultValue={learner.address?.barangay ?? ""}
                      required
                      className={inp(fieldErrors.barangay)}
                    />
                    {fieldErrors.barangay && <p className="text-xs text-red-500 mt-1">{fieldErrors.barangay}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="zipCode"
                      defaultValue={learner.address?.zipCode ?? ""}
                      inputMode="numeric"
                      maxLength={4}
                      required
                      // Capped rather than full-width — 4 digits, same as Add.
                      className={inp(fieldErrors.zipCode) + " max-w-32"}
                    />
                    {fieldErrors.zipCode && <p className="text-xs text-red-500 mt-1">{fieldErrors.zipCode}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl bg-[#eae4c9]/25 border border-[#eae4c9] p-4">
                <SectionHeader title="Guardian & Contact Information" />
                <input type="hidden" name="guardianCount" value={guardians.length} />
                {guardians.map(({ key, guardian, onRemove }, i) => (
                  <GuardianFields key={key} index={i} numbered={guardians.length > 1} guardian={guardian} fieldErrors={fieldErrors} onRemove={onRemove} />
                ))}
                <button
                  type="button"
                  onClick={() => setAdded((prev) => [...prev, nextKey.current++])}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-3 text-xs font-semibold text-gray-500 hover:border-[#5b0610] hover:text-[#5b0610] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Secondary Contact / Guardian
                </button>
              </div>

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 px-6 text-sm font-semibold text-gray-800 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <SubmitButton pending={pending} />
              </div>
            </form>
      </ModalShell>
    </>
  )
}

// One guardian's three fields; input names carry the index (guardianName_0, …) as in the Add form.
function GuardianFields({
  index,
  numbered,
  guardian,
  fieldErrors,
  onRemove,
}: {
  index: number
  numbered: boolean
  guardian: GuardianInput
  fieldErrors: Record<string, string>
  onRemove?: () => void
}) {
  const seed = splitRelationship(guardian.relationshipToLearner)
  // Controlled so the "Other" text box can appear alongside it.
  const [relationship, setRelationship] = useState(seed.selected)
  const err = (field: string) => fieldErrors[`${field}_${index}`]

  return (
    <div className="space-y-3">
      {numbered && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500">Guardian {index + 1}</p>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Guardian Name <span className="text-red-500">*</span>
          </label>
          <input name={`guardianName_${index}`} defaultValue={guardian.guardianName} required className={inp(err("guardianName"))} />
          {err("guardianName") && <p className="text-xs text-red-500 mt-1">{err("guardianName")}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <input
            name={`contactNumber_${index}`}
            type="tel"
            inputMode="numeric"
            maxLength={13}
            placeholder="0917 123 4567"
            defaultValue={formatMobile(guardian.contactNumber)}
            onChange={(e) => (e.currentTarget.value = formatMobile(e.currentTarget.value))}
            required
            className={inp(err("contactNumber"))}
          />
          {err("contactNumber") && <p className="text-xs text-red-500 mt-1">{err("contactNumber")}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Relationship <span className="text-red-500">*</span>
          </label>
          <select
            name={`relationshipToLearner_${index}`}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            required
            className={inp(err("relationshipToLearner"))}
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
          {err("relationshipToLearner") && <p className="text-xs text-red-500 mt-1">{err("relationshipToLearner")}</p>}

          {/* "Other" on its own says nothing — collect what it is. */}
          {relationship === "OTHER" && (
            <div className="mt-2">
              <input
                name={`relationshipOther_${index}`}
                defaultValue={seed.other}
                maxLength={50}
                placeholder="e.g. Neighbor"
                className={inp(err("relationshipOther")) + " capitalize"}
              />
              {err("relationshipOther") && <p className="text-xs text-red-500 mt-1">{err("relationshipOther")}</p>}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">
            Email Address <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            name={`guardianEmail_${index}`}
            type="email"
            defaultValue={guardian.guardianEmail ?? ""}
            placeholder="mariaclara@example.com"
            className={inp(err("guardianEmail"))}
          />
          {err("guardianEmail") && <p className="text-xs text-red-500 mt-1">{err("guardianEmail")}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">
            Occupation / Workplace <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            name={`occupation_${index}`}
            defaultValue={guardian.occupation ?? ""}
            maxLength={100}
            placeholder="e.g. Government Employee"
            className={inp(err("occupation"))}
          />
          {err("occupation") && <p className="text-xs text-red-500 mt-1">{err("occupation")}</p>}
        </div>
      </div>
    </div>
  )
}

function SubmitButton({ pending }: { pending: boolean }) {

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 px-6 text-sm font-bold text-white bg-[#5b0610] hover:bg-[#4d050d] rounded-full transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}
