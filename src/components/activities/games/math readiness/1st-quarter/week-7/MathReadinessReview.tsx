"use client";

import { motion } from "framer-motion";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import MathReviewGame from "./MathReviewGame";
import styles from "./MathReadinessReview.module.css";

// The garden flower: one petal per task, bright when right first time, pale when missed.
const flower = (results: boolean[], total: number) => (
  <span className={`${styles.flower} relative block`}>
    {Array.from({ length: total }, (_, i) => (
      <motion.span
        key={i}
        className={`${styles.petal} ${i < results.length ? (results[i] ? styles.petalWon : styles.petalMissed) : ""} absolute block`}
        style={{ rotate: (360 / total) * i }}
        animate={{ scale: i === results.length - 1 ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.5 }}
      />
    ))}
    <span className={`${styles.heart} absolute block rounded-full`} />
  </span>
);

export default function MathReadinessReview(props: GameComponentProps) {
  return (
    <MathReviewGame
      {...props}
      styles={styles}
      fallbackTitle="Math Readiness Review"
      intro={GAME_INTRO_LINES["math readiness review"]}
      doneText="Your number flower is in full bloom!"
      countOnMiss
      progress={flower}
    />
  );
}
