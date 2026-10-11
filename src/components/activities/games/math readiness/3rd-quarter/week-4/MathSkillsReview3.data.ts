// Picture-card tasks for Math Skills Review 3; every card reuses the objects of the Q3 game that taught that skill.

import { SNACKS, isSnack } from "../week-1/BigOrSmall.data";
import { OBJECTS as SIZE_OBJECTS, isObjectId as isSizeObject } from "../week-1/SizeSorting.data";
import { LENGTH_KINDS, isLengthKind } from "../week-2/LengthItem";
import { LANDMARKS, OBJECTS as PARK_OBJECTS, isDistance, isLandmark, isObjectId as isParkObject, isSide, type Distance, type Side } from "../week-3/NearOrFar.data";
import { PLACE_OBJECTS, isContainer, isPlace, isPlaceObject, placePhrase, type Place } from "./InsideOutside";

export type Task =
  | { kind: "size"; object: string; ask: "big" | "small" }
  | { kind: "order"; object: string; ask: "biggest" | "smallest" }
  | { kind: "length"; item: keyof typeof LENGTH_KINDS; lengths: [number, number]; ask: "long" | "short" }
  | { kind: "distance"; landmark: string; side: Side; object: string; ask: Distance }
  | { kind: "position"; container: string; object: string; ask: Place };

/** The emoji in each card's corner, naming the skill it checks. */
export const CARD_ICON: Record<Task["kind"], string> = { size: "🐘", order: "🪜", length: "📏", distance: "📍", position: "📦" };

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

/** Parses one question row's data, throwing on anything the card can't draw. */
export function parseTask(data: unknown, key: string): Task {
  const d = data as Record<string, unknown>;
  const bad = () => new Error(`Question ${key} has an invalid "${String(d.kind)}" card`);
  switch (d.kind) {
    case "size":
      if (!isSnack(d.object) || (d.ask !== "big" && d.ask !== "small")) throw bad();
      return { kind: "size", object: d.object, ask: d.ask };
    case "order":
      if (!isSizeObject(d.object) || (d.ask !== "biggest" && d.ask !== "smallest")) throw bad();
      return { kind: "order", object: d.object, ask: d.ask };
    case "length": {
      const lengths = d.lengths;
      if (!isLengthKind(d.item) || !Array.isArray(lengths) || lengths.length !== 2 || lengths[0] === lengths[1] || !lengths.every((n) => Number.isInteger(n) && n >= 2)) throw bad();
      if (d.ask !== "long" && d.ask !== "short") throw bad();
      return { kind: "length", item: d.item, lengths: lengths as [number, number], ask: d.ask };
    }
    case "distance":
      if (!isLandmark(d.landmark) || !isSide(d.side) || !isParkObject(d.object) || !isDistance(d.ask)) throw bad();
      return { kind: "distance", landmark: d.landmark, side: d.side, object: d.object, ask: d.ask };
    case "position":
      if (!isContainer(d.container) || !isPlaceObject(d.object) || !isPlace(d.ask)) throw bad();
      return { kind: "position", container: d.container, object: d.object, ask: d.ask };
    default:
      throw bad();
  }
}

/** The choice id that answers the card — what the server's answer key must match. */
export function answerOf(task: Task): string {
  if (task.kind === "order") return task.ask === "biggest" ? "big" : "small";
  return task.ask;
}

/** "the small cookie", "the bike near the house", … — shared by the instruction and every spoken line. */
export function phraseOf(task: Task): string {
  switch (task.kind) {
    case "size":
      return `the ${task.ask} ${SNACKS[task.object].name}`;
    case "order":
      return `the ${task.ask} ${SIZE_OBJECTS[task.object].name}`;
    case "length":
      return `the ${task.ask} ${LENGTH_KINDS[task.item].name}`;
    case "distance":
      return `the ${PARK_OBJECTS[task.object].name} ${task.ask === "near" ? "near" : "far from"} the ${LANDMARKS[task.landmark].name}`;
    case "position":
      return `the ${PLACE_OBJECTS[task.object].name} ${placePhrase(task.ask, task.container)}`;
  }
}

export const instruction = (task: Task) => `Tap ${phraseOf(task)}!`;
export const correctSpeech = (task: Task) => `Yes! That is ${phraseOf(task)}!`;
export const revealSpeech = (task: Task) => `Oops! Here is ${phraseOf(task)}.`;

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You got ${score} out of ${total} picture cards right.`;
}
