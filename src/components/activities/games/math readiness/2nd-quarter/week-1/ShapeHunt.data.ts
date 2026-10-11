// Scattered object library and spoken lines for Shape Hunt; the background lives in ShapeHunt.module.css, the shared greeting and intro stay in lib/speech-lines.ts.

export type ShapeName = "circle" | "square" | "triangle" | "rectangle";

export const SHAPE_NAMES: Record<ShapeName, string> = {
  circle: "circle",
  square: "square",
  triangle: "triangle",
  rectangle: "rectangle",
};

export function isShapeName(value: unknown): value is ShapeName {
  return typeof value === "string" && value in SHAPE_NAMES;
}

/** Every object that can be scattered across the scene, each tagged with the shape it looks like. */
export const OBJECTS: Record<string, { name: string; emoji: string; shape: ShapeName }> = {
  plate: { name: "Plate", emoji: "🍽️", shape: "circle" },
  clock: { name: "Clock", emoji: "🕐", shape: "circle" },
  cookie: { name: "Cookie", emoji: "🍪", shape: "circle" },
  tile: { name: "Tile", emoji: "🟫", shape: "square" },
  window: { name: "Window", emoji: "🪟", shape: "square" },
  box: { name: "Box", emoji: "📦", shape: "square" },
  flag: { name: "Flag", emoji: "🚩", shape: "triangle" },
  sandwich: { name: "Sandwich", emoji: "🥪", shape: "triangle" },
  slice: { name: "Pizza Slice", emoji: "🍕", shape: "triangle" },
  door: { name: "Door", emoji: "🚪", shape: "rectangle" },
  book: { name: "Book", emoji: "📕", shape: "rectangle" },
  ruler: { name: "Ruler", emoji: "📏", shape: "rectangle" },
};

export function isObjectId(value: unknown): value is keyof typeof OBJECTS {
  return typeof value === "string" && value in OBJECTS;
}

/** Five scattered spots the found objects are laid out over, well clear of the header and instruction pill. */
export const SPOTS: ReadonlyArray<{ x: number; y: number; rotate: number }> = [
  { x: 18, y: 26, rotate: -8 },
  { x: 80, y: 20, rotate: 9 },
  { x: 50, y: 56, rotate: -3 },
  { x: 22, y: 82, rotate: 6 },
  { x: 78, y: 80, rotate: -10 },
];

export function promptSpeech(shape: ShapeName): string {
  return `Find something shaped like a ${SHAPE_NAMES[shape]}!`;
}

export function shortInstruction(shape: ShapeName): string {
  return `Tap something shaped like a ${SHAPE_NAMES[shape]}.`;
}

export const TRY_AGAIN = "Not that one. Look again!";

export function correctSpeech(objectId: string, shape: ShapeName): string {
  return `Yes! The ${OBJECTS[objectId].name.toLowerCase()} is shaped like a ${SHAPE_NAMES[shape].toLowerCase()}!`;
}

/** After a second miss: points out the right object before moving on. */
export function revealSpeech(objectId: string, shape: ShapeName): string {
  const name = OBJECTS[objectId].name.toLowerCase();
  return `Here it is! The ${name} is shaped like a ${SHAPE_NAMES[shape].toLowerCase()}!`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You found ${score} out of ${total} shapes in the scene.`;
}
