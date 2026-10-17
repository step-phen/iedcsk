// Pictures and spoken lines for Reading Final Assessment (Q4); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type TaskType = "word" | "passage";

// Emoji stand in until drawn art is added; "said" is how the picture is named in speech.
export const PICS: Record<string, { said: string; emoji: string }> = {
  cat: { said: "cat", emoji: "🐱" },
  hat: { said: "hat", emoji: "🎩" },
  bat: { said: "bat", emoji: "🦇" },
  bag: { said: "bag", emoji: "👜" },
  bug: { said: "bug", emoji: "🐛" },
  bed: { said: "bed", emoji: "🛏️" },
  hen: { said: "hen", emoji: "🐔" },
  pen: { said: "pen", emoji: "🖊️" },
  ten: { said: "ten", emoji: "🔟" },
  box: { said: "box", emoji: "📦" },
  pig: { said: "pig", emoji: "🐷" },
  pin: { said: "pin", emoji: "📌" },
  six: { said: "six", emoji: "6️⃣" },
  sun: { said: "sun", emoji: "☀️" },
  fox: { said: "fox", emoji: "🦊" },
  dog: { said: "dog", emoji: "🐶" },
  log: { said: "log", emoji: "🪵" },
  bus: { said: "bus", emoji: "🚌" },
  nut: { said: "nut", emoji: "🥜" },
  net: { said: "net", emoji: "🥅" },
  cup: { said: "cup", emoji: "🥤" },
  cap: { said: "cap", emoji: "🧢" },
  pup: { said: "pup", emoji: "🐕" },
  boy: { said: "a boy", emoji: "👦" },
  girl: { said: "Meg, the girl", emoji: "👧" },
  man: { said: "a man", emoji: "👨" },
  egg: { said: "an egg", emoji: "🥚" },
  tub: { said: "a tub", emoji: "🛁" },
  van: { said: "a van", emoji: "🚐" },
};

export const INSTRUCTION = "Read, then tap the right medal!";

export function promptSpeech(type: TaskType, question: string | null): string {
  return type === "word" ? "Read the word. Tap its picture." : `Read the story. ${question ?? ""}`;
}

export function answerLine(type: TaskType, text: string, answer: string): string {
  return type === "word" ? `The word is ${text}.` : `The answer is ${PICS[answer].said}.`;
}

const CHEERS = ["Bravo!", "That's right!", "Take a bow!", "Wonderful reading!", "Superstar!"];

export function correctSpeech(line: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${line}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(line: string): string {
  return `${REVEAL_TEXT} ${line}`;
}

export const DONE = "Hooray! You are a reading superstar! You read every word and story just right!";

export const DONE_MISSED = "Great job finishing your reading test! Keep reading every day.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You got ${score} out of ${total} medals.`;
}
