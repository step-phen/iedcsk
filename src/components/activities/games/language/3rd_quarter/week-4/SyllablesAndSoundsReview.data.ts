// Tasks, pictures, sounds and spoken lines for the Q3 Language Review (Board Game); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// "syllable": hear a syllable, tap its written form. "first-letter": see a picture, tap the letter it starts with.
// "first-sound": hear a word, tap the picture that starts with the same sound.
export type Task = "syllable" | "first-letter" | "first-sound";

export const TASKS: Task[] = ["syllable", "first-letter", "first-sound"];

// How each taught syllable is written for the speech voice, so it is said as a sound and not a word.
export const SOUNDS: Record<string, string> = {
  ma: "mah", sa: "sah", ba: "bah", ta: "tah", la: "lah",
  mo: "moh", so: "soh", bo: "boh", to: "toh", lo: "loh",
  am: "ahm", as: "ahs", ab: "ahb", at: "aht", al: "ahl",
  um: "oom", us: "oos", ub: "oob", ut: "oot", ul: "ool",
};

// Emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  ball: { name: "ball", emoji: "⚽" },
  banana: { name: "banana", emoji: "🍌" },
  cat: { name: "cat", emoji: "🐱" },
  dog: { name: "dog", emoji: "🐶" },
  fish: { name: "fish", emoji: "🐟" },
  leaf: { name: "leaf", emoji: "🍃" },
  lion: { name: "lion", emoji: "🦁" },
  mango: { name: "mango", emoji: "🥭" },
  moon: { name: "moon", emoji: "🌙" },
  sock: { name: "sock", emoji: "🧦" },
  sun: { name: "sun", emoji: "☀️" },
  tiger: { name: "tiger", emoji: "🐯" },
  tree: { name: "tree", emoji: "🌳" },
};

const FIRST_SOUNDS: Record<string, string> = {
  b: "buh",
  c: "kuh",
  d: "duh",
  f: "fff",
  l: "lll",
  m: "mmm",
  p: "puh",
  s: "sss",
  t: "tuh",
};

export const LOADING = "Setting up the game board…";

/** The task card text; syllables and words are only heard, so the screen never says them. */
export function instruction(task: Task): string {
  if (task === "syllable") return "Tap the syllable you hear!";
  if (task === "first-letter") return "Which letter does this picture start with?";
  return "Tap the picture that starts the same way!";
}

const listNames = (keys: string[]) => {
  const names = keys.map((k) => WORDS[k].name);
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1)}`;
};

export function promptSpeech(task: Task, target: string, choices: string[]): string {
  if (task === "syllable") return `Listen... ${SOUNDS[target]}... ${SOUNDS[target]}. Which one says ${SOUNDS[target]}?`;
  if (task === "first-letter") return `This is a ${WORDS[target].name}. What letter does ${WORDS[target].name} start with?`;
  const name = WORDS[target].name;
  return `Listen... ${name}. Which picture starts with the same sound as ${name}? ${listNames(choices)}?`;
}

/** What a choice is called out loud, for its button label. */
export function choiceName(task: Task, choice: string): string {
  if (task === "first-sound") return WORDS[choice].name;
  return task === "syllable" ? `syllable ${choice}` : `letter ${choice}`;
}

// A lone capital "A" is read as the word "uh", so the letter a is spelled the way its name sounds.
const letterName = (letter: string) => (letter === "a" ? "Ay" : letter.toUpperCase());

function explain(task: Task, target: string, answer: string): string {
  if (task === "syllable") return `${letterName(answer[0])} and ${letterName(answer[1])} make ${SOUNDS[answer]}`;
  if (task === "first-letter") return `${WORDS[target].name} starts with ${answer.toUpperCase()}`;
  return `${WORDS[target].name} and ${WORDS[answer].name} both start with ${FIRST_SOUNDS[target[0]] ?? target[0]}`;
}

export function correctSpeech(task: Task, target: string, answer: string): string {
  return `Hop forward! ${explain(task, target, answer)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(task: Task, target: string, answer: string): string {
  return `${REVEAL} ${explain(task, target, answer)}.`;
}

export const DONE = "You reached the finish! You know your syllables and sounds!";

export const DONE_MISSED = "Good try! Let's keep practicing syllables and first sounds.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You got ${score} out of ${total} right.`;
}
