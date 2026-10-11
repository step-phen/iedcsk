"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { Star } from "lucide-react";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import MathReviewGame from "./MathReviewGame";
import styles from "./MathReadinessFinalAssessment.module.css";

/** Task numbers stacked as a pyramid, bottom row first: 15 tasks make rows of 5, 4, 3, 2 and 1. Returned top row first. */
function pyramid(total: number): number[][] {
  let width = 1;
  while ((width * (width + 1)) / 2 < total) width++;
  const rows: number[][] = [];
  for (let w = width, k = 0; w > 0 && k < total; w--) {
    const row = Array.from({ length: Math.min(w, total - k) }, (_, i) => k + i);
    k += row.length;
    rows.push(row);
  }
  return rows.reverse();
}

// The block tower: one block per task, gold with a star when right first time, plain stone when missed; the flag goes up once it is built.
const tower = (results: boolean[], total: number) => {
  const rows = pyramid(total);
  return (
    <span className={`${styles.tower} flex flex-col items-center`} style={{ "--cols": rows[rows.length - 1]?.length ?? 1, "--rows": rows.length } as CSSProperties}>
      <motion.span className={`${styles.flag} leading-none`} initial={false} animate={{ opacity: total > 0 && results.length === total ? 1 : 0, y: results.length === total ? 0 : 20 }}>
        🚩
      </motion.span>
      {rows.map((row, r) => (
        <span key={r} className={`${styles.row} flex`}>
          {row.map((k) => (
            <motion.span
              key={k}
              className={`${styles.block} ${k < results.length ? (results[k] ? styles.blockWon : styles.blockMissed) : ""} flex items-center justify-center`}
              initial={false}
              animate={k === results.length - 1 ? { y: [-30, 0], opacity: [0, 1] } : { y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {results[k] && <Star className="h-3/5 w-3/5 text-white" fill="white" strokeWidth={2} />}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
};

export default function MathReadinessFinalAssessment(props: GameComponentProps) {
  return (
    <MathReviewGame
      {...props}
      styles={styles}
      fallbackTitle="Math Readiness Final Assessment"
      intro={GAME_INTRO_LINES["math readiness final assessment"]}
      doneText="Your number tower is built!"
      countOnMiss={false}
      progress={tower}
    />
  );
}
