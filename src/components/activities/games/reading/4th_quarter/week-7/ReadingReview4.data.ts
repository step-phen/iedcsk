// Pictures, task prompts and spoken lines for Reading Review (Q4); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type TaskType = "word" | "vowel" | "sentence" | "rhyme" | "story";

export const TASK_TYPES: TaskType[] = ["word", "vowel", "sentence", "rhyme", "story"];

export const VOWELS = ["a", "e", "i", "o", "u"];

// Emoji stand in until drawn art is added; "said" is how the picture is named in speech.
export const PICS: Record<string, { name: string; said: string; emoji: string }> = {
  hen: { name: "hen", said: "a hen", emoji: "🐔" },
  pen: { name: "pen", said: "a pen", emoji: "🖊️" },
  ten: { name: "ten", said: "ten", emoji: "🔟" },
  box: { name: "box", said: "a box", emoji: "📦" },
  dog: { name: "dog", said: "a dog", emoji: "🐶" },
  fox: { name: "fox", said: "a fox", emoji: "🦊" },
  cat: { name: "cat", said: "a cat", emoji: "🐱" },
  bed: { name: "bed", said: "a bed", emoji: "🛏️" },
  bug: { name: "bug", said: "a bug", emoji: "🐛" },
  cup: { name: "cup", said: "a cup", emoji: "🥤" },
  hat: { name: "hat", said: "a hat", emoji: "🎩" },
  sun: { name: "sun", said: "the sun", emoji: "☀️" },
  pig: { name: "pig", said: "a pig", emoji: "🐷" },
  log: { name: "log", said: "a log", emoji: "🪵" },
  tub: { name: "tub", said: "a tub", emoji: "🛁" },
};

export const INSTRUCTION = "Do each task, then tap the right cone!";

// Shown on the menu board above the task text.
export const TASK_LABEL: Record<TaskType, string> = {
  word: "Read the word",
  vowel: "Middle sound",
  sentence: "Read the sentence",
  rhyme: "Rhyme time",
  story: "Read the story",
};

export function promptSpeech(type: TaskType, text: string, question: string | null): string {
  switch (type) {
    case "word":
      return "Read the word. Tap its picture.";
    case "vowel":
      return "Read the word. Which vowel sound is in the middle?";
    case "sentence":
      return "Read the sentence. Tap the picture that shows it.";
    case "rhyme":
      return `Which word rhymes with ${text}?`;
    case "story":
      return `Read the story. ${question ?? ""}`;
  }
}

export function answerLine(type: TaskType, text: string, answer: string): string {
  switch (type) {
    case "word":
      return `The word is ${text}.`;
    case "vowel":
      return `${text} has the short ${answer} sound.`;
    case "sentence":
      return text;
    case "rhyme":
      return `${text} and ${answer} rhyme!`;
    case "story":
      return `The answer is ${PICS[answer].said}.`;
  }
}

const CHEERS = ["Sweet! That's right!", "Yum, great job!", "One more scoop!", "Super reader!", "Delicious work!"];

export function correctSpeech(line: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${line}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(line: string): string {
  return `${REVEAL_TEXT} ${line}`;
}

export const DONE = "Hooray! You built the tallest ice cream ever! You remember all your reading skills!";

export const DONE_MISSED = "Good work! Keep practicing your words, sounds, and stories.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You got ${score} out of ${total} scoops.`;
}
