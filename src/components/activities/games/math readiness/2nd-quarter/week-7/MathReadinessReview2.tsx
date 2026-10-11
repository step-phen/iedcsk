"use client";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import MathReviewGame2 from "./MathReviewGame2";
import styles from "./MathReadinessReview2.module.css";

// The garden row: a flower per task, in bloom when right first time, closed when missed.
const garden = (results: boolean[], total: number) => (
  <span className={`${styles.progress} flex items-center justify-center`}>
    {Array.from({ length: total }, (_, i) => (
      <span key={i} aria-hidden className="leading-none transition-transform" style={{ transform: i === results.length - 1 ? "scale(1.3)" : "scale(1)" }}>
        {i < results.length ? (results[i] ? "🌸" : "🌱") : "🪴"}
      </span>
    ))}
  </span>
);

export default function MathReadinessReview2(props: GameComponentProps) {
  return (
    <MathReviewGame2
      {...props}
      styles={styles}
      fallbackTitle="Math Readiness Review"
      intro={GAME_INTRO_LINES["math readiness review 2"]}
      doneText="Your garden is in full bloom!"
      progress={garden}
    />
  );
}
