"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig, useAnimate, useReducedMotion, type PanInfo } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { GROUPS, OBJECTS, INSTRUCTION, WRONG, RIGHT, CORRECT_LEAD, DONE_TEXT, correctSpeech, resultSpeech, type Length } from "./LengthSort.data";
import styles from "./LengthSort.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface Piece {
  id: string;
  answer: Length;
}

interface QuestionRow {
  questionKey: string;
  correctAnswer: { answer: string };
}

// What the teacher's score is built from: the first group picked for each object.
interface PieceRecord {
  firstAnswer: Length | null;
  attempts: number;
  done: boolean;
}

type Stage = "playing" | "done";

const shuffle = <T,>(list: T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const emptyGroups = (): Record<Length, string[]> => ({ long: [], short: [] });

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function LengthSort({ activityId, activityName, onFinish }: GameComponentProps) {
  const reduceMotion = useReducedMotion();
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [order, setOrder] = useState<Piece[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [groups, setGroups] = useState(emptyGroups);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState(false);
  const [hoverLength, setHoverLength] = useState<Length | null>(null);
  const [litLength, setLitLength] = useState<Length | null>(null);
  // After a miss: the group picked gets an X, and the right one glows while the object flies into it.
  const [wrongLength, setWrongLength] = useState<Length | null>(null);
  const [answerLength, setAnswerLength] = useState<Length | null>(null);

  // Display-only: the learner name and photo the child already picked on /learner; never used for grading.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  const records = useRef<Record<string, PieceRecord>>({});
  const current = stage === "playing" ? order[index] : undefined;

  // Question data lives in the DB (activity_questions) — fetched once on mount.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activityId) {
      setLoadError(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/activities/${activityId}/questions`);
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const rows: QuestionRow[] = await res.json();
        if (cancelled) return;
        if (rows.length === 0) throw new Error("No questions configured");
        const mapped = rows.map((row) => {
          const answer = row.correctAnswer.answer as Length;
          if (!(row.questionKey in OBJECTS) || !GROUPS.some((g) => g.id === answer)) {
            throw new Error(`Question ${row.questionKey} needs a known object and a long/short answer`);
          }
          return { id: row.questionKey, answer };
        });
        records.current = Object.fromEntries(mapped.map((p) => [p.id, { firstAnswer: null, attempts: 0, done: false }]));
        setPieces(mapped);
        setOrder(shuffle(mapped));
      } catch (err) {
        console.error("Failed to load Length Sort questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const { speak, speakAll, stop } = useSpeech();
  useEffect(() => stop, [stop]);

  // Names each object as its card appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!current) return;
    const name = OBJECTS[current.id].name;
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["length sort"], name]);
      return;
    }
    introDone.current = true;
    speak(name);
  }, [current, speak, speakAll]);

  // Short tones synthesized via Web Audio — no audio file to ship or 404 on.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTones = useCallback((freqs: number[], type: OscillatorType) => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.1;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch {
      // Ignore web audio exceptions if restricted
    }
  }, []);

  const [shakeScope, animateShake] = useAnimate();

  // A ref, not only state, so a drop and a click landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const lock = (on: boolean) => {
    lockedRef.current = on;
    setLocked(on);
  };

  // Puts the object in its group, says why it belongs there, then moves on; only a right first pick earns a star.
  const place = (piece: Piece, earned: boolean) => {
    const lead = earned ? RIGHT : CORRECT_LEAD;
    playTones([523, 659, 784], "sine");
    setGroups((g) => ({ ...g, [piece.answer]: [...g[piece.answer], piece.id] }));
    if (earned) setStars((s) => Math.min(s + 1, order.length));
    setLitLength(piece.answer);
    const isLast = index === order.length - 1;
    speak(`${lead} ${correctSpeech(piece.id, piece.answer)}`, () => {
      setLitLength(null);
      setWrongLength(null);
      setAnswerLength(null);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score; it is sent once the result line has been spoken.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), order.length), handleFinish);
    });
  };

  const answer = (length: Length) => {
    if (!current || lockedRef.current) return;
    lock(true);
    setSelected(false);
    setHoverLength(null);

    // One try per object: the first group picked is the answer that is graded.
    const rec = records.current[current.id];
    if (!rec.done) {
      rec.attempts += 1;
      rec.firstAnswer ??= length;
      rec.done = true;
    }

    if (length === current.answer) return place(current, true);

    playTones([330, 247], "triangle");
    setWrongLength(length);
    if (!reduceMotion) void animateShake(shakeScope.current, { x: [0, -12, 12, -8, 8, 0] }, { duration: 0.45 });
    const piece = current;
    speak(WRONG, () => {
      setAnswerLength(piece.answer);
      place(piece, false);
    });
  };

  // The group under the pointer, found through its data-length attribute.
  const lengthAt = (point: { x: number; y: number }): Length | null => {
    for (const el of document.elementsFromPoint(point.x - window.scrollX, point.y - window.scrollY)) {
      const group = el.closest<HTMLElement>("[data-length]");
      if (group) return group.dataset.length as Length;
    }
    return null;
  };

  // Set on pointer down and again when a drag starts, so the click a mouse fires after a drag isn't read as a tap.
  const draggedRef = useRef(false);

  const finishedRef = useRef(false);
  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const submitted: SubmittedAnswer[] = Object.entries(records.current)
      .filter(([, r]) => r.firstAnswer !== null)
      .map(([id, r]) => ({ questionId: id, response: r.firstAnswer as string }));
    onFinish?.(submitted);
  };

  const rootRef = useRef<HTMLDivElement>(null);

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4 text-center`}>
        <p className="text-lg font-bold">Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!pieces) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

  const group = (g: (typeof GROUPS)[number]) => {
    const isTarget = !locked && (hoverLength === g.id || (selected && hoverLength === null));
    return (
      <motion.div
        key={g.id}
        data-length={g.id}
        role="button"
        tabIndex={stage === "playing" ? 0 : -1}
        onClick={() => selected && answer(g.id)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && selected) {
            e.preventDefault();
            answer(g.id);
          }
        }}
        aria-label={`${g.label} group${groups[g.id].length ? `, holding ${groups[g.id].map((w) => OBJECTS[w].name).join(" and ")}` : ""}`}
        animate={{
          y: stage === "done" ? [0, -16, 0, -8, 0] : 0,
          scale: answerLength === g.id ? 1.08 : 1,
        }}
        transition={{
          y: { duration: 1, delay: stage === "done" ? (g.id === "long" ? 0 : 0.15) : 0, ease: "easeOut" },
          scale: { duration: 0.4, ease: EASE_OUT },
        }}
        className={`${styles.group} ${g.id === "long" ? styles.groupLong : styles.groupShort} ${isTarget ? styles.target : ""} ${answerLength === g.id ? styles.showAnswer : ""} ${focusRing}`}
      >
        <span className={`${styles.label} ${litLength === g.id ? styles.lit : ""} rounded-full px-4 py-1 text-xl font-extrabold leading-none sm:text-3xl`}>
          {g.label}
        </span>
        <span className={`${styles.content} relative`}>
          {wrongLength === g.id && (
            <motion.span
              aria-hidden
              className={`${styles.wrongMark} pointer-events-none absolute inset-0 flex items-center justify-center font-black leading-none`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              ✕
            </motion.span>
          )}
          {groups[g.id].map((w) => (
            <motion.span
              key={w}
              layoutId={`piece-${w}`}
              className={`${styles.thumb} relative h-[70%] max-w-[30%] flex-1`}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              <span className="flex h-full w-full items-center justify-center text-[clamp(24px,6dvh,56px)] leading-none" aria-hidden>
                {OBJECTS[w].emoji}
              </span>
            </motion.span>
          ))}
        </span>
      </motion.div>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className={`${styles.screen} fixed inset-0 flex h-dvh w-full select-none flex-col overflow-hidden px-4 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5`}>
        {/* header: learner, title, stars; upright phones put the title on its own line */}
        <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex shrink-0 items-center gap-2">
            {learnerName && (
              <div className={`${styles.pill} flex items-center gap-2 rounded-full py-1 pl-1 pr-3 sm:pr-4`}>
                <motion.span
                  className={`${styles.avatar} flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-2xl leading-none sm:h-14 sm:w-14 sm:text-3xl`}
                  animate={{ rotate: [0, -18, 14, -10, 6, 0] }}
                  transition={{ duration: 0.9, ease: EASE_OUT }}
                  style={{ transformOrigin: "70% 70%" }}
                >
                  <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className="h-full w-full" />
                </motion.span>
                <span className={`${styles.learnerName} max-w-[8rem] truncate text-lg font-extrabold capitalize leading-none sm:max-w-[13rem] sm:text-2xl`}>{learnerName}</span>
              </div>
            )}
          </div>
          <h2 className={`${styles.title} order-last min-w-0 basis-full truncate text-center text-2xl font-extrabold leading-tight sm:order-none sm:basis-auto sm:text-4xl`}>
            {activityName || "Length Sort"}
          </h2>
          <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
            <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
            <span className="tabular-nums">{stars}</span>
          </div>
        </div>

        {/* instruction with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => current && speak(OBJECTS[current.id].name)}
              disabled={!current || locked}
              aria-label="Hear the object's name again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* the object card, or the goodbye message once every object is sorted */}
        <div className="relative z-20 flex min-h-0 flex-1 items-center justify-center py-2">
          <AnimatePresence mode="popLayout">
            {/* Leaves the moment it lands in its group, so the group's copy can fly in from where the card was. */}
            {current && !groups[current.answer].includes(current.id) && (
              <motion.div ref={shakeScope} key={`${current.id}-${index}`} className="relative">
                <motion.button
                  type="button"
                  layoutId={`piece-${current.id}`}
                  aria-label={`${OBJECTS[current.id].name}. ${selected ? "Picked up — now tap a group." : "Tap to pick up, or drag to a group."}`}
                  aria-pressed={selected}
                  drag={!locked}
                  dragConstraints={rootRef}
                  dragElastic={0}
                  dragMomentum={false}
                  dragSnapToOrigin
                  whileDrag={{ scale: 1.08, zIndex: 50 }}
                  onPointerDown={() => (draggedRef.current = false)}
                  onDragStart={() => {
                    draggedRef.current = true;
                    setSelected(false);
                  }}
                  onDrag={(_: unknown, info: PanInfo) => setHoverLength(lengthAt(info.point))}
                  onDragEnd={(_: unknown, info: PanInfo) => {
                    setHoverLength(null);
                    const l = lengthAt(info.point);
                    if (l) answer(l);
                  }}
                  onClick={() => {
                    if (draggedRef.current || locked) return;
                    setSelected((s) => !s);
                  }}
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: selected ? 1.06 : 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className={`${styles.card} ${selected ? styles.selected : ""} relative flex aspect-square flex-col gap-[2%] w-[clamp(96px,min(28dvh,40vw),220px)] items-center justify-center rounded-3xl ${focusRing}`}
                >
                  <span className="pointer-events-none flex h-[62%] w-[78%] items-center justify-center text-[clamp(40px,9dvh,88px)] leading-none" aria-hidden>
                    {OBJECTS[current.id].emoji}
                  </span>
                  <span className="pointer-events-none text-[clamp(16px,4dvh,32px)] font-extrabold leading-none">{OBJECTS[current.id].name}</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {stage === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className={`${styles.doneCard} flex max-w-md flex-col items-center gap-4 rounded-3xl px-6 py-5 text-center`}
              role="status"
            >
              <p className={`${styles.doneTitle} text-2xl font-extrabold leading-tight sm:text-3xl`}>{DONE_TEXT}</p>
              <div className={`${styles.doneScore} flex items-center gap-2 text-4xl font-extrabold tabular-nums sm:text-5xl`}>
                <Star aria-hidden="true" className="h-9 w-9 text-[#f2b134] sm:h-11 sm:w-11" fill="#f2b134" strokeWidth={2.2} />
                {stars} / {order.length}
              </div>
              <p className={`${styles.doneLine} text-xl font-bold sm:text-2xl`}>
                You got {stars} of {order.length} correct!
              </p>
            </motion.div>
          )}
        </div>

        {/* the two groups; Long is drawn wider than Short so the lengths read at a glance */}
        <div className={`${styles.groups} relative z-10 shrink-0`}>{GROUPS.map(group)}</div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
