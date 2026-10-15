"use client";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import ReadingReviewGame3 from "./ReadingReviewGame3";
import styles from "./ReadingFinalExam3.module.css";

const CHEERS = ["Glowing! You got it!", "Yes! Great reading!", "That's right!", "Bright and shiny! Super!", "Well done!"];

// A paper lantern per task on the string: glowing when right first time, dark when missed, see-through while still to come.
const lanterns = (results: boolean[], total: number) => (
  <span className={`${styles.string} flex items-start gap-[clamp(2px,0.7vw,7px)] px-[clamp(6px,1.4vw,14px)] pt-[3px]`}>
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        className={cn(
          styles.lantern,
          "block h-[clamp(18px,3.4vh,30px)] w-[clamp(13px,2.4vh,22px)] rounded-[40%]",
          i < results.length ? (results[i] ? styles.lanternLit : styles.lanternDark) : styles.lanternTodo,
          i === results.length - 1 && styles.lanternNew,
        )}
      />
    ))}
  </span>
);

const backdrop = (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <span className={`${styles.stars} absolute inset-0`} />
    <span className={`${styles.moon} absolute right-[8vw] top-[9vh] size-[11vh] rounded-full`} />
    <div className={`${styles.rooftops} absolute inset-x-0 bottom-0 h-[16%]`} />
  </div>
);

export default function ReadingFinalExam3(props: GameComponentProps) {
  return (
    <ReadingReviewGame3
      {...props}
      styles={styles}
      fallbackTitle="Reading Final Exam"
      intro={GAME_INTRO_LINES["reading final exam 3"]}
      loadingText="Lighting the lanterns…"
      cheers={CHEERS}
      done="Every lantern is glowing! You did amazing on your reading exam!"
      doneMissed="Great work on your reading exam! Keep practising your sounds and words."
      backdrop={backdrop}
      progress={lanterns}
    />
  );
}
