// Pictures, drum colors and spoken lines for Language Review 2 (Music Stage); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type Task = "listen" | "match" | "picture";

export const TASKS: Task[] = ["listen", "match", "picture"];

// Emoji stand in until the picture art is added.
export const PICTURES: Record<string, { name: string; emoji: string }> = {
  ball: { name: "ball", emoji: "⚽" },
  cat: { name: "cat", emoji: "🐱" },
  duck: { name: "duck", emoji: "🦆" },
  fish: { name: "fish", emoji: "🐟" },
  goat: { name: "goat", emoji: "🐐" },
  house: { name: "house", emoji: "🏠" },
  lion: { name: "lion", emoji: "🦁" },
  sun: { name: "sun", emoji: "☀️" },
  tree: { name: "tree", emoji: "🌳" },
};

// One drum color per spot, so the right drum is never told apart by color.
export const DRUM_COLORS = ["#e64980", "#4c6ef5", "#40c057"];

export const LOADING = "Tuning the drums…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

const otherCase = (letter: string) => (letter === letter.toUpperCase() ? "small" : "big");

/** The song sheet text; listen tasks are only heard, so the screen never gives the letter away. */
export function instruction(task: Task, target: string): string {
  if (task === "listen") return "Listen, then tap the drum with that letter!";
  if (task === "match") return `Find the ${otherCase(target)} letter that goes with ${caseName(target)} ${target}!`;
  return `Which picture starts with ${target}?`;
}

export function promptSpeech(task: Task, target: string, choices: string[]): string {
  if (task === "listen") return `Find ${caseName(target)} ${target}.`;
  if (task === "match") return `Find ${otherCase(target)} ${target}. It goes with ${caseName(target)} ${target}.`;
  const names = choices.map((c) => PICTURES[c].name);
  return `Which picture starts with letter ${target}? ${names.slice(0, -1).join(", ")}, or ${names.at(-1)}?`;
}

/** What a choice is called out loud. */
export function choiceSpeech(task: Task, choice: string): string {
  return task === "picture" ? PICTURES[choice].name : `${caseName(choice)} ${choice}`;
}

export function correctSpeech(task: Task, target: string, answer: string): string {
  if (task === "picture") return `Boom boom! ${PICTURES[answer].name} starts with ${target}!`;
  return `Boom boom! That is ${choiceSpeech(task, answer)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(task: Task, target: string, answer: string): string {
  if (task === "picture") return `${REVEAL} ${PICTURES[answer].name} starts with ${target}.`;
  return `${REVEAL} This is ${choiceSpeech(task, answer)}.`;
}

export const DONE = "What a great show! You know your letters!";

export const DONE_MISSED = "Good try, little drummer! Let's keep practicing our letters.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You played ${score} out of ${total} beats right.`;
}
