"use client";

import { motion, AnimatePresence } from "framer-motion";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import TraceCopyGame, { type ProgressProps } from "./TraceCopyGame";
import { SHAPES, TENT_COLORS, LINES } from "./TriangleBuilders.data";
import styles from "./TriangleBuilders.module.css";

/** The campsite: each triangle becomes a tent of that shape, bright when traced and copied right, pale when missed; a campfire lights at the end. */
function Campsite({ rounds, results, current, done }: ProgressProps) {
  const tallest = Math.max(...rounds.map((r) => r.h));
  return (
    <div className={`${styles.camp} flex items-end`} aria-label={`${results.length} of ${rounds.length} tents built`}>
      {rounds.map((r, i) => {
        const finished = i < results.length;
        const look = finished ? (results[i] ? styles.tent : `${styles.tent} ${styles.tentMissed}`) : i === current && !done ? `${styles.tent} ${styles.tentNow}` : `${styles.tent} ${styles.tentEmpty}`;
        return (
          <motion.span
            key={r.id}
            aria-hidden
            className={`${look} relative block shrink-0`}
            style={{
              width: `calc(var(--camp-h) * ${(r.w / tallest).toFixed(3)})`,
              height: `calc(var(--camp-h) * ${(r.h / tallest).toFixed(3)})`,
              background: finished && results[i] ? TENT_COLORS[i % TENT_COLORS.length] : undefined,
            }}
            initial={false}
            animate={done ? { y: [0, -6, 0] } : finished && i === results.length - 1 ? { scale: [0.3, 1.12, 1] } : { scale: 1 }}
            transition={done ? { repeat: Infinity, duration: 1.4, delay: i * 0.12 } : { duration: 0.5 }}
          />
        );
      })}
      <AnimatePresence>
        {done && (
          <motion.span aria-hidden className={`${styles.fire} leading-none`} initial={{ scale: 0 }} animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}>
            🔥
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TriangleBuilders(props: GameComponentProps) {
  return (
    <TraceCopyGame
      {...props}
      title="Triangle Builders"
      intro={GAME_INTRO_LINES["triangle builders"]}
      shapes={SHAPES}
      lines={LINES}
      styles={styles}
      ink="#3a6fd6"
      progress={(p) => <Campsite {...p} />}
    />
  );
}
