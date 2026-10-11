// Game artwork lives in public/images/activities/shape/.
const FOLDER = "/images/activities/shape";

export const ASSETS = {
  background: "/images/activities/shape/shape-bg.webp",
  nameBanner: `${FOLDER}/bg-img/name-banner.webp`,
  instructionPanel: `${FOLDER}/bg-img/instruction-panel.webp`,
  planets: [`${FOLDER}/bg-img/planet1.webp`, `${FOLDER}/bg-img/planet2.webp`, `${FOLDER}/bg-img/planet3.webp`],
  starGif: "/gif/star.gif",
};

/** "SHAPE" spelled out with the glossy 3D letter tiles. */
export const TITLE_LETTERS = ["s", "h", "a", "p", "e"].map((letter) => ({
  src: `${FOLDER}/letters/${letter}.webp`,
  alt: letter.toUpperCase(),
}));

/** The DB stores only the shape's word ({"shape": "circle"}); its picture comes from it here. */
export function shapeAsset(shape: string): string {
  return `${FOLDER}/${shape}.webp`;
}

// ponytail: the star art is drawn for 0 to 5 stars; a board with more shapes needs more star images.
export function starBadgeAsset(stars: number): string {
  return `${FOLDER}/star-sprite/${stars === 0 ? "star-badge" : `star-filled${Math.min(stars, 5)}`}.webp`;
}

// Everything the game says aloud; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! That's a match!",
    "You found it!",
    "Great matching!",
    "Exactly right!",
    "Well spotted!",
    "Perfect fit!",
    "Nailed it!",
    "That's the one!",
    "Awesome match!",
    "You've got a great eye!",
    "Super work!",
    "Right where it belongs!",
  ],
  wrong: [
    "Not quite, try another spot!",
    "Close! Give it another try.",
    "Almost! Try a different outline.",
    "Good try! Have another go.",
  ],
};

/** A first-try match also earns its star; a piece that missed once still fits, just without the star. */
export function correctSpeech(praise: string, earnedStar: boolean): string {
  return earnedStar ? `${praise} You earned 1 star!` : praise;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(wrongAttempts: number): string {
  if (wrongAttempts <= 1) return "You are a Shape Master!";
  return wrongAttempts <= 4 ? "Great Matching!" : "Keep Practicing!";
}

export function resultSpeech(wrongAttempts: number, stars: number, total: number): string {
  return `${resultHeadline(wrongAttempts)} You earned ${stars} out of ${total} stars!`;
}
