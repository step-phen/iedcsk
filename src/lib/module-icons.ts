import {
  BookOpen,
  Languages,
  PenLine,
  Calculator,
  PersonStanding,
  Palette,
  Brain,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

/**
 * One glyph per curriculum module, shared so a module reads the same wherever
 * it appears (learner progress, developing-learners, strengths & weaknesses).
 *
 * Keyed by lowercased module_name. Both spellings of the Health module are
 * mapped: the DB row reads "Health, Works, Habits and Attitude" while older
 * copies of this map used "&" — the "&" key alone silently fell through to the
 * fallback icon.
 */
const MODULE_ICONS: Record<string, LucideIcon> = {
  reading: BookOpen,
  language: Languages,
  "writing readiness": PenLine,
  "math readiness": Calculator,
  "gross motor development": PersonStanding,
  "arts and crafts": Palette,
  "health, works, habits and attitude": Brain,
  "health, works, habits & attitude": Brain,
};

/** `fallback` lets a caller keep its own neutral glyph (developing-learners uses ClipboardList). */
export function getModuleIcon(
  name: string,
  fallback: LucideIcon = GraduationCap,
): LucideIcon {
  return MODULE_ICONS[name.trim().toLowerCase()] ?? fallback;
}
