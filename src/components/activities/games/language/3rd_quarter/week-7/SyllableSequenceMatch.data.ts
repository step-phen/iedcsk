// Syllable sounds and spoken lines for Syllable Sequence Match (Domino Picnic); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each taught syllable is written for the speech voice, so it says "mah" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  ma: "mah", me: "meh", mi: "mee", mo: "moh", mu: "moo",
  sa: "sah", se: "seh", si: "see", so: "soh", su: "soo",
  ba: "bah", be: "beh", bi: "bee", bo: "boh", bu: "boo",
  ta: "tah", te: "teh", ti: "tee", to: "toh", tu: "too",
  la: "lah", le: "leh", li: "lee", lo: "loh", lu: "loo",
  am: "ahm", as: "ahs", ab: "ahb", at: "aht", al: "ahl",
  em: "ehm", es: "ehs", eb: "ehb", et: "eht", el: "ehl",
  im: "eem", is: "ees", ib: "eeb", it: "eet", il: "eel",
  om: "ohm", os: "ohs", ob: "ohb", ot: "oht", ol: "ohl",
  um: "oom", us: "oos", ub: "oob", ut: "oot", ul: "ool",
};

export const INSTRUCTION = "Listen to the two sounds, then tap the domino in the same order!";

export const LOADING = "Setting out the dominoes…";

const said = (sequence: string[]) => sequence.map((s) => SOUNDS[s]).join("... then... ");

/** Only heard, never shown, so the child has to hold both sounds in order. */
export function promptSpeech(sequence: string[]): string {
  return `Listen... ${said(sequence)}. Again... ${said(sequence)}. Which domino says them in that order?`;
}

const inOrder = (sequence: string[]) => `First ${SOUNDS[sequence[0]]}, then ${SOUNDS[sequence[1]]}`;

export function correctSpeech(sequence: string[]): string {
  return `Clack! ${inOrder(sequence)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(sequence: string[]): string {
  return `${REVEAL} ${inOrder(sequence)}.`;
}

export const DONE = "What a domino line! You matched every sound order!";

export const DONE_MISSED = "Good try! Listen for which sound comes first and which comes next.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} dominoes.`;
}
