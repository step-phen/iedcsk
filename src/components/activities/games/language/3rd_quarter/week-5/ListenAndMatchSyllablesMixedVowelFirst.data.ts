// Syllable sounds and spoken lines for Listen and Match Syllables: mixed (vowel first) (Parol Night); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each taught syllable is written for the speech voice, so it says "aht" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  am: "ahm", as: "ahs", ab: "ahb", at: "aht", al: "ahl",
  em: "ehm", es: "ehs", eb: "ehb", et: "eht", el: "ehl",
  im: "eem", is: "ees", ib: "eeb", it: "eet", il: "eel",
  om: "ohm", os: "ohs", ob: "ohb", ot: "oht", ol: "ohl",
  um: "oom", us: "oos", ub: "oob", ut: "oot", ul: "ool",
};

// Paper colors per parol, so the three lanterns never look alike.
export const PAROL_COLORS = ["#fa5252", "#40c057", "#4dabf7"];

export const INSTRUCTION = "Listen, then light the parol that says it!";

export const LOADING = "Hanging up the parols…";

/** Only heard, never shown, so the child has to listen for the vowel at the start. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which parol says ${SOUNDS[syllable]}?`;
}

// A lone capital "A" is read as the word "uh", so the letter a is spelled the way its name sounds.
const letterName = (letter: string) => (letter === "a" ? "Ay" : letter.toUpperCase());

const blend = (syllable: string) => `${letterName(syllable[0])} and ${letterName(syllable[1])} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `It's glowing! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "The whole street is glowing! You lit every parol!";

export const DONE_MISSED = "Good try! Keep listening for the vowel at the start: ah, eh, ee, oh, oo.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You lit ${score} out of ${total} parols.`;
}
