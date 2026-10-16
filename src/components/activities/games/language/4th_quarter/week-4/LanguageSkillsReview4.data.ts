// Pictures, stories and spoken lines for Language Skills Review 4; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// rime is the ending two names share when they rhyme (set only where a rhyme round can use it); clue is read in describe rounds. Which pictures a round uses come from activity_questions.
export const PICTURES: Record<string, { name: string; emoji: string; rime?: string; clue?: string }> = {
  rabbit: { name: "rabbit", emoji: "🐰", clue: "It has long ears and a fluffy tail. It hops." },
  frog: { name: "frog", emoji: "🐸", rime: "og" },
  duck: { name: "duck", emoji: "🦆", rime: "uck" },
  umbrella: { name: "umbrella", emoji: "☂️", clue: "It keeps you dry when it rains." },
  hat: { name: "hat", emoji: "🎩", rime: "at" },
  clock: { name: "clock", emoji: "🕰️", clue: "It tells the time. It goes tick, tock." },
  grandma: { name: "grandma", emoji: "👵", clue: "She is Papa's mother. She has gray hair and gives warm hugs." },
  baby: { name: "baby", emoji: "👶" },
  girl: { name: "girl", emoji: "👧" },
  star: { name: "star", emoji: "⭐", rime: "ar" },
  car: { name: "car", emoji: "🚗", rime: "ar" },
  pig: { name: "pig", emoji: "🐷", rime: "ig" },
  egg: { name: "egg", emoji: "🥚", rime: "eg" },
  mouse: { name: "mouse", emoji: "🐭", rime: "ouse" },
  house: { name: "house", emoji: "🏠", rime: "ouse" },
  sun: { name: "sun", emoji: "☀️", rime: "un" },
  bed: { name: "bed", emoji: "🛏️", rime: "ed" },
  ball: { name: "ball", emoji: "⚽", rime: "all" },
  book: { name: "book", emoji: "📖", rime: "ook" },
  cup: { name: "cup", emoji: "☕", rime: "up" },
  apple: { name: "apple", emoji: "🍎" },
  banana: { name: "banana", emoji: "🍌" },
  dog: { name: "dog", emoji: "🐶", rime: "og" },
  cat: { name: "cat", emoji: "🐱", rime: "at" },
  hatch: { name: "the egg cracking", emoji: "🐣" },
  chick: { name: "the chick", emoji: "🐥" },
  make: { name: "making a kite", emoji: "✂️" },
  wind: { name: "the wind", emoji: "🌬️" },
  fly: { name: "the kite flying", emoji: "🪁" },
};

// Each story's pictures in the order they happen, with the line told for each.
export const STORIES: Record<string, { step: string; line: string }[]> = {
  egg: [
    { step: "egg", line: "The hen laid an egg." },
    { step: "hatch", line: "Crack! The egg broke open." },
    { step: "chick", line: "Out came a little chick!" },
  ],
  kite: [
    { step: "make", line: "Tito made a kite with paper and sticks." },
    { step: "wind", line: "The wind began to blow." },
    { step: "fly", line: "Up, up, his kite flew high!" },
  ],
};

export type Kind = "describe" | "rhyme" | "story" | "direction";

// The station sign over the track names the kind of task.
export const KIND_SIGNS: Record<Kind, { label: string; emoji: string }> = {
  describe: { label: "Who or what?", emoji: "🔎" },
  rhyme: { label: "Rhyme time", emoji: "🎵" },
  story: { label: "Story order", emoji: "📚" },
  direction: { label: "Do it!", emoji: "👉" },
};

export const CAR_COLORS = ["#4dabf7", "#ff922b", "#51cf66", "#f06595"];

export const INSTRUCTION = "Listen, then tap the train cars!";

export const LOADING = "All aboard…";

export function promptLines(round: { kind: Kind; target?: string; word?: string; story?: string; steps: string[] }): string[] {
  switch (round.kind) {
    case "describe":
      return [`Listen. ${PICTURES[round.target!].clue} Who or what is it?`];
    case "rhyme":
      return [`${PICTURES[round.word!].name}. Which one rhymes with ${PICTURES[round.word!].name}?`];
    case "story":
      return ["Listen to the story.", ...STORIES[round.story!].map((s) => s.line), "Tap the pictures in order: first, next, last."];
    case "direction":
      return [directionText(round.steps)];
  }
}

export function directionText(steps: string[]): string {
  return steps.map((s, i) => `${i === 0 ? "Tap the" : "then tap the"} ${PICTURES[s].name}`).join(", ") + ".";
}

function explain(round: { kind: Kind; target?: string; word?: string; story?: string; steps: string[] }): string {
  switch (round.kind) {
    case "describe":
      return `It is the ${PICTURES[round.target!].name}.`;
    case "rhyme":
      return `${PICTURES[round.word!].name} and ${PICTURES[round.steps[0]].name} rhyme.`;
    case "story": {
      const [a, b, c] = STORIES[round.story!].map((s) => PICTURES[s.step].name);
      return `First, ${a}. Next, ${b}. Last, ${c}.`;
    }
    case "direction":
      return directionText(round.steps);
  }
}

const CHEERS = ["Toot toot!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(round: Parameters<typeof explain>[0], roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${explain(round)}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(round: Parameters<typeof explain>[0]): string {
  return `${REVEAL} ${explain(round)}`;
}

export const DONE = "Last stop! You finished the whole review like a champion!";

export const DONE_MISSED = "Last stop! Good riding. Keep listening to stories, rhymes and directions.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You got ${score} out of ${total} stations right.`;
}
