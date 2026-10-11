// Object library, bins and spoken lines for Change the Sorting Rule. Reuses the color and shape
// libraries from SortByColor/ShapeHunt — the new part here is the rule itself switching mid-game.

import { COLOR_HEX, COLOR_NAMES, OBJECTS as COLOR_OBJECTS, isColorName, isObjectId as isColorObjectId } from "../week-4/SortByColor.data";
import { OBJECTS as SHAPE_OBJECTS, SHAPE_NAMES, isObjectId as isShapeObjectId, isShapeName, type ShapeName } from "../week-1/ShapeHunt.data";

export type Rule = "color" | "shape";

export function isRule(value: unknown): value is Rule {
  return value === "color" || value === "shape";
}

export { COLOR_HEX, COLOR_NAMES, SHAPE_NAMES, isColorName, isShapeName };
export type { ShapeName };

export function isObjectIdForRule(rule: Rule, value: unknown): boolean {
  return rule === "color" ? isColorObjectId(value) : isShapeObjectId(value);
}

export function emojiFor(rule: Rule, objectId: string): string {
  return rule === "color" ? COLOR_OBJECTS[objectId].emoji : SHAPE_OBJECTS[objectId].emoji;
}

export function nameFor(rule: Rule, objectId: string): string {
  return rule === "color" ? COLOR_OBJECTS[objectId].name : SHAPE_OBJECTS[objectId].name;
}

export function binLabel(rule: Rule, value: string): string {
  return rule === "color" ? COLOR_NAMES[value] : SHAPE_NAMES[value as ShapeName];
}

export const RULE_LABEL: Record<Rule, string> = { color: "Sort by COLOR", shape: "Sort by SHAPE" };

export const INSTRUCTION = "Check the rule, then drag the object to the right group!";

export function promptSpeech(rule: Rule, objectId: string, answer: string): string {
  const name = nameFor(rule, objectId).toLowerCase();
  return `The rule is ${rule}. This ${name} is ${binLabel(rule, answer).toLowerCase()}. Drag it to that group!`;
}

export function ruleChangeSpeech(rule: Rule): string {
  return `New rule! Now we sort by ${rule}!`;
}

export const TRY_AGAIN = "Not that group. Check the rule again!";

export function correctSpeech(rule: Rule, answer: string): string {
  return `Yes! That group is ${binLabel(rule, answer).toLowerCase()}!`;
}

export function revealSpeech(rule: Rule, answer: string): string {
  return `Here it is! That group is ${binLabel(rule, answer).toLowerCase()}!`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You sorted ${score} out of ${total} objects.`;
}
