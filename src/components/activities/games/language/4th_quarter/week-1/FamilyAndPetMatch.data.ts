// Family and pet pictures, their spoken descriptions and lines for Family and Pet Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Who a round describes and which pictures hang on the wall come from activity_questions; emoji stand in until the picture art is added.
export const MEMBERS: Record<string, { name: string; emoji: string; description: string }> = {
  mother: { name: "mother", emoji: "👩", description: "Find the mother. She is your mom. She takes care of you." },
  father: { name: "father", emoji: "👨", description: "Find the father. He is your dad. He takes care of you too." },
  grandmother: { name: "grandmother", emoji: "👵", description: "Find the grandmother. She is your lola, the mother of your mom or dad." },
  grandfather: { name: "grandfather", emoji: "👴", description: "Find the grandfather. He is your lolo, the father of your mom or dad." },
  baby: { name: "baby", emoji: "👶", description: "Find the baby. The baby is very small and drinks milk." },
  sister: { name: "sister", emoji: "👧", description: "Find the sister. She is a girl in your family." },
  brother: { name: "brother", emoji: "👦", description: "Find the brother. He is a boy in your family." },
  dog: { name: "dog", emoji: "🐶", description: "Find the dog. It is a pet that says woof, woof!" },
  cat: { name: "cat", emoji: "🐱", description: "Find the cat. It is a pet that says meow!" },
  fish: { name: "fish", emoji: "🐟", description: "Find the fish. It is a pet that swims in water." },
  bird: { name: "bird", emoji: "🐦", description: "Find the bird. It is a pet that can fly and sing." },
};

// One frame and mat color per spot, so the right picture is never told apart by color.
export const FRAME_STYLES = [
  { frame: "#c08040", mat: "#fde2e4" },
  { frame: "#e0b040", mat: "#e2f0fb" },
  { frame: "#8d6e63", mat: "#e6f4d9" },
];

export const INSTRUCTION = "Listen, then tap the picture!";

export const LOADING = "Hanging up the pictures…";

export function promptSpeech(target: string): string {
  return MEMBERS[target].description;
}

const CHEERS = ["Yes!", "You found them!", "Great listening!", "That's right!", "Hooray!"];

export function correctSpeech(target: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} This is the ${MEMBERS[target].name}.`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is the ${MEMBERS[target].name}.`;
}

export const DONE = "What a happy home! You found every family member and pet!";

export const DONE_MISSED = "Good try! Keep learning the names of your family and pets.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} pictures.`;
}
