import { z } from "zod";
import { todayDatePH } from "@/lib/datetime";
import type { LearnerAddress } from "@/types/db";

export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

const avatarColors = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
];

export function getAvatarColor(id: number): string {
  return avatarColors[id % avatarColors.length];
}

/**
 * A blank middle name is stored as the sentinel "N/A" (add-learner-action.ts
 * and update-learner-action.ts), and some older rows hold "None" instead.
 * Neither is a real name, so every read has to filter them out — otherwise the
 * sentinel leaks into the UI as a bogus "N." middle initial, and into the
 * learner search index as matchable text.
 */
const ABSENT_MIDDLE_NAMES = new Set(["", "n/a", "na", "none"]);

export function hasMiddleName(middleName: string | null | undefined): boolean {
  return !!middleName && !ABSENT_MIDDLE_NAMES.has(middleName.trim().toLowerCase());
}

/** "Dela Cruz" → "D." — empty string when there is no real middle name. */
export function middleInitial(middleName: string | null | undefined): string {
  return hasMiddleName(middleName)
    ? `${middleName!.trim()[0].toUpperCase()}.`
    : "";
}

/** "divine p. seno" → "Divine P. Seno"; names are stored as typed. */
export const capitalizeWords = (s: string) => s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** "Stephen Adolf V. Plaza", whatever case the name was typed in. */
export function displayName(learner: { firstName: string; middleName: string | null; lastName: string }): string {
  return capitalizeWords([learner.firstName, middleInitial(learner.middleName), learner.lastName].filter(Boolean).join(" "));
}

/**
 * The learner-search match used by both the learners page and the attendance
 * modal. Matches on full name or LRN — a teacher holding a printed class
 * list often has the number rather than the spelling.
 *
 * Shared rather than retyped so the two search boxes cannot drift into
 * disagreeing about what "matches" means.
 */
export function matchesLearnerSearch(
  learner: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    lrn?: string | null;
  },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const middle = hasMiddleName(learner.middleName) ? learner.middleName : "";
  const fullName = `${learner.firstName} ${middle} ${learner.lastName}`
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return fullName.includes(q) || (learner.lrn?.includes(q) ?? false);
}

/**
 * The five address columns as one display line, narrowest part first:
 * "12 Mabini St., Brgy. San Roque, Antipolo, Rizal 1870".
 *
 * Blank and NULL parts are skipped rather than rendered as gaps or stray
 * commas, and a fully empty address returns null so callers fall back to their
 * own placeholder instead of showing an empty box.
 */
export function formatLearnerAddress(
  address: LearnerAddress | null | undefined
): string | null {
  if (!address) return null;

  const line = [
    address.houseStreet,
    address.barangay,
    address.cityMunicipality,
    address.province,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)
    .join(", ");

  const zip = address.zipCode?.trim();
  const full = [line, zip].filter(Boolean).join(" ");

  return full || null;
}

export function formatName(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export const MIN_LEARNER_AGE = 4;
export const MAX_LEARNER_AGE = 6;

// Every calendar date here is UTC-midnight, matching how lib/db.ts parses a
// Postgres DATE column (birthdate) and what lib/datetime.ts's todayDatePH()
// produces — so callers must read these with the getUTC* getters, never the
// local ones, or results drift a day on any server not at UTC+8.

function parseDateOnly(date: Date | string): Date {
  if (typeof date !== "string") return date;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function calculateAge(birthdate: Date | string, today: Date = todayDatePH()): number {
  const birth = parseDateOnly(birthdate);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return age;
}

/** Same as calculateAge but with the leftover months — for the Add Learner
 *  form's "X yrs, Y mos" display. */
export function calculateAgeYearsMonths(
  birthdate: Date | string,
  today: Date = todayDatePH()
): { years: number; months: number } {
  const birth = parseDateOnly(birthdate);
  let years = today.getUTCFullYear() - birth.getUTCFullYear();
  let months = today.getUTCMonth() - birth.getUTCMonth();
  if (today.getUTCDate() < birth.getUTCDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months };
}

function toDateInputValue(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Birthdate bounds, as YYYY-MM-DD, for learners currently MIN_LEARNER_AGE..MAX_LEARNER_AGE years old. */
export function getBirthdateRange(today: Date = todayDatePH()): { min: string; max: string } {
  const max = new Date(
    Date.UTC(today.getUTCFullYear() - MIN_LEARNER_AGE, today.getUTCMonth(), today.getUTCDate())
  );
  const min = new Date(
    Date.UTC(today.getUTCFullYear() - (MAX_LEARNER_AGE + 1), today.getUTCMonth(), today.getUTCDate() + 1)
  );
  return { min: toDateInputValue(min), max: toDateInputValue(max) };
}

/** Only grade level the app offers — no Kinder 2 yet. Shared by the learner
 *  and section forms so neither offers a grade level the other doesn't. */
export const gradeLevels = ["Kindergarten"] as const;

/** Suffix dropdown options, shared between the add and edit forms. */
export const extensionNames = ["Jr.", "Sr.", "II", "III", "IV", "V"] as const;

/** Relationship options, shared so no call site has to cast a raw string. */
export const guardianRelationships = [
  "MOTHER",
  "FATHER",
  "GRANDMOTHER",
  "GRANDFATHER",
  "SISTER",
  "BROTHER",
  "AUNT",
  "UNCLE",
  "OTHER",
] as const;

// The API (StoreLearnerRequest) owns every learner rule; the photo is checked here too so a wrong file fails before it uploads.
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const PHOTO_TYPES = PHOTO_ACCEPT.split(",");
const MAX_PHOTO_MB = 3;

const learnerPhotoSchema = z
  .instanceof(File)
  .refine((f) => PHOTO_TYPES.includes(f.type), "Photo must be a JPG, PNG, or WEBP image.")
  .refine((f) => f.size <= MAX_PHOTO_MB * 1024 * 1024, `Photo must be ${MAX_PHOTO_MB}MB or smaller.`);

/** An 11-digit PH mobile number grouped as "0917 123 4567" while it is typed; the API strips the spaces. */
export function formatMobile(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7)].filter(Boolean).join(" ");
}

/** The first problem with a picked photo, or null when it may be uploaded. */
export function photoError(file: File): string | null {
  const result = learnerPhotoSchema.safeParse(file);
  return result.success ? null : result.error.issues[0].message;
}
