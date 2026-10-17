// Characters, settings and spoken lines for Who and Where?; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// "said" is how the character is named in speech; emoji stand in until drawn art is added.
export const WHO: Record<string, { name: string; said: string; emoji: string }> = {
  cat: { name: "cat", said: "the cat", emoji: "🐱" },
  dog: { name: "dog", said: "the dog", emoji: "🐶" },
  pig: { name: "pig", said: "the pig", emoji: "🐷" },
  hen: { name: "hen", said: "the hen", emoji: "🐔" },
  fox: { name: "fox", said: "the fox", emoji: "🦊" },
  bug: { name: "bug", said: "the bug", emoji: "🐛" },
  ben: { name: "Ben", said: "Ben", emoji: "👦" },
  pam: { name: "Pam", said: "Pam", emoji: "👧" },
  dad: { name: "Dad", said: "Dad", emoji: "👨" },
};

// "at" is the place with its little linking word, for the answer line.
export const WHERE: Record<string, { name: string; at: string; emoji: string; sky: string; ground: string }> = {
  park: { name: "park", at: "in the park", emoji: "🌳", sky: "#bae6fd", ground: "#86efac" },
  beach: { name: "beach", at: "at the beach", emoji: "🏖️", sky: "#7dd3fc", ground: "#fde68a" },
  school: { name: "school", at: "at school", emoji: "🏫", sky: "#e0f2fe", ground: "#d6d3d1" },
  farm: { name: "farm", at: "on the farm", emoji: "🚜", sky: "#fef3c7", ground: "#bef264" },
  woods: { name: "woods", at: "in the woods", emoji: "🌲", sky: "#a7f3d0", ground: "#4d7c0f" },
  home: { name: "home", at: "at home", emoji: "🏠", sky: "#fce7f3", ground: "#fdba74" },
};

export const INSTRUCTION = "Read the story, then build it in the box!";

export const QUESTION = "Read the story. Who is in the story? Where does it happen?";

export function answerLine(who: string, where: string): string {
  const said = WHO[who].said;
  return `It is ${said} ${WHERE[where].at}.`;
}

const CHEERS = ["Ta-da! What a scene!", "Great reading!", "That's right!", "Super story builder!", "Well done!"];

export function correctSpeech(line: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${line}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(line: string): string {
  return `${REVEAL_TEXT} ${line}`;
}

export const DONE = "Hooray! You found who and where in every story!";

export const DONE_MISSED = "Good work! Read the story again to find who and where.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You built ${score} out of ${total} stories.`;
}
