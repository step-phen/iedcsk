// Familiar events, their pictures and spoken lines for Picture Story Steps; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export interface Step {
  id: string;
  emoji: string;
  name: string;
}

// Each event's steps in the order they happen; which event a round uses comes from activity_questions.
export const EVENTS: Record<string, { title: string; steps: Step[] }> = {
  handwash: {
    title: "Let's wash our hands!",
    steps: [
      { id: "soap", emoji: "🧼", name: "rub on soap" },
      { id: "rinse", emoji: "🚰", name: "rinse with water" },
      { id: "dry", emoji: "🧻", name: "dry your hands" },
    ],
  },
  meal: {
    title: "Let's have lunch!",
    steps: [
      { id: "cook", emoji: "🍳", name: "cook the food" },
      { id: "eat", emoji: "🍽️", name: "eat the food" },
      { id: "wash", emoji: "🧽", name: "wash the dishes" },
    ],
  },
  bedtime: {
    title: "It's bedtime!",
    steps: [
      { id: "bath", emoji: "🛁", name: "take a bath" },
      { id: "read", emoji: "📖", name: "read a story" },
      { id: "sleep", emoji: "😴", name: "go to sleep" },
    ],
  },
  birthday: {
    title: "It's a birthday party!",
    steps: [
      { id: "sing", emoji: "🎶", name: "sing happy birthday" },
      { id: "blow", emoji: "🕯️", name: "blow out the candles" },
      { id: "cake", emoji: "🍰", name: "eat the cake" },
    ],
  },
  letter: {
    title: "Let's send a letter to Lola!",
    steps: [
      { id: "write", emoji: "✏️", name: "write the letter" },
      { id: "envelope", emoji: "✉️", name: "put it in an envelope" },
      { id: "mail", emoji: "📮", name: "drop it in the mailbox" },
    ],
  },
};

export const ORDER_WORDS = ["First", "Next", "Last"];

// Each clothespin is its own bright plastic color.
export const PEG_COLORS = ["#f06595", "#22b8cf", "#fcc419"];

export const INSTRUCTION = "Hang the pictures in order: first, next, last!";

export const LOADING = "Stringing up the clothesline…";

export function eventSpeech(event: string): string {
  return `${EVENTS[event].title} What do we do first, next and last? Hang the pictures in order.`;
}

const CHEERS = ["Yes!", "You got it!", "Great thinking!", "That's right!", "Wonderful!"];

export function correctSpeech(event: string, roundIndex: number): string {
  const [a, b, c] = EVENTS[event].steps;
  return `${CHEERS[roundIndex % CHEERS.length]} First, ${a.name}. Next, ${b.name}. Last, ${c.name}.`;
}

export const REVEAL = "This is the correct order!";

export function revealSpeech(event: string): string {
  const [a, b, c] = EVENTS[event].steps;
  return `${REVEAL} First, ${a.name}. Next, ${b.name}. Last, ${c.name}.`;
}

export const DONE = "All hung up! You put every event in order!";

export const DONE_MISSED = "Good work! Keep thinking about what we do first, next and last.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You put ${score} out of ${total} events in order.`;
}
