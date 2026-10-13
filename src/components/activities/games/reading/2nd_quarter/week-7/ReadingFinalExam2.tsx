"use client";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import ReadingReviewGame2 from "./ReadingReviewGame2";
import styles from "./ReadingFinalExam2.module.css";

const CHEERS = ["Yum! You got it!", "Yes! Great reading!", "That's right!", "Sweet! Super job!", "Well done!"];

// A candle per task on the cake: lit when right first time, unlit when missed, see-through while still to come.
const cake = (results: boolean[], total: number) => (
  <span className="flex flex-col items-center">
    <span className="flex items-end gap-[clamp(2px,0.6vw,6px)] px-[clamp(8px,2vw,18px)]">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="flex flex-col items-center">
          <span className={cn(styles.flame, "h-[clamp(9px,1.8vh,16px)] w-[clamp(6px,1.1vh,10px)] rounded-[50%_50%_50%_50%/60%_60%_40%_40%]", !(i < results.length && results[i]) && "invisible")} />
          <span
            className={cn(
              styles.candle,
              "h-[clamp(16px,3.2vh,28px)] w-[clamp(6px,1.1vh,10px)] rounded-sm",
              i >= results.length && styles.candleTodo,
              i === results.length - 1 && styles.candleNew,
            )}
          />
        </span>
      ))}
    </span>
    <span className={`${styles.cake} block h-[clamp(14px,2.8vh,24px)] w-full rounded-t-lg`} />
    <span className={`${styles.plate} block h-[clamp(5px,1vh,8px)] w-[108%] rounded-full`} />
  </span>
);

const backdrop = (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className={`${styles.awning} absolute inset-x-0 top-0 h-[clamp(18px,4vh,34px)]`} />
    <div className={`${styles.counter} absolute inset-x-0 bottom-0 h-[16%]`} />
    <span className={`${styles.sprinkles} absolute inset-0`} />
  </div>
);

export default function ReadingFinalExam2(props: GameComponentProps) {
  return (
    <ReadingReviewGame2
      {...props}
      styles={styles}
      fallbackTitle="Reading Final Exam"
      intro={GAME_INTRO_LINES["reading final exam 2"]}
      loadingText="Baking the cake…"
      cheers={CHEERS}
      done="Every candle is lit! You did amazing on your reading exam!"
      doneMissed="Great work on your reading exam! Keep practising your letters and sounds."
      backdrop={backdrop}
      progress={cake}
    />
  );
}
