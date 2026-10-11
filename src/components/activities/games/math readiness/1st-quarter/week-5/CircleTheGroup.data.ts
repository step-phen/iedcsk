// Spoken lines for Circle the Group; the compare lines come from More or Less?, the greeting and intro stay in lib/speech-lines.ts.

import { objectName } from "../week-1/NumberRecognition.data";
import type { Round } from "./TwoGroupsGame";

export const INSTRUCTION = "Tap the group with MORE to circle it!";

export const DONE_TEXT = "Great circling! You found every group with more!";

export const WRONG = "Oops! Look at the other group.";

export const promptSpeech = (r: Round) => `Which group has more ${objectName(r.object, 2)}? Tap it to draw a circle around it!`;
