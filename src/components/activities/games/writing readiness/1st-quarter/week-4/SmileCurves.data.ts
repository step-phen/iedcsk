// Faces, mouth geometry and spoken lines for Smile Curves; the greeting and intro stay in lib/speech-lines.ts.

import { samplePath, type Point } from "./TracePad";

export const VIEW_W = 800;
export const VIEW_H = 480;
// Every face picture is drawn this tall, centred, standing on the same line, so the mouth below lands on each face.
export const FACE_BOX = { x: 400, bottom: 452, h: 430 };

// Each mouth is one undercurve: a bowl from the left corner, down, and up to the right corner.
const MOUTH = { x: 400, y: 272, halfW: 118, depth: 100 };

export const MOUTH_PATH: Point[] = samplePath((t) => ({
  x: MOUTH.x - MOUTH.halfW * Math.cos(Math.PI * t),
  y: MOUTH.y + MOUTH.depth * Math.sin(Math.PI * t),
}));

const FACES = "/images/activities/smile-curves";

// Keyed by the seeder's ids; each picture is a face with no mouth.
export const FRIENDS = {
  sun: { name: "Sunny the sun", image: `${FACES}/face-sun.webp` },
  frog: { name: "Freddy the frog", image: `${FACES}/face-frog.webp` },
  cat: { name: "Kiki the cat", image: `${FACES}/face-cat.webp` },
  bear: { name: "Benny the bear", image: `${FACES}/face-bear.webp` },
  pig: { name: "Pinky the pig", image: `${FACES}/face-pig.webp` },
};

export type FriendKey = keyof typeof FRIENDS;

export const isFriend = (value: string): value is FriendKey => value in FRIENDS;

export const INSTRUCTION = "Trace a smile from the green dot to the star!";

export const DONE_TEXT = "All your friends are smiling!";

export function promptSpeech(friend: FriendKey): string {
  return `${FRIENDS[friend].name} needs a smile! Start at the green dot, go down, and come back up to the star.`;
}

export function rightSpeech(friend: FriendKey): string {
  return `That's correct! Look how happy ${FRIENDS[friend].name} is!`;
}

export const WRONG = "Oops! Watch the pencil draw the smile.";

export const REVEAL = "Like this! Down, around, and up.";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
