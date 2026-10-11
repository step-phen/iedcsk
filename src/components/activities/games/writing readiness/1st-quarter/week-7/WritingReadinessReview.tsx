"use client";

import { motion } from "framer-motion";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import ReviewGame, { type ReviewProgressProps } from "./ReviewGame";
import styles from "./WritingReadinessReview.module.css";

const DONE_TEXT = "You finished the writing review!";

const resultSpeech = (score: number, total: number) => `${DONE_TEXT} You got ${score} out of ${total}.`;

// Chalk on a green board: white guides, yellow chalk for the child's lines.
const COLORS = { guide: "#f4f1e6", ink: "#ffe066", rule: "rgba(244, 241, 230, 0.55)", ruleMid: "rgba(255, 160, 160, 0.6)" };

/** Chalk stars along the top of the board: yellow for a right first answer, a smudge for a miss, a dashed ring for the task now. */
function ChalkStars({ total, results, current, done }: ReviewProgressProps) {
  return (
    <div className={`${styles.chalkRow} flex items-center`} aria-label={`${results.length} of ${total} tasks done`}>
      {Array.from({ length: total }, (_, i) => {
        const finished = i < results.length;
        return (
          <motion.span
            key={i}
            aria-hidden
            className={`${styles.chalkSlot} ${finished ? (results[i] ? styles.chalkStar : styles.chalkSmudge) : i === current && !done ? styles.chalkNow : ""} flex items-center justify-center rounded-full leading-none`}
            initial={false}
            animate={done && results[i] ? { rotate: [0, 15, -15, 0] } : finished && i === results.length - 1 ? { scale: [0.3, 1.25, 1] } : { scale: 1 }}
            transition={done ? { repeat: Infinity, duration: 1.4, delay: i * 0.1 } : { duration: 0.45 }}
          >
            {finished && results[i] ? "★" : ""}
          </motion.span>
        );
      })}
    </div>
  );
}

export default function WritingReadinessReview(props: GameComponentProps) {
  return (
    <ReviewGame
      {...props}
      title="Writing Readiness Review"
      intro={GAME_INTRO_LINES["writing readiness review"]}
      doneText={DONE_TEXT}
      result={resultSpeech}
      styles={styles}
      colors={COLORS}
      progress={(p) => <ChalkStars {...p} />}
    />
  );
}
