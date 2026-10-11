"use client";

import { motion } from "framer-motion";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import ReviewGame, { type ReviewProgressProps } from "./ReviewGame";
import styles from "./WritingReadinessFinalAssessment.module.css";

const DONE_TEXT = "Your writing passport is full! You are a writing star!";

const resultSpeech = (score: number, total: number) => `${DONE_TEXT} You got ${score} out of ${total}.`;

// Ink on passport paper: navy guides, blue lines for the child's writing.
const COLORS = { guide: "#22314f", ink: "#2f6fd0", rule: "#5b8ef4", ruleMid: "#e15a5a" };

// The stamp pictures, in turn across the passport.
const STAMPS = ["✏️", "🖍️", "📏", "⭐", "🎨"];

/** The passport's stamp boxes: an inked stamp for a right first answer, a faded one for a miss, a dashed box for the task now. */
function PassportStamps({ total, results, current, done }: ReviewProgressProps) {
  return (
    <div className={`${styles.passport} flex items-center`} aria-label={`${results.length} of ${total} stamps`}>
      {Array.from({ length: total }, (_, i) => {
        const finished = i < results.length;
        return (
          <motion.span
            key={i}
            aria-hidden
            className={`${styles.stampBox} ${finished ? (results[i] ? styles.stamped : styles.faded) : i === current && !done ? styles.stampNow : ""} flex items-center justify-center rounded-lg leading-none`}
            initial={false}
            animate={finished && i === results.length - 1 ? { scale: [1.8, 0.9, 1], rotate: [-25, 6, -8] } : done ? { y: [0, -4, 0] } : { scale: 1 }}
            transition={done ? { repeat: Infinity, duration: 1.4, delay: i * 0.08 } : { duration: 0.4 }}
          >
            {finished ? STAMPS[i % STAMPS.length] : ""}
          </motion.span>
        );
      })}
    </div>
  );
}

export default function WritingReadinessFinalAssessment(props: GameComponentProps) {
  return (
    <ReviewGame
      {...props}
      title="Writing Readiness Final Assessment"
      intro={GAME_INTRO_LINES["writing readiness final assessment"]}
      doneText={DONE_TEXT}
      result={resultSpeech}
      styles={styles}
      colors={COLORS}
      progress={(p) => <PassportStamps {...p} />}
    />
  );
}
