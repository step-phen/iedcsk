// School things and spoken lines for the Q4 Math Readiness Final Assessment; things are emoji and the number caps are drawn with CSS.

export const THINGS: Record<string, { plural: string; emoji: string }> = {
  star: { plural: "stars", emoji: "⭐" },
  pencil: { plural: "pencils", emoji: "✏️" },
  book: { plural: "books", emoji: "📕" },
  crayon: { plural: "crayons", emoji: "🖍️" },
};

export type Thing = keyof typeof THINGS;
export const isThing = (v: unknown): v is Thing => typeof v === "string" && v in THINGS;

export type Round =
  | { key: string; kind: "add"; object: Thing; groupA: number; groupB: number; choices: number[] }
  | { key: string; kind: "takeAway"; object: Thing; start: number; removed: number; choices: number[] }
  | { key: string; kind: "next"; sequence: number[]; choices: number[] }
  | { key: string; kind: "missing"; sequence: (number | null)[]; missing: number; choices: number[] };

export function answerOf(round: Round): number {
  switch (round.kind) {
    case "add":
      return round.groupA + round.groupB;
    case "takeAway":
      return round.start - round.removed;
    case "next":
      return round.sequence[round.sequence.length - 1] + 1;
    case "missing":
      return round.missing;
  }
}

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

const sayList = (seq: (number | null)[]) => seq.map((n) => (n === null ? "blank" : String(n))).join(", ");

export function instruction(round: Round): string {
  switch (round.kind) {
    case "add":
      return `How many ${THINGS[round.object].plural} in all?`;
    case "takeAway":
      return `How many ${THINGS[round.object].plural} are left?`;
    case "next":
      return "What number comes next?";
    case "missing":
      return "What number is missing?";
  }
}

export function promptSpeech(round: Round): string {
  switch (round.kind) {
    case "add":
      return `${round.groupA} ${THINGS[round.object].plural} and ${round.groupB} more ${THINGS[round.object].plural}. How many ${THINGS[round.object].plural} in all?`;
    case "takeAway":
      return `There were ${round.start} ${THINGS[round.object].plural}. ${round.removed} were taken away. How many are left?`;
    case "next":
      return `Count the caps: ${sayList(round.sequence)}. What number comes next?`;
    case "missing":
      return `Count the caps: ${sayList(round.sequence)}. What number is missing?`;
  }
}

export function correctSpeech(round: Round): string {
  return `Yes! The answer is ${answerOf(round)}!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(round: Round): string {
  return `This is the correct answer! The answer is ${answerOf(round)}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You answered ${score} out of ${total} tasks correctly. Congratulations on finishing Kinder math!`;
}
