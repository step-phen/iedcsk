// Game artwork lives in public/images/activities/things-i-need-for-my-writing-activities/.
const FOLDER = "/images/activities/things-i-need-for-my-writing-activities";

export const ASSETS = {
  background: "/images/background-images/things-i-need-for-my-writing-activities-bg.webp",
  title: `${FOLDER}/assets/title-banner.webp`,
  instructionPanel: `${FOLDER}/assets/instruction-panel.webp`,
  feedbackBar: `${FOLDER}/assets/feedback-bar.webp`,
  bag: `${FOLDER}/assets/writing-bag.webp`,
};

/** The DB stores only the item's word ({"item": "pencil"}); its picture comes from it here. */
export function itemAsset(item: string): string {
  return `${FOLDER}/items/${item}.webp`;
}

// ponytail: the badge art is drawn for 0 to 5; a game with more writing things needs more badge images.
export function scoreBadgeAsset(score: number): string {
  return `${FOLDER}/score/score-badge${Math.min(score, 5)}.webp`;
}

/** Each item's label, whether that label is plural ("Crayons"), and one child-friendly line on what it is for. */
const ITEMS: Record<string, { label: string; plural?: boolean; explanation: string }> = {
  pencil: { label: "Pencil", explanation: "We use a pencil to write and draw." },
  eraser: { label: "Eraser", explanation: "We use an eraser to remove pencil marks." },
  notebook: { label: "Notebook", explanation: "We use a notebook to write letters, words, and drawings." },
  crayons: { label: "Crayons", plural: true, explanation: "We use crayons to draw and color pictures." },
  sharpener: { label: "Sharpener", explanation: "We use a sharpener to make the tip of a pencil sharp so we can write clearly." },
  "teddy-bear": { label: "Teddy Bear", explanation: "A teddy bear is a toy. We use it for playing, not for writing." },
  ball: { label: "Ball", explanation: "We use a ball for playing, not for writing." },
  apple: { label: "Apple", explanation: "An apple is food. We eat it, but we do not use it for writing." },
  "toy-car": { label: "Toy Car", explanation: "A toy car is a toy. We use it for playing, not for writing." },
  spoon: { label: "Spoon", explanation: "We use a spoon for eating, not for writing." },
};

/** Label shown under the picture; an item missing from ITEMS falls back to its word. */
export function itemLabel(item: string): string {
  return ITEMS[item]?.label ?? item.replace(/-/g, " ");
}

/** "That's a Pencil" or "Those are Crayons", so the line never reads "That's a Crayons". */
function subject(item: string): string {
  const label = itemLabel(item);
  if (ITEMS[item]?.plural) return `Those are ${label}`;
  return `That's ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}`;
}

// Everything the game says aloud; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: ["Great job!", "Yes!", "Nice work!", "Correct!"],
  wrong: ["Oops!", "Not this one!"],
};

/** Feedback for one pack attempt: the opener, what the item is, and what it is for. */
export function feedbackSpeech(opener: string, item: string, belongs: boolean): string {
  const explanation = ITEMS[item]?.explanation ?? (belongs ? "We use it for writing." : "We do not use it for writing.");
  return `${opener} ${subject(item)}. ${explanation}`;
}

/** After a wrong pick: points the child to the writing things still in the tray, which glow while this is spoken. */
export function hintSpeech(remaining: string[]): string {
  const names = remaining.slice(0, 2).map((item) => `the ${itemLabel(item).toLowerCase()}`);
  if (names.length === 0) return "";
  if (names.length === 1) return `Look at the glowing one, ${names[0]}. We use it for writing!`;
  return `Look at the glowing ones, like ${names[0]} and ${names[1]}. We use those for writing!`;
}

export function resultSpeech(packed: number): string {
  return `Bag packed! Great job! You packed all ${packed} writing things.`;
}
