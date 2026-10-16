// Labels and spoken lines for Letters Around Me (Town Walk); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type Shape = "octagon" | "carton" | "bus" | "sign" | "box";

// Which label a round shows comes from activity_questions; each one is drawn as its sign or package.
export const LABELS: Record<string, { word: string; name: string; shape: Shape; bg: string; fg: string }> = {
  stop: { word: "STOP", name: "stop sign", shape: "octagon", bg: "#e03131", fg: "#ffffff" },
  milk: { word: "MILK", name: "milk box", shape: "carton", bg: "#e7f5ff", fg: "#1864ab" },
  bus: { word: "BUS", name: "bus", shape: "bus", bg: "#fab005", fg: "#212529" },
  exit: { word: "EXIT", name: "exit sign", shape: "sign", bg: "#2b8a3e", fg: "#ffffff" },
  juice: { word: "JUICE", name: "juice box", shape: "box", bg: "#ff922b", fg: "#ffffff" },
};

export const INSTRUCTION = "Listen, then tap that letter on the label!";

export const LOADING = "Walking to town…";

export function promptSpeech(label: string, target: string): string {
  return `Look at the ${LABELS[label].name}. Find the letter ${target}.`;
}

export function correctSpeech(target: string): string {
  return `You found it! That is the letter ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is the letter ${target}.`;
}

export const DONE = "Wow! You can find letters all around you!";

export const DONE_MISSED = "Good try! Keep looking for letters around you.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
