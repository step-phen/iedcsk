"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, MotionConfig, useAnimate, useReducedMotion, type PanInfo } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { ASSETS, VOWELS, WORDS, INSTRUCTION, WRONG, RIGHT, CORRECT_LEAD, DONE_TEXT, correctSpeech, resultSpeech, type Vowel } from "./VowelsReview.data";
import styles from "./VowelsReview.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// The basket art's cream front patch, as a share of the basket's visible box, so the letters sit on it.
const PLATE = { left: "22.7%", right: "22.8%", top: "52.7%", bottom: "10.8%" };

interface Picture {
  id: string;
  answer: Vowel;
}

interface QuestionRow {
  questionKey: string;
  correctAnswer: { answer: string };
}

// What the teacher's score is built from: the first basket picked for each picture, plus how many tries it took.
interface PictureRecord {
  firstAnswer: Vowel | null;
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

const emptyBaskets = (): Record<Vowel, string[]> => ({ a: [], e: [], i: [], o: [], u: [] });

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function VowelsReview({ activityId, activityName, onFinish }: GameComponentProps) {
  const reduceMotion = useReducedMotion();
  const [pictures, setPictures] = useState<Picture[] | null>(null);
  const [order, setOrder] = useState<Picture[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [baskets, setBaskets] = useState(emptyBaskets);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState(false);
  const [hoverVowel, setHoverVowel] = useState<Vowel | null>(null);
  const [litVowel, setLitVowel] = useState<Vowel | null>(null);
  // After a miss: the basket picked gets an X, and the right one glows and wiggles while the picture flies into it.
  const [wrongVowel, setWrongVowel] = useState<Vowel | null>(null);
  const [answerVowel, setAnswerVowel] = useState<Vowel | null>(null);

  // Display-only: the learner name and photo the child already picked on /learner; never used for grading.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  const records = useRef<Record<string, PictureRecord>>({});
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
          const answer = row.correctAnswer.answer as Vowel;
          if (!(row.questionKey in WORDS) || !VOWELS.some((v) => v.id === answer)) {
            throw new Error(`Question ${row.questionKey} needs a known picture and a vowel answer`);
          }
          return { id: row.questionKey, answer };
        });
        records.current = Object.fromEntries(mapped.map((p) => [p.id, { firstAnswer: null, attempts: 0, done: false }]));
        setPictures(mapped);
        setOrder(shuffle(mapped));
      } catch (err) {
        console.error("Failed to load Vowel Baskets questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const { speak, speakAll, stop } = useSpeech();
  useEffect(() => stop, [stop]);

  // Says each picture's name as its card appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!current) return;
    const name = WORDS[current.id].name;
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["vowels review"], name]);
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

  // Puts the picture in its basket, says why it belongs there, then moves on; only a right first pick earns a star.
  const place = (picture: Picture, earned: boolean) => {
    const lead = earned ? RIGHT : CORRECT_LEAD;
    playTones([523, 659, 784], "sine");
    setBaskets((b) => ({ ...b, [picture.answer]: [...b[picture.answer], picture.id] }));
    if (earned) setStars((s) => Math.min(s + 1, order.length));
    setLitVowel(picture.answer);
    const isLast = index === order.length - 1;
    speak(`${lead} ${correctSpeech(WORDS[picture.id].name, VOWELS.find((v) => v.id === picture.answer)!)}`, () => {
      setLitVowel(null);
      setWrongVowel(null);
      setAnswerVowel(null);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score; it is sent once the result line has been spoken.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), order.length), handleFinish);
    });
  };

  const answer = (vowel: Vowel) => {
    if (!current || lockedRef.current) return;
    lock(true);
    setSelected(false);
    setHoverVowel(null);

    // One try per picture: the first basket picked is the answer that is graded.
    const rec = records.current[current.id];
    if (!rec.done) {
      rec.attempts += 1;
      rec.firstAnswer ??= vowel;
      rec.done = true;
    }

    if (vowel === current.answer) return place(current, true);

    playTones([330, 247], "triangle");
    setWrongVowel(vowel);
    if (!reduceMotion) void animateShake(shakeScope.current, { x: [0, -12, 12, -8, 8, 0] }, { duration: 0.45 });
    const picture = current;
    speak(WRONG, () => {
      setAnswerVowel(picture.answer);
      place(picture, false);
    });
  };

  // The basket under the pointer, found through its data-vowel attribute.
  const vowelAt = (point: { x: number; y: number }): Vowel | null => {
    for (const el of document.elementsFromPoint(point.x - window.scrollX, point.y - window.scrollY)) {
      const basket = el.closest<HTMLElement>("[data-vowel]");
      if (basket) return basket.dataset.vowel as Vowel;
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

  if (!pictures) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

  const basket = (v: (typeof VOWELS)[number], i: number) => {
    const isTarget = !locked && (hoverVowel === v.id || (selected && hoverVowel === null));
    return (
      <motion.button
        key={v.id}
        type="button"
        data-vowel={v.id}
        onClick={() => selected && answer(v.id)}
        disabled={stage !== "playing"}
        aria-label={`${v.label} basket${baskets[v.id].length ? `, holding ${baskets[v.id].map((w) => WORDS[w].name).join(" and ")}` : ""}`}
        animate={{ y: stage === "done" ? [0, -24, 0, -10, 0] : 0, rotate: answerVowel === v.id ? [0, -5, 5, -4, 4, 0] : 0, scale: answerVowel === v.id ? 1.25 : 1 }}
        transition={{
          y: { duration: 1, delay: stage === "done" ? i * 0.12 : 0, ease: "easeOut" },
          rotate: answerVowel === v.id ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 },
          scale: { duration: 0.4, ease: EASE_OUT },
        }}
        style={{ zIndex: answerVowel === v.id ? 1 : undefined, transformOrigin: "50% 100%" }}
        className={`${styles.basket} ${isTarget ? styles.target : ""} ${answerVowel === v.id ? styles.showAnswer : ""} rounded-2xl ${focusRing}`}
      >
        <span className={styles.basketArt}>
          <Image src={ASSETS.basket} alt="" fill loading="eager" sizes="360px" className="pointer-events-none object-contain" draggable={false} />
        </span>
        <span className="pointer-events-none absolute inset-x-[11%] -top-[14%] bottom-[59%] flex items-end justify-center gap-[4%]">
          {baskets[v.id].map((w) => (
            <motion.span
              key={w}
              layoutId={`picture-${w}`}
              className={`${styles.thumb} relative h-full max-w-[48%] flex-1`}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              <Image src={WORDS[w].image} alt="" fill sizes="100px" className="object-contain" draggable={false} />
            </motion.span>
          ))}
        </span>
        {/* The basket's front drawn again over the pictures, so they sit down inside the opening. */}
        <span className={`${styles.basketArt} ${styles.basketFront}`}>
          <Image src={ASSETS.basket} alt="" fill loading="eager" sizes="360px" className="pointer-events-none object-contain" draggable={false} />
        </span>
        {wrongVowel === v.id && (
          <motion.span
            aria-hidden
            className={`${styles.wrongMark} pointer-events-none absolute inset-x-0 top-[2%] flex justify-center font-black leading-none`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            ✕
          </motion.span>
        )}
        <motion.span
          className={`${styles.label} ${litVowel === v.id ? styles.lit : ""} pointer-events-none absolute flex items-center justify-center rounded-[3cqw] font-extrabold leading-none`}
          style={{ ...PLATE, fontSize: "17cqw" }}
          animate={{ scale: litVowel === v.id && !reduceMotion ? [1, 1.25, 1.1] : 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          {v.label}
        </motion.span>
      </motion.button>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className={`${styles.screen} fixed inset-0 flex h-dvh w-full select-none flex-col overflow-hidden px-4 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5`}>
        <Image src={ASSETS.background} alt="" fill preload sizes="100vw" className="pointer-events-none z-0 object-cover object-bottom" />

        {/* header: learner, title, stars, sound */}
        {/* Phones held upright put the title on its own line under the learner and stars. */}
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
            {activityName || "Vowel Review — Vowel Baskets"}
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
              onClick={() => current && speak(WORDS[current.id].name)}
              disabled={!current || locked}
              aria-label="Hear the picture's name again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* the picture card, or the goodbye message once every picture is sorted */}
        <div className="relative z-20 flex min-h-0 flex-1 items-center justify-center py-2">
          <AnimatePresence mode="popLayout">
            {/* Leaves the moment it lands in its basket, so the basket's copy can fly in from where the card was. */}
            {current && !baskets[current.answer].includes(current.id) && (
              <motion.div ref={shakeScope} key={`${current.id}-${index}`} className="relative">
                <motion.button
                  type="button"
                  layoutId={`picture-${current.id}`}
                  aria-label={`${WORDS[current.id].name}. ${selected ? "Picked up — now tap a basket." : "Tap to pick up, or drag to a basket."}`}
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
                  onDrag={(_: unknown, info: PanInfo) => setHoverVowel(vowelAt(info.point))}
                  onDragEnd={(_: unknown, info: PanInfo) => {
                    setHoverVowel(null);
                    const v = vowelAt(info.point);
                    if (v) answer(v);
                  }}
                  onClick={() => {
                    if (draggedRef.current || locked) return;
                    setSelected((s) => !s);
                  }}
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: selected ? 1.06 : 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className={`${styles.card} ${selected ? styles.selected : ""} relative flex aspect-square flex-col gap-[2%] w-[clamp(96px,min(30dvh,42vw),260px)] items-center justify-center rounded-3xl ${focusRing}`}
                >
                  <span className="pointer-events-none relative h-[66%] w-[80%]">
                    <Image src={WORDS[current.id].image} alt="" fill sizes="260px" className="object-contain" draggable={false} />
                  </span>
                  <span className="pointer-events-none text-[clamp(16px,4.5dvh,36px)] font-extrabold leading-none">{WORDS[current.id].name}</span>
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

        {/* five baskets in a row when the screen is wide, three over two when it is upright */}
        <div className={`${styles.baskets} relative z-10 shrink-0`}>
          {[VOWELS.slice(0, 3), VOWELS.slice(3)].map((row, r) => (
            <div key={r} className={styles.basketRow}>
              {row.map((v, i) => basket(v, r * 3 + i))}
            </div>
          ))}
        </div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
