"use client";

import { motion } from "framer-motion";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import TwoGroupsGame, { type CardState } from "./TwoGroupsGame";
import { INSTRUCTION, DONE_TEXT, WRONG, promptSpeech } from "./CircleTheGroup.data";
import styles from "./CircleTheGroup.module.css";

// A loose crayon loop that runs a little past where it starts, like a child's circle.
const LOOP = "M 52 4 C 82 3, 97 24, 96 50 C 95 80, 74 97, 48 96 C 20 95, 3 77, 4 49 C 5 22, 24 5, 60 7";

// The crayon circle draws itself around the group with more once it is picked or shown.
const circle = ({ isAnswer, isRight }: CardState) =>
  (isAnswer || isRight) && (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className={`${styles.loop} pointer-events-none absolute`}>
      <motion.path d={LOOP} fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: "easeInOut" }} />
    </svg>
  );

export default function CircleTheGroup(props: GameComponentProps) {
  return (
    <TwoGroupsGame
      {...props}
      ask="more"
      styles={styles}
      fallbackTitle="Circle the Group"
      intro={GAME_INTRO_LINES["circle the group"]}
      instruction={INSTRUCTION}
      doneText={DONE_TEXT}
      wrong={WRONG}
      promptSpeech={promptSpeech}
      mark={circle}
    />
  );
}
