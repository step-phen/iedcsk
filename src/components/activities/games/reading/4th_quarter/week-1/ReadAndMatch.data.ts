// Pictures and spoken lines for Read and Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// A postcard choice is "<who>-<where>" from activity_questions; emoji stand in until the picture art is added.
export const WHO: Record<string, { name: string; emoji: string }> = {
  cat: { name: "cat", emoji: "🐱" },
  dog: { name: "dog", emoji: "🐶" },
  bug: { name: "bug", emoji: "🐛" },
  fox: { name: "fox", emoji: "🦊" },
  hen: { name: "hen", emoji: "🐔" },
  pig: { name: "pig", emoji: "🐷" },
};

// "in" places tuck the animal behind the front of the picture; "on" places sit it on top.
export const WHERE: Record<string, { name: string; emoji: string; inside: boolean }> = {
  box: { name: "box", emoji: "📦", inside: true },
  tub: { name: "tub", emoji: "🛁", inside: true },
  bed: { name: "bed", emoji: "🛏️", inside: false },
  cup: { name: "cup", emoji: "☕", inside: false },
  hat: { name: "hat", emoji: "🎩", inside: false },
  log: { name: "log", emoji: "🪵", inside: false },
  bus: { name: "bus", emoji: "🚌", inside: false },
};

export function sceneName(scene: string): string {
  const [who, where] = scene.split("-");
  return `a ${WHO[who].name} ${WHERE[where].inside ? "in" : "on"} a ${WHERE[where].name}`;
}

export const INSTRUCTION = "Read the letter, then tap the postcard!";

export const LISTEN = "A new letter came in the mail! Read it.";

export const QUESTION = "Which postcard shows what the letter says?";

const CHEERS = ["Special delivery! You got it!", "Great reading!", "That's right!", "Super reader!", "Well done!"];

export function correctSpeech(text: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${text}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(text: string): string {
  return `${REVEAL_TEXT} ${text}`;
}

export const DONE = "Wow! You read every letter and matched every postcard!";

export const DONE_MISSED = "Good work! Keep reading every word carefully.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} postcards.`;
}
