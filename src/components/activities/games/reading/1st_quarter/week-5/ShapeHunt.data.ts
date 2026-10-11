// Shapes, objects and spoken lines for Shape Hunt; the shared greeting and intro stay in lib/speech-lines.ts.

const SHAPE_ART = "/images/activities/shape";

// The target shapes reuse the art from Match the Shapes (RD-Q1W1-03).
export const SHAPES: Record<string, { name: string; image: string }> = {
  circle: { name: "Circle", image: `${SHAPE_ART}/circle.webp` },
  square: { name: "Square", image: `${SHAPE_ART}/square.webp` },
  triangle: { name: "Triangle", image: `${SHAPE_ART}/triangle.webp` },
  rectangle: { name: "Rectangle", image: `${SHAPE_ART}/rectangle.webp` },
  star: { name: "Star", image: `${SHAPE_ART}/star.webp` },
};

// Keyed by the seeder's choice ids; emoji stand in until real art exists, then set `image` and it is used instead.
export const OBJECTS: Record<string, { name: string; emoji: string; image?: string }> = {
  plate: { name: "Plate", emoji: "🍽️" },
  book: { name: "Book", emoji: "📕" },
  flag: { name: "Flag", emoji: "🚩" },
  tile: { name: "Tile", emoji: "🟫" },
  clock: { name: "Clock", emoji: "🕐" },
  door: { name: "Door", emoji: "🚪" },
  badge: { name: "Badge", emoji: "🌟" },
};

export const INSTRUCTION = "Tap the object that matches the shape!";

export const TRY_AGAIN = "Try again! Look at the shape.";

export const DONE_TEXT = "Great work, Shape Detective!";

export function promptSpeech(shape: string): string {
  return `Find the object shaped like a ${SHAPES[shape].name.toLowerCase()}!`;
}

export function correctSpeech(object: string, shape: string): string {
  return `Yes! The ${OBJECTS[object].name.toLowerCase()} is shaped like a ${SHAPES[shape].name.toLowerCase()}!`;
}

/** After a second miss: points out the right picture before moving on. */
export function revealSpeech(object: string, shape: string): string {
  const name = OBJECTS[object].name.toLowerCase();
  return `Oops! This is the ${name}. The ${name} is shaped like a ${SHAPES[shape].name.toLowerCase()}!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
