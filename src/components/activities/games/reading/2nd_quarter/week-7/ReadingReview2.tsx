"use client";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import ReadingReviewGame2 from "./ReadingReviewGame2";
import styles from "./ReadingReview2.module.css";

const CHEERS = ["Munch munch! You got it!", "Yes! Great reading!", "That's right!", "Wiggle wiggle! Super!", "Well done!"];

// The caterpillar grows a segment per task: green when right first time, brown when missed, pale while still to come.
const caterpillar = (results: boolean[], total: number) => (
  <span className="flex items-center">
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        className={cn(
          styles.segment,
          "-ml-[clamp(3px,0.6vh,6px)] size-[clamp(18px,3.4vh,30px)] rounded-full first:ml-0",
          i < results.length ? (results[i] ? styles.segmentRight : styles.segmentMissed) : styles.segmentTodo,
          i === results.length - 1 && styles.segmentNew,
        )}
      />
    ))}
    <span className={`${styles.head} relative -ml-[clamp(3px,0.6vh,6px)] size-[clamp(26px,4.8vh,42px)] rounded-full`} />
  </span>
);

const backdrop = (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className={`${styles.bigLeaf} absolute -left-16 bottom-[8%] h-40 w-64 -rotate-12`} />
    <div className={`${styles.bigLeaf} absolute -right-20 top-[20%] h-36 w-60 rotate-[160deg]`} />
    <div className={`${styles.grass} absolute inset-x-0 bottom-0 h-[14%]`} />
  </div>
);

export default function ReadingReview2(props: GameComponentProps) {
  return (
    <ReadingReviewGame2
      {...props}
      styles={styles}
      fallbackTitle="Reading Review"
      intro={GAME_INTRO_LINES["reading review 2"]}
      loadingText="Waking up the caterpillar…"
      cheers={CHEERS}
      done="Wow! Your caterpillar grew all the way!"
      doneMissed="Good work! Your caterpillar grew so much. Keep practising your letters."
      backdrop={backdrop}
      progress={caterpillar}
    />
  );
}
