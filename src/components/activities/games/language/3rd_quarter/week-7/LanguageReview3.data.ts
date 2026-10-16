// Tasks, sounds, pictures and spoken lines for Language Review 3 (Balloon Festival); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type Task = "syllable" | "sequence" | "first-sound" | "last-sound" | "first-letter" | "last-letter";

export const TASKS: Task[] = ["syllable", "sequence", "first-sound", "last-sound", "first-letter", "last-letter"];

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

// `first` and `last` are how the speech voice says the word's first and last sounds; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; first: string; last: string }> = {
  bed: { name: "bed", emoji: "🛏️", first: "buh", last: "duh" },
  bus: { name: "bus", emoji: "🚌", first: "buh", last: "sss" },
  cat: { name: "cat", emoji: "🐱", first: "kuh", last: "tuh" },
  cup: { name: "cup", emoji: "☕", first: "kuh", last: "puh" },
  dog: { name: "dog", emoji: "🐶", first: "duh", last: "guh" },
  fish: { name: "fish", emoji: "🐟", first: "fff", last: "shh" },
  hat: { name: "hat", emoji: "🎩", first: "hhh", last: "tuh" },
  house: { name: "house", emoji: "🏠", first: "hhh", last: "sss" },
  mango: { name: "mango", emoji: "🥭", first: "mmm", last: "oh" },
  moon: { name: "moon", emoji: "🌙", first: "mmm", last: "nnn" },
  pig: { name: "pig", emoji: "🐷", first: "puh", last: "guh" },
  sock: { name: "sock", emoji: "🧦", first: "sss", last: "kuh" },
  sun: { name: "sun", emoji: "☀️", first: "sss", last: "nnn" },
  tree: { name: "tree", emoji: "🌳", first: "tuh", last: "ee" },
};

// How the speech voice says each letter's sound, so it says the sound and not the letter name.
export const LETTER_SOUNDS: Record<string, string> = {
  b: "buh", d: "duh", g: "guh", m: "mmm", n: "nnn", p: "puh", s: "sss", t: "tuh",
};

// Balloon colors per spot, so the right balloon is never told apart by color.
export const BALLOON_COLORS = ["#ff6b6b", "#4dabf7", "#ffd43b"];

export const LOADING = "Filling the balloons…";

/** The short line on the instruction pill for each kind of task. */
export function instruction(task: Task): string {
  switch (task) {
    case "syllable":
      return "Listen, then tap the balloon that says it!";
    case "sequence":
      return "Listen, then tap the two sounds in the same order!";
    case "first-sound":
      return "Tap the picture that starts the same way!";
    case "last-sound":
      return "Tap the picture that ends the same way!";
    case "first-letter":
      return "Tap the letter for the first sound!";
    case "last-letter":
      return "Tap the letter for the last sound!";
  }
}

const listNames = (keys: string[]) => {
  const names = keys.map((k) => WORDS[k].name);
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1)}`;
};

const said = (sequence: string) => sequence.split("-").map((s) => SOUNDS[s]).join("... then... ");

export function promptSpeech(task: Task, target: string, choices: string[]): string {
  switch (task) {
    case "syllable":
      return `Listen... ${SOUNDS[target]}... ${SOUNDS[target]}. Which balloon says ${SOUNDS[target]}?`;
    case "sequence":
      return `Listen... ${said(target)}. Which balloon says them in that order?`;
    case "first-sound":
      return `Listen... ${WORDS[target].name}. Which picture starts with the same sound as ${WORDS[target].name}? ${listNames(choices)}?`;
    case "last-sound":
      return `Listen... ${WORDS[target].name}. Which picture ends with the same sound as ${WORDS[target].name}? ${listNames(choices)}?`;
    case "first-letter":
      return `Look, a ${WORDS[target].name}. Which letter makes the first sound in ${WORDS[target].name}?`;
    case "last-letter":
      return `Look, a ${WORDS[target].name}. Which letter makes the last sound in ${WORDS[target].name}?`;
  }
}

// A lone capital "A" is read as the word "uh", so the letter a is spelled the way its name sounds.
const letterName = (letter: string) => (letter === "a" ? "Ay" : letter.toUpperCase());

function explain(task: Task, target: string, answer: string): string {
  switch (task) {
    case "syllable":
      return `${letterName(answer[0])} and ${letterName(answer[1])} make ${SOUNDS[answer]}`;
    case "sequence": {
      const [a, b] = answer.split("-");
      return `First ${SOUNDS[a]}, then ${SOUNDS[b]}`;
    }
    case "first-sound":
      return `${WORDS[target].name} and ${WORDS[answer].name} both start with ${WORDS[target].first}`;
    case "last-sound":
      return `${WORDS[target].name} and ${WORDS[answer].name} both end with ${WORDS[target].last}`;
    case "first-letter":
      return `${WORDS[target].name} starts with ${LETTER_SOUNDS[answer]}`;
    case "last-letter":
      return `${WORDS[target].name} ends with ${LETTER_SOUNDS[answer]}`;
  }
}

export function correctSpeech(task: Task, target: string, answer: string): string {
  return `Up, up, and away! ${explain(task, target, answer)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(task: Task, target: string, answer: string): string {
  return `${REVEAL} ${explain(task, target, answer)}.`;
}

export const DONE = "The whole sky is full of balloons! You got every review question!";

export const DONE_MISSED = "Good try! Keep listening to syllables and to the first and last sounds in words.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You launched ${score} out of ${total} balloons.`;
}
