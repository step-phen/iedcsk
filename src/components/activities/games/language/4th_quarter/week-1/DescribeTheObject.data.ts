// Objects, their describing sentences and spoken lines for Describe the Object; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which object a round shows and which sentences it offers come from activity_questions; emoji stand in until the picture art is added.
export const OBJECTS: Record<string, { name: string; emoji: string; description: string }> = {
  ball: { name: "ball", emoji: "⚽", description: "It is round. You can bounce it and kick it." },
  banana: { name: "banana", emoji: "🍌", description: "It is long and yellow. You peel it and eat it." },
  umbrella: { name: "umbrella", emoji: "☂️", description: "It keeps you dry when it rains." },
  toothbrush: { name: "toothbrush", emoji: "🪥", description: "You use it to brush your teeth." },
  chair: { name: "chair", emoji: "🪑", description: "It has four legs. You sit on it." },
  spoon: { name: "spoon", emoji: "🥄", description: "You use it to eat soup and rice." },
};

// One badge color per card, so each sentence has its own number to listen for.
export const BADGE_COLORS = ["#ff6b6b", "#4dabf7", "#ffa94d"];

export const INSTRUCTION = "Listen, then tap the sentence about the object!";

export const LOADING = "Opening the curtains…";

export function promptSpeech(target: string): string {
  return `Look! It is a ${OBJECTS[target].name}. Which sentence tells about the ${OBJECTS[target].name}? Listen.`;
}

export function choiceSpeech(index: number, object: string): string {
  return `Number ${index + 1}. ${OBJECTS[object].description}`;
}

const CHEERS = ["Yes!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(target: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} That tells about the ${OBJECTS[target].name}.`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} ${OBJECTS[target].description}`;
}

export const DONE = "Take a bow! You told about every object!";

export const DONE_MISSED = "Good show! Keep listening to the words that tell about things.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} objects.`;
}
