// Books and spoken lines for Book Parts Hunt; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which book a round shows and which part it asks for come from activity_questions; covers are drawn in CSS with emoji art.
export const BOOKS: Record<string, { title: string; emoji: string; cover: string }> = {
  fox: { title: "Fox in a Box", emoji: "🦊", cover: "#f97316" },
  sun: { title: "The Big Sun", emoji: "☀️", cover: "#0ea5e9" },
  bug: { title: "Bug on a Rug", emoji: "🐛", cover: "#22c55e" },
  hen: { title: "The Red Hen", emoji: "🐔", cover: "#ef4444" },
  cat: { title: "The Fat Cat", emoji: "🐱", cover: "#8b5cf6" },
};

export const PARTS: Record<string, { name: string }> = {
  "front-cover": { name: "front cover" },
  title: { name: "title" },
  pages: { name: "pages" },
};

export function instruction(part: string): string {
  return `Tap the ${PARTS[part].name}!`;
}

export function askLine(part: string): string {
  return `Here is a book. Can you tap the ${PARTS[part].name}?`;
}

const CHEERS = ["Yes! You found it!", "Great looking!", "That's right!", "Super book finder!", "Well done!"];

const PART_FACTS: Record<string, string> = {
  "front-cover": "The front cover is the outside of the book.",
  title: "The title is the name of the book.",
  pages: "The pages are inside the book. They hold the words and pictures.",
};

export function correctSpeech(part: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${PART_FACTS[part]}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(part: string): string {
  return `${REVEAL_TEXT} ${PART_FACTS[part]}`;
}

export const DONE = "Hooray! You know every part of a book!";

export const DONE_MISSED = "Good looking! Keep finding the cover, title, and pages.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} book parts.`;
}
