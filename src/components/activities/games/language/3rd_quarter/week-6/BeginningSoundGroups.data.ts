// Toy pictures, chest labels and spoken lines for Beginning Sound Groups (Toy Room Cleanup); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which pictures a round uses comes from activity_questions; emoji stand in until the picture art is added.
export const PICTURES: Record<string, { name: string; emoji: string }> = {
  ball: { name: "ball", emoji: "⚽" },
  bus: { name: "bus", emoji: "🚌" },
  mango: { name: "mango", emoji: "🥭" },
  mouse: { name: "mouse", emoji: "🐭" },
  sock: { name: "sock", emoji: "🧦" },
};

// Each chest is labeled by a picture that starts with its sound; `sound` is how the speech voice says it.
export const CHESTS: Record<string, { name: string; emoji: string; sound: string; color: string }> = {
  b: { name: "balloon", emoji: "🎈", sound: "buh", color: "#e8590c" },
  m: { name: "moon", emoji: "🌙", sound: "mmm", color: "#1c7ed6" },
  s: { name: "sun", emoji: "☀️", sound: "sss", color: "#2f9e44" },
};

export const INSTRUCTION = "Listen, then drag the toy into the chest that starts the same way!";

export const LOADING = "Opening the toy chests…";

const listChests = (groups: string[]) => {
  const names = groups.map((g) => CHESTS[g].name);
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1)}`;
};

export function promptSpeech(picture: string, groups: string[]): string {
  const name = PICTURES[picture].name;
  return `Listen... ${name}... ${name}. Which chest starts the same way as ${name}? ${listChests(groups)}?`;
}

const sameStart = (picture: string, group: string) => `${PICTURES[picture].name} and ${CHESTS[group].name} both start with ${CHESTS[group].sound}`;

export function correctSpeech(picture: string, group: string): string {
  return `Into the chest! ${sameStart(picture, group)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(picture: string, group: string): string {
  return `${REVEAL} ${sameStart(picture, group)}.`;
}

export const DONE = "The toy room is all tidy! You sorted every toy by its first sound!";

export const DONE_MISSED = "Good try! Keep listening for the first sound to find each toy's chest.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You put ${score} out of ${total} toys in the right chest.`;
}
