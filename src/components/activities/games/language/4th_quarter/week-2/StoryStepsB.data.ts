// Stories, their pictures and spoken lines for Story Steps B; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export interface Step {
  id: string;
  emoji: string;
  name: string;
  line: string;
}

// Each story's three events in the order they happen; which story a round tells and what it asks come from activity_questions.
export const STORIES: Record<string, Step[]> = {
  fishing: [
    { id: "cast", emoji: "🎣", name: "throwing the fishing line", line: "Papa threw his fishing line into the river." },
    { id: "fish", emoji: "🐟", name: "catching a fish", line: "He caught a big fish!" },
    { id: "cook", emoji: "🍳", name: "cooking the fish", line: "They cooked the fish for lunch." },
  ],
  sandcastle: [
    { id: "pail", emoji: "🪣", name: "filling the pail with sand", line: "Ana filled her pail with sand." },
    { id: "castle", emoji: "🏰", name: "building a sandcastle", line: "She built a tall sandcastle." },
    { id: "wave", emoji: "🌊", name: "the big wave", line: "Then a big wave washed it away!" },
  ],
  icecream: [
    { id: "buy", emoji: "🍦", name: "buying ice cream", line: "Leo bought an ice cream." },
    { id: "sun", emoji: "☀️", name: "the hot sun", line: "The sun was very hot." },
    { id: "melt", emoji: "💧", name: "the ice cream melting", line: "Drip, drip! His ice cream melted." },
  ],
  puppy: [
    { id: "hungry", emoji: "🐶", name: "the hungry puppy", line: "Bantay the puppy was hungry." },
    { id: "food", emoji: "🦴", name: "getting food", line: "Mama gave him some food." },
    { id: "nap", emoji: "😴", name: "taking a nap", line: "Then he took a long nap." },
  ],
  kite: [
    { id: "make", emoji: "✂️", name: "making a kite", line: "Tito made a kite with paper and sticks." },
    { id: "wind", emoji: "🌬️", name: "the strong wind", line: "The wind began to blow." },
    { id: "fly", emoji: "🪁", name: "the kite flying", line: "Up, up, his kite flew high!" },
  ],
};

export const ASKS = ["first", "next", "last"] as const;
export type Ask = (typeof ASKS)[number];

// Each stone is painted its own color so the three pictures are easy to tell apart.
export const STONE_COLORS = ["#ffd8a8", "#d0bfff", "#b2f2bb"];

export const INSTRUCTION = "Listen to the story, then answer!";

export const LOADING = "Lighting the campfire…";

export function questionText(ask: Ask): string {
  return `What happened ${ask}?`;
}

export function storySpeech(story: string, ask: Ask): string[] {
  return ["Listen to the story.", ...STORIES[story].map((s) => s.line), questionText(ask)];
}

const CHEERS = ["Yes!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(step: Step, ask: Ask, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${ask[0].toUpperCase()}${ask.slice(1)}: ${step.line}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(step: Step, ask: Ask): string {
  return `${REVEAL} ${ask[0].toUpperCase()}${ask.slice(1)}: ${step.line}`;
}

export const DONE = "Campfire champion! You remembered every story!";

export const DONE_MISSED = "Good listening! Keep thinking about what happens first, next and last.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You answered ${score} out of ${total} story questions.`;
}
