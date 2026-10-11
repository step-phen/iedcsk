"use client";

import { motion, AnimatePresence } from "framer-motion";

import type { GameComponentProps } from "@/types/activity";
import { GAME_INTRO_LINES } from "@/lib/speech-lines";
import TraceCopyGame, { type ProgressProps } from "./TraceCopyGame";
import { SHAPES, BUILDING_COLORS, LINES } from "./StraightSidedShapes.data";
import styles from "./StraightSidedShapes.module.css";

/** Block Town: each square or rectangle becomes a building of that shape on the street, bright when traced and copied right, pale when missed. */
function BlockTown({ rounds, results, current, done }: ProgressProps) {
  const tallest = Math.max(...rounds.map((r) => r.h));
  return (
    <div className={`${styles.town} relative flex items-end`} aria-label={`${results.length} of ${rounds.length} buildings built`}>
      {rounds.map((r, i) => {
        const finished = i < results.length;
        const look = finished ? (results[i] ? styles.building : `${styles.building} ${styles.buildingMissed}`) : i === current && !done ? styles.plotNow : styles.plot;
        return (
          <motion.span
            key={r.id}
            aria-hidden
            className={`${look} block shrink-0`}
            style={{
              width: `calc(var(--town-h) * ${(r.w / tallest).toFixed(3)})`,
              height: `calc(var(--town-h) * ${(r.h / tallest).toFixed(3)})`,
              background: finished && results[i] ? BUILDING_COLORS[i % BUILDING_COLORS.length] : undefined,
            }}
            initial={false}
            animate={done ? { y: [0, -6, 0] } : finished && i === results.length - 1 ? { scaleY: [0, 1.1, 1] } : { scaleY: 1 }}
            transition={done ? { repeat: Infinity, duration: 1.4, delay: i * 0.12 } : { duration: 0.5 }}
          />
        );
      })}
      <AnimatePresence>
        {done && (
          <motion.span aria-hidden className={`${styles.sun} absolute leading-none`} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.6 }}>
            ☀️
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StraightSidedShapes(props: GameComponentProps) {
  return (
    <TraceCopyGame
      {...props}
      title="Straight-Sided Shapes"
      intro={GAME_INTRO_LINES["straight-sided shapes"]}
      shapes={SHAPES}
      lines={LINES}
      styles={styles}
      ink="#e8633a"
      progress={(p) => <BlockTown {...p} />}
    />
  );
}
