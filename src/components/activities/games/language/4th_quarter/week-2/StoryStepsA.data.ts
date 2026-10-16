// Stories, their pictures and spoken lines for Story Steps A; the shared greeting and intro stay in lib/speech-lines.ts.

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

// Each story's steps in the order they happen; which story a round tells comes from activity_questions.
export const STORIES: Record<string, Step[]> = {
  seed: [
    { id: "seed", emoji: "🫘", name: "planting a seed", line: "Lita planted a little seed." },
    { id: "sprout", emoji: "🌱", name: "a sprout", line: "A tiny green sprout came up." },
    { id: "flower", emoji: "🌻", name: "a sunflower", line: "It grew into a big sunflower!" },
  ],
  egg: [
    { id: "egg", emoji: "🥚", name: "an egg", line: "The hen laid an egg." },
    { id: "hatch", emoji: "🐣", name: "the egg cracking", line: "Crack! The egg broke open." },
    { id: "chick", emoji: "🐥", name: "a chick", line: "Out came a little yellow chick!" },
  ],
  rain: [
    { id: "cloud", emoji: "☁️", name: "dark clouds", line: "Dark clouds filled the sky." },
    { id: "rain", emoji: "🌧️", name: "rain", line: "Rain fell on the town." },
    { id: "rainbow", emoji: "🌈", name: "a rainbow", line: "Then a rainbow came out." },
  ],
  morning: [
    { id: "wake", emoji: "⏰", name: "waking up", line: "Ben woke up early." },
    { id: "brush", emoji: "🪥", name: "brushing teeth", line: "He brushed his teeth." },
    { id: "school", emoji: "🏫", name: "going to school", line: "Then he went to school." },
  ],
  mango: [
    { id: "pick", emoji: "🥭", name: "picking a mango", line: "Mia picked a ripe mango." },
    { id: "wash", emoji: "🚰", name: "washing the mango", line: "She washed it with water." },
    { id: "eat", emoji: "😋", name: "eating the mango", line: "She ate it. Yum!" },
  ],
};

export const FRAME_COLORS = ["#ef476f", "#118ab2", "#06d6a0"];

export const ORDER_WORDS = ["First", "Next", "Last"];

export const INSTRUCTION = "Listen, then put the pictures in order!";

export const LOADING = "Pinning up the story…";

export function storySpeech(story: string): string[] {
  return ["Listen to the story.", ...STORIES[story].map((s) => s.line), "Put the pictures in order: first, next, last."];
}

const CHEERS = ["Yes!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} That is the right order.`;
}

export const REVEAL = "This is the correct order!";

export function revealSpeech(story: string): string {
  const [a, b, c] = STORIES[story];
  return `${REVEAL} First, ${a.name}. Next, ${b.name}. Last, ${c.name}.`;
}

export const DONE = "Super storyteller! You put every story in order!";

export const DONE_MISSED = "Good work! Keep listening for what happens first, next and last.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You put ${score} out of ${total} stories in order.`;
}
