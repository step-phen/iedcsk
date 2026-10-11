// Spoken lines and reveal spots for Put It In/Out; containers and objects come from the week-4 InsideOutside module.

import { PLACE_OBJECTS, placePhrase, type Place } from "../week-4/InsideOutside";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

/** Where the object is shown for the child after a wrong drop, in % of the scene. */
export const REVEAL_SPOT: Record<Place, { x: number; y: number }> = {
  inside: { x: 50, y: 52 },
  outside: { x: 13, y: 52 },
};

const nameOf = (objectId: string) => PLACE_OBJECTS[objectId].name;

export function instruction(ask: Place, objectId: string, container: string): string {
  return `Put the ${nameOf(objectId)} ${placePhrase(ask, container)}!`;
}

export function promptSpeech(ask: Place, objectId: string, container: string): string {
  return `Drag the ${nameOf(objectId)} and put it ${placePhrase(ask, container)}!`;
}

export function correctSpeech(ask: Place, objectId: string, container: string): string {
  return `Yes! The ${nameOf(objectId)} is ${placePhrase(ask, container)}!`;
}

export function revealSpeech(ask: Place, objectId: string, container: string): string {
  return `Oops! The ${nameOf(objectId)} goes ${placePhrase(ask, container)}, like this one.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You put ${score} out of ${total} things in the right place.`;
}
