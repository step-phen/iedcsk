// Boxes, round checks and spoken lines for Long or Short?; the stick and the things are drawn by LengthItem.tsx.

import { LENGTH_KINDS } from "./LengthItem";

export type Group = "longer" | "shorter";

export const GROUPS: { id: Group; label: string }[] = [
  { id: "longer", label: "Longer" },
  { id: "shorter", label: "Shorter" },
];

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

const nameOf = (kind: keyof typeof LENGTH_KINDS) => LENGTH_KINDS[kind].name;
const labelOf = (group: Group) => GROUPS.find((g) => g.id === group)!.label;

export const INSTRUCTION = "Longer or shorter than the stick? Drag it into a box!";

export function promptSpeech(kind: keyof typeof LENGTH_KINDS): string {
  return `Is this ${nameOf(kind)} longer or shorter than the measuring stick? Drag it into the right box!`;
}

export function correctSpeech(group: Group, kind: keyof typeof LENGTH_KINDS): string {
  return `Yes! The ${nameOf(kind)} is ${group} than the stick!`;
}

export function revealSpeech(group: Group, kind: keyof typeof LENGTH_KINDS): string {
  return `Oops! The ${nameOf(kind)} is ${group} than the stick. It goes in the ${labelOf(group)} box.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You measured ${score} out of ${total} things.`;
}
