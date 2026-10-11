"use client";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import MathReviewGame2 from "./MathReviewGame2";
import styles from "./MathReadinessFinalAssessment2.module.css";

// The trophy shelf: a slot per task, filled with a trophy when right first time, empty when missed.
const shelf = (results: boolean[], total: number) => (
  <span className={`${styles.progress} flex items-center justify-center`}>
    {Array.from({ length: total }, (_, i) => (
      <span key={i} aria-hidden className="leading-none transition-transform" style={{ transform: i === results.length - 1 ? "scale(1.3)" : "scale(1)" }}>
        {i < results.length ? (results[i] ? "🏆" : "🎯") : "⬚"}
      </span>
    ))}
  </span>
);

export default function MathReadinessFinalAssessment2(props: GameComponentProps) {
  return (
    <MathReviewGame2
      {...props}
      styles={styles}
      fallbackTitle="Math Readiness Final Assessment"
      intro={GAME_INTRO_LINES["math readiness final assessment 2"]}
      doneText="Your trophy shelf is complete!"
      progress={shelf}
    />
  );
}
