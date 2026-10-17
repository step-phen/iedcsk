// Pictures, task labels and spoken lines for Language Review (Q4); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type Kind = "listen" | "match" | "order";

export const KINDS: Kind[] = ["listen", "match", "order"];

export const TASK_LABEL: Record<Kind, { icon: string; text: string }> = {
  listen: { icon: "🎧", text: "Listen" },
  match: { icon: "🔗", text: "Match" },
  order: { icon: "🔢", text: "Order" },
};

// Emoji stand in until drawn art is added; "said" is how the picture is named in speech.
export const PICS: Record<string, { said: string; emoji: string }> = {
  sun: { said: "sun", emoji: "☀️" },
  cat: { said: "cat", emoji: "🐱" },
  pig: { said: "pig", emoji: "🐷" },
  dog: { said: "dog", emoji: "🐶" },
  bed: { said: "bed", emoji: "🛏️" },
  cup: { said: "cup", emoji: "🥤" },
  baby: { said: "baby", emoji: "👶" },
  dad: { said: "dad", emoji: "👨" },
  grandma: { said: "grandma", emoji: "👵" },
  shoe: { said: "shoe", emoji: "👟" },
  cap: { said: "cap", emoji: "🧢" },
  glove: { said: "glove", emoji: "🧤" },
  elephant: { said: "elephant", emoji: "🐘" },
  mouse: { said: "mouse", emoji: "🐭" },
  frog: { said: "frog", emoji: "🐸" },
  run: { said: "running", emoji: "🏃" },
  swim: { said: "swimming", emoji: "🏊" },
  sleep: { said: "sleeping", emoji: "😴" },
  ball: { said: "ball", emoji: "⚽" },
  car: { said: "car", emoji: "🚗" },
  apple: { said: "apple", emoji: "🍎" },
  egg: { said: "the egg", emoji: "🥚" },
  chick: { said: "the chick", emoji: "🐥" },
  hen: { said: "the hen", emoji: "🐔" },
  seed: { said: "the seed", emoji: "🌰" },
  sprout: { said: "the sprout", emoji: "🌱" },
  flower: { said: "the flower", emoji: "🌻" },
  wake: { said: "wake up", emoji: "⏰" },
  dress: { said: "get dressed", emoji: "👕" },
  school: { said: "go to school", emoji: "🏫" },
};

// Seed packet colors so the three are easy to tell apart.
export const PACKET_TINTS = ["#fda4af", "#93c5fd", "#fcd34d"];

export const ORDER_WORDS = ["First", "Next", "Last"];

export const INSTRUCTION = "Listen, then tap the right seed packet!";

export const LOADING = "Opening the greenhouse…";

// Listen tasks also name the three pictures, since the learner hears the task rather than reads it.
export function promptSpeech(kind: Kind, prompt: string, choices: string[]): string {
  if (kind === "listen") return `${prompt} ${choices.map((c) => PICS[c].said).join(", ")}.`;
  return prompt;
}

export function orderLine(order: string[]): string {
  return order.map((id, i) => `${ORDER_WORDS[i]}, ${PICS[id].said}.`).join(" ");
}

const CHEERS = ["Yes!", "You got it!", "Blooming great!", "That's right!", "Wonderful!"];

export function correctSpeech(kind: Kind, answer: string[], roundIndex: number): string {
  const cheer = CHEERS[roundIndex % CHEERS.length];
  return kind === "order" ? `${cheer} ${orderLine(answer)}` : `${cheer} ${PICS[answer[0]].said}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(kind: Kind, answer: string[]): string {
  return kind === "order" ? `${REVEAL} ${orderLine(answer)}` : `${REVEAL} ${PICS[answer[0]].said}.`;
}

export const DONE = "Your garden is full of flowers! You got every task right!";

export const DONE_MISSED = "Good try! Your garden is growing. Keep listening and practicing.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You grew ${score} out of ${total} flowers.`;
}
