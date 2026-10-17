// Scenes and spoken lines for Sentence Picture Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// A scene is "<who>-<what>" from activity_questions; emoji stand in until the scene art is added.
export const WHO: Record<string, { name: string; emoji: string }> = {
  cat: { name: "a cat", emoji: "🐱" },
  dog: { name: "a dog", emoji: "🐶" },
  fox: { name: "a fox", emoji: "🦊" },
  pig: { name: "a pig", emoji: "🐷" },
  hen: { name: "a hen", emoji: "🐔" },
  bug: { name: "a bug", emoji: "🐛" },
  bee: { name: "a bee", emoji: "🐝" },
  run: { name: "a running boy", emoji: "🏃" },
  nap: { name: "a sleeping boy", emoji: "😴" },
};

export const WHAT: Record<string, { name: string; emoji: string }> = {
  bed: { name: "a bed", emoji: "🛏️" },
  box: { name: "a box", emoji: "📦" },
  log: { name: "a log", emoji: "🪵" },
  tub: { name: "a tub", emoji: "🛁" },
  egg: { name: "an egg", emoji: "🥚" },
  hat: { name: "a hat", emoji: "🎩" },
  cup: { name: "a cup", emoji: "☕" },
  cat: { name: "a cat", emoji: "🐈" },
  dog: { name: "a dog", emoji: "🐕" },
};

export function sceneName(scene: string): string {
  const [who, what] = scene.split("-");
  return `${WHO[who].name} with ${WHAT[what].name}`;
}

export const INSTRUCTION = "Read the sentence, then tap the snow globe!";

export const LISTEN = "Read the sentence.";

export const QUESTION = "Which snow globe shows it?";

const CHEERS = ["Snowy and sweet! You got it!", "Great reading!", "That's right!", "Super reader!", "Well done!"];

export function correctSpeech(text: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${text}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(text: string): string {
  return `${REVEAL_TEXT} ${text}`;
}

export const DONE = "Wow! You matched every sentence to its snow globe!";

export const DONE_MISSED = "Good work! Read every word in the sentence.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} sentences.`;
}
