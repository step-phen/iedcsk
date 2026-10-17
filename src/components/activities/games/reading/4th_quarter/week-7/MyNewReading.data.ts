// Pictures and spoken lines for My New Reading; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Emoji stand in until drawn art is added; "name" is the word printed on the plate.
export const PICS: Record<string, { name: string; emoji: string }> = {
  ben: { name: "Ben", emoji: "👦" },
  pam: { name: "Pam", emoji: "👧" },
  dad: { name: "Dad", emoji: "👨" },
  box: { name: "box", emoji: "📦" },
  bag: { name: "bag", emoji: "👜" },
  tub: { name: "tub", emoji: "🛁" },
  cap: { name: "cap", emoji: "🧢" },
  cup: { name: "cup", emoji: "🥤" },
  pen: { name: "pen", emoji: "🖊️" },
  bed: { name: "bed", emoji: "🛏️" },
  van: { name: "van", emoji: "🚐" },
  hug: { name: "hugs", emoji: "🤗" },
  run: { name: "runs", emoji: "🏃" },
  sit: { name: "sits", emoji: "🪑" },
};

export const INSTRUCTION = "Read the new story, then answer!";

export function questionSpeech(question: string): string {
  return `Read the story. ${question}`;
}

const CHEERS = ["Yummy! That's right!", "Great reading!", "You found it in the story!", "Picnic perfect!", "Well done!"];

// Every answer lives in one sentence, so the line points the learner back to it.
export function correctSpeech(sentence: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The story says: ${sentence}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(sentence: string): string {
  return `${REVEAL_TEXT} The story says: ${sentence}`;
}

export const DONE = "Hooray! You read a brand new story all by yourself!";

export const DONE_MISSED = "Good work reading a new story! Read it again to find every answer.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You answered ${score} out of ${total} questions.`;
}
