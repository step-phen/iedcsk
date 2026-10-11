// Answer cards, task wording and spoken lines for Reading Review (Reading Final Exam reuses the cards and wording); the shared greeting and intro stay in lib/speech-lines.ts.

const PICS = "/images/activities/vowel-review/items";
const SHAPE_ART = "/images/activities/shape";
const ART = "/images/activities/reading-review";

export const ASSETS = {
  stone: `${ART}/stone.webp`,
  stoneGold: `${ART}/stone-gold.webp`,
  flag: `${ART}/flag.webp`,
};

export type TaskType = "same" | "different" | "long" | "big" | "small" | "shape" | "letter" | "partner" | "vowel";

export const TASK_TYPES: TaskType[] = ["same", "different", "long", "big", "small", "shape", "letter", "partner", "vowel"];

// Keyed by the seeder's choice ids; single characters are letters and need no entry. An item with `emoji` instead of `image` shows the emoji.
export const ITEMS: Record<string, { name: string; image?: string; emoji?: string }> = {
  ant: { name: "Ant", image: `${PICS}/ant.webp` },
  apple: { name: "Apple", image: `${PICS}/apple.webp` },
  egg: { name: "Egg", image: `${PICS}/egg.webp` },
  elephant: { name: "Elephant", image: `${PICS}/elephant.webp` },
  insect: { name: "Insect", image: `${PICS}/insect.webp` },
  ink: { name: "Ink", image: `${PICS}/ink.webp` },
  octopus: { name: "Octopus", image: `${PICS}/octopus.webp` },
  ox: { name: "Ox", image: `${PICS}/ox.webp` },
  umbrella: { name: "Umbrella", image: `${PICS}/umbrella.webp` },
  snake: { name: "Snake", image: `${ART}/snake.webp` },
  pencil: { name: "Pencil", image: `${ART}/pencil.webp` },
  spoon: { name: "Spoon", image: `${ART}/spoon.webp` },
  mouse: { name: "Mouse", image: `${ART}/mouse.webp` },
  circle: { name: "Circle", image: `${SHAPE_ART}/circle.webp` },
  square: { name: "Square", image: `${SHAPE_ART}/square.webp` },
  triangle: { name: "Triangle", image: `${SHAPE_ART}/triangle.webp` },
  rectangle: { name: "Rectangle", image: `${SHAPE_ART}/rectangle.webp` },
  star: { name: "Star", image: `${SHAPE_ART}/star.webp` },
};

// Short vowel sounds spelled for the TTS voice; tune by ear if one comes out as the letter name.
const SOUNDS: Record<string, string> = { a: "aah", e: "eh", i: "ih", o: "aw", u: "uh" };

export const isLetter = (choice: string) => choice.length === 1;

// Tasks whose cards are named aloud before the child answers; shape, letter and partner cards stay unnamed, since saying them would give the answer away.
export const NAMED_TYPES: TaskType[] = ["same", "different", "long", "big", "small", "vowel"];

export const RIGHT = "That's correct!";

export const WRONG = "Oops, not that one!";

// Said as the right card lights up after a miss.
export const REVEAL = "This is the right one.";

export const DONE_TEXT = "You reached the end of the trail! Great reviewing!";

export interface Task {
  type: TaskType;
  target: string | null;
}

/** What the question pill shows; letter and sound tasks are only heard, so the screen never gives the answer away. */
export function questionText({ type, target }: Task): string {
  switch (type) {
    case "same":
      return "Which picture is the same as this one?";
    case "different":
      return "Which picture is different?";
    case "long":
      return "Which one is long?";
    case "big":
      return "Which one is big?";
    case "small":
      return "Which one is small?";
    case "shape":
      return `Which one is a ${target}?`;
    case "letter":
      return "Find the letter you hear!";
    case "partner":
      return "Find the small letter partner!";
    case "vowel":
      return "Which picture begins with the sound you hear?";
  }
}

export function questionSpeech(task: Task): string {
  const { type, target } = task;
  if (type === "letter") return `Find the letter ${target}.`;
  if (type === "partner") return `Find the small letter partner of big ${target}.`;
  if (type === "vowel" && target) {
    const sound = SOUNDS[target];
    return `Which picture begins with the short ${target.toUpperCase()} sound? ${sound}, ${sound}.`;
  }
  return questionText(task);
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
