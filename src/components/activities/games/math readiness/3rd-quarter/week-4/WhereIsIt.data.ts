// Spoken lines for Where Is It?; containers, objects and spots live in InsideOutside.tsx.

import { CONTAINERS, PLACE_OBJECTS, placePhrase, type Place } from "./InsideOutside";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

const nameOf = (objectId: string) => PLACE_OBJECTS[objectId].name;

export function instruction(ask: Place, objectId: string, container: string): string {
  return `Tap a ${nameOf(objectId)} ${placePhrase(ask, container)}!`;
}

export function promptSpeech(ask: Place, objectId: string, container: string): string {
  return `Look at the ${CONTAINERS[container].name}. Tap a ${nameOf(objectId)} that is ${placePhrase(ask, container)}!`;
}

export function correctSpeech(ask: Place, objectId: string, container: string): string {
  return `Yes! That ${nameOf(objectId)} is ${placePhrase(ask, container)}!`;
}

export function revealSpeech(ask: Place, container: string): string {
  return `Oops! The glowing ones are ${placePhrase(ask, container)}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You found ${score} out of ${total} inside and outside things.`;
}
