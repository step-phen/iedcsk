// Puzzle colours and closing lines for the Language Final Assessment; task wording comes from LanguageReview.data.ts, the greeting and intro from lib/speech-lines.ts.

// The puzzle has one piece per task, five across.
export const PUZZLE_COLUMNS = 5;

// Piece colours, in turn across the board.
export const PIECE_COLORS = ["#ff8a65", "#4dd0e1", "#ba68c8", "#81c784", "#ffd54f"];

export const PRIZE_TEXT = "Language Star!";

export const DONE_TEXT = "You finished the language final assessment! You are a language star!";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
