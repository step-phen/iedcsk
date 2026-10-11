// Spoken lines for Shape and Pattern Challenge; shapes are drawn with CSS, no image assets to ship. The shared greeting and intro stay in lib/speech-lines.ts.

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

export type Task =
  | { kind: "namedShape"; shape: ShapeName; choices: ShapeName[] }
  | { kind: "patternFill"; pattern: ShapeName[]; choices: ShapeName[] };

export const DONE_TEXT = "Challenge complete! Great thinking!";

export function instruction(task: Task): string {
  return task.kind === "namedShape" ? "Which one did you hear?" : "What comes next in the pattern?";
}

export function promptSpeech(task: Task): string {
  return task.kind === "namedShape" ? `Find the ${SHAPE_NAMES[task.shape]}! Tap the ${SHAPE_NAMES[task.shape]}.` : "Look at the pattern, then tap what comes next!";
}

export function rightSpeech(task: Task, answer: string): string {
  return task.kind === "namedShape" ? `Yes! That is the ${answer}!` : `Yes! A ${answer} comes next!`;
}

export function revealSpeech(task: Task, answer: string): string {
  return task.kind === "namedShape" ? `This one is the ${answer}!` : `The pattern continues with a ${answer}!`;
}

export const WRONG = "Not quite. Try again!";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
