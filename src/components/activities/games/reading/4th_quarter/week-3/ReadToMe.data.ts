// Pictures and spoken lines for Read to Me; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Picture clue above each story line; emoji stand in until drawn art is added.
export const PICTURES: Record<string, string> = {
  dog: "🐶",
  run: "🏃",
  bed: "🛏️",
  cap: "🧢",
  hot: "☀️",
};

export const BLANK = "___";

// Owl models reading this line one word at a time before the learner reads.
export const DEMO_TEXT = "The cat sat on a mat.";

export const DEMO_START = "Watch me read! I point to each word as I read it.";

export const DEMO_END = "Now you read to me!";

export const INSTRUCTION = "Read the line, then tap the missing word!";

export const LISTEN = "Read this line of the story.";

export const QUESTION = "Which word goes in the blank?";

const CHEERS = ["Hoot hoot! You got it!", "Great reading!", "That's right!", "Wise reader!", "Well done!"];

export function correctSpeech(sentence: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${sentence}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(sentence: string): string {
  return `${REVEAL_TEXT} ${sentence}`;
}

export const DONE = "Hoot hoot! You read the whole story to me!";

export const DONE_MISSED = "Good reading! Keep reading every word in the line.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You read ${score} out of ${total} lines.`;
}
