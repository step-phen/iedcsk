// Actions, their sentences and spoken lines for What Is Happening?; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which action a round tells about and which screens it shows come from activity_questions.
export const ACTIONS: Record<string, { name: string; emoji: string; sentence: string }> = {
  run: { name: "running", emoji: "🏃", sentence: "The boy is running fast." },
  swim: { name: "swimming", emoji: "🏊", sentence: "The girl is swimming in the pool." },
  sleep: { name: "sleeping", emoji: "🛌", sentence: "He is sleeping in his bed." },
  dance: { name: "dancing", emoji: "💃", sentence: "She is dancing to the music." },
  climb: { name: "climbing", emoji: "🧗", sentence: "He is climbing up the wall." },
  ride: { name: "riding a bike", emoji: "🚴", sentence: "She is riding a bike." },
  paint: { name: "painting", emoji: "🧑‍🎨", sentence: "He is painting a picture." },
  sing: { name: "singing", emoji: "🧑‍🎤", sentence: "She is singing a song." },
};

// Each scoreboard screen has its own frame color.
export const SCREEN_COLORS = ["#ff6b6b", "#4dabf7", "#ffd43b"];

export const INSTRUCTION = "Listen, then tap the screen that shows it!";

export const LOADING = "Turning on the big screens…";

export function promptSpeech(target: string): string {
  return `Listen. ${ACTIONS[target].sentence} Which picture shows it?`;
}

const CHEERS = ["Goal!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(target: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} That picture shows ${ACTIONS[target].name}.`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} ${ACTIONS[target].sentence}`;
}

export const DONE = "Gold medal! You matched every action!";

export const DONE_MISSED = "Good game! Keep listening for the action word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} actions.`;
}
