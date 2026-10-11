"use client";

import { motion } from "framer-motion";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import TwoGroupsGame, { type CardState } from "./TwoGroupsGame";
import { INSTRUCTION, DONE_TEXT, WRONG, promptSpeech, pictureSize } from "./FindTheSmallerGroup.data";
import styles from "./FindTheSmallerGroup.module.css";

const POP = { type: "spring", stiffness: 260, damping: 16 } as const;

// Once the pair is answered both clue cards show how many they hold, and the magnifier lands on the smaller group.
const clue = ({ round, side, answered, isAnswer, isRight }: CardState) => (
  <>
    {answered && (
      <motion.span
        aria-hidden
        className={`${styles.badge} pointer-events-none absolute flex items-center justify-center rounded-full font-extrabold leading-none tabular-nums`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={POP}
      >
        {round[side]}
      </motion.span>
    )}
    {(isAnswer || isRight) && (
      <motion.span aria-hidden className={`${styles.lens} pointer-events-none absolute leading-none`} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={POP}>
        🔍
      </motion.span>
    )}
  </>
);

export default function FindTheSmallerGroup(props: GameComponentProps) {
  return (
    <TwoGroupsGame
      {...props}
      ask="fewer"
      styles={styles}
      fallbackTitle="Find the Smaller Group"
      intro={GAME_INTRO_LINES["find the smaller group"]}
      instruction={INSTRUCTION}
      doneText={DONE_TEXT}
      wrong={WRONG}
      promptSpeech={promptSpeech}
      mark={clue}
      pictureSize={pictureSize}
    />
  );
}
