"use client";

import { motion } from "framer-motion";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import TraceCopyGame, { type ProgressProps } from "./TraceCopyGame";
import { SHAPES, SEGMENT_COLORS, LINES } from "./RoundAndRound.data";
import styles from "./RoundAndRound.module.css";

/** The caterpillar: one round segment per circle, bright when traced and copied right, pale when missed, dashed while still to come. */
function Caterpillar({ rounds, results, current, done }: ProgressProps) {
  return (
    <div className={`${styles.caterpillar} flex items-end`} aria-label={`${results.length} of ${rounds.length} circles done`}>
      {rounds.map((r, i) => {
        const finished = i < results.length;
        const look = finished ? (results[i] ? "" : styles.segMissed) : i === current && !done ? styles.segNow : styles.segEmpty;
        return (
          <motion.span
            key={r.id}
            aria-hidden
            className={`${styles.segment} ${look} block shrink-0 rounded-full`}
            style={finished && results[i] ? { background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] } : undefined}
            initial={false}
            animate={done ? { y: [0, -8, 0] } : finished && i === results.length - 1 ? { scale: [0.4, 1.15, 1] } : { scale: 1 }}
            transition={done ? { repeat: Infinity, duration: 1.2, delay: i * 0.12 } : { duration: 0.45 }}
          />
        );
      })}
      {/* the head, with eyes and two antennae */}
      <motion.span
        aria-hidden
        className={`${styles.head} relative block shrink-0 rounded-full`}
        animate={done ? { y: [0, -10, 0], rotate: [0, -8, 8, 0] } : { y: 0 }}
        transition={done ? { repeat: Infinity, duration: 1.2, delay: rounds.length * 0.12 } : { duration: 0.3 }}
      >
        <span className={`${styles.eye} absolute rounded-full`} />
      </motion.span>
    </div>
  );
}

export default function RoundAndRound(props: GameComponentProps) {
  return (
    <TraceCopyGame
      {...props}
      title="Round and Round"
      intro={GAME_INTRO_LINES["round and round"]}
      shapes={SHAPES}
      lines={LINES}
      styles={styles}
      ink="#3fae72"
      progress={(p) => <Caterpillar {...p} />}
    />
  );
}
