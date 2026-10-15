"use client";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import ReadingReviewGame3 from "./ReadingReviewGame3";
import styles from "./ReadingReview3.module.css";

const CHEERS = ["Splash! You got it!", "Yes! Great reading!", "That's right!", "Bubbly! Super job!", "Well done!"];

// A clam per task along the reef: open with a pearl when right first time, shut when missed, faint while still to come.
const clams = (results: boolean[], total: number) => (
  <span className="flex items-end gap-[clamp(3px,0.9vw,8px)]">
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        className={cn(
          styles.clam,
          "relative block h-[clamp(16px,3vh,26px)] w-[clamp(22px,4vh,36px)]",
          i < results.length ? (results[i] ? styles.clamPearl : styles.clamShut) : styles.clamTodo,
          i === results.length - 1 && styles.clamNew,
        )}
      />
    ))}
  </span>
);

const backdrop = (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <span className={`${styles.rays} absolute inset-0`} />
    <span className={`${styles.bubble} absolute bottom-[12%] left-[8%] size-6 rounded-full`} />
    <span className={`${styles.bubble} absolute bottom-[30%] right-[10%] size-4 rounded-full [animation-delay:1.6s]`} />
    <span className={`${styles.bubble} absolute bottom-[18%] right-[24%] size-3 rounded-full [animation-delay:3s]`} />
    <div className={`${styles.coral} absolute -left-6 bottom-[6%] h-[26vh] w-[14vh]`} />
    <div className={`${styles.coral} ${styles.coralPink} absolute -right-4 bottom-[6%] h-[20vh] w-[11vh]`} />
    <div className={`${styles.sand} absolute inset-x-0 bottom-0 h-[10%]`} />
  </div>
);

export default function ReadingReview3(props: GameComponentProps) {
  return (
    <ReadingReviewGame3
      {...props}
      styles={styles}
      fallbackTitle="Reading Review"
      intro={GAME_INTRO_LINES["reading review 3"]}
      loadingText="Diving down to the reef…"
      cheers={CHEERS}
      done="Wow! Every clam on the reef has a pearl!"
      doneMissed="Good work! You found so many pearls. Keep practising your sounds and words."
      backdrop={backdrop}
      progress={clams}
    />
  );
}
