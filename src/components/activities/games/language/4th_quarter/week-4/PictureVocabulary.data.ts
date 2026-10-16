// People, things, their descriptions and spoken lines for Picture Vocabulary; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which picture a round describes and which windows it shows come from activity_questions.
export const PICTURES: Record<string, { name: string; emoji: string; description: string }> = {
  doctor: { name: "doctor", emoji: "👩‍⚕️", description: "She wears a white coat. She helps sick people get well." },
  teacher: { name: "teacher", emoji: "👩‍🏫", description: "She teaches children in school." },
  cook: { name: "cook", emoji: "🧑‍🍳", description: "He wears a tall white hat. He makes yummy food." },
  police: { name: "police officer", emoji: "👮", description: "He keeps our town safe." },
  grandpa: { name: "grandpa", emoji: "👴", description: "He is old. He has white hair and glasses." },
  baby: { name: "baby", emoji: "👶", description: "It is very small. It drinks milk and cries." },
  girl: { name: "girl", emoji: "👧", description: "She is a little girl with pigtails." },
  farmer: { name: "farmer", emoji: "👨‍🌾", description: "He grows rice and vegetables." },
  firetruck: { name: "fire truck", emoji: "🚒", description: "It is big and red. It has a ladder and puts out fires." },
  bus: { name: "bus", emoji: "🚌", description: "It is long. Many people ride in it." },
  bicycle: { name: "bicycle", emoji: "🚲", description: "It has two wheels. You pedal it." },
  airplane: { name: "airplane", emoji: "✈️", description: "It has wings. It flies people high in the sky." },
};

// One wall color per house, so each window is easy to point out.
export const HOUSE_COLORS = ["#ffa8a8", "#ffd43b", "#8ce99a", "#a5d8ff"];

export const INSTRUCTION = "Listen, then tap the window that matches!";

export const LOADING = "Walking down the street…";

export function promptSpeech(target: string): string {
  return `Listen. ${PICTURES[target].description} Who or what is it?`;
}

const CHEERS = ["Yes!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(target: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} It is the ${PICTURES[target].name}.`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} ${PICTURES[target].description} It is the ${PICTURES[target].name}.`;
}

export const DONE = "Good neighbor! You matched every picture!";

export const DONE_MISSED = "Nice try! Keep listening to the words that tell about people and things.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} pictures.`;
}
