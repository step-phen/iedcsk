"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { GROUPS, PICTURES, INSTRUCTION, WRONG, DONE_TEXT, promptSpeech, rightSpeech, revealSpeech, resultSpeech, type GroupId } from "./SortThePictures.data";
import styles from "./SortThePictures.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface Round {
  id: string;
  answer: GroupId;
}

interface QuestionRow {
  questionKey: string;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function SortThePictures({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The box each picture sits in, the box picked by mistake, and whether the right box is being shown after a miss.
  const [placed, setPlaced] = useState<Record<string, GroupId>>({});
  const [wrongPick, setWrongPick] = useState<GroupId | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The first box tapped for each picture is the graded answer.
  const answers = useRef<Record<string, GroupId>>({});
  const round = stage === "playing" ? rounds?.[index] : undefined;
  const total = rounds?.length ?? 0;

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
        setRounds(
          rows.map((row) => {
            const answer = row.correctAnswer.answer as GroupId;
            if (!(row.questionKey in PICTURES) || !GROUPS.some((g) => g.id === answer)) {
              throw new Error(`Question ${row.questionKey} needs a known picture and a box`);
            }
            return { id: row.questionKey, answer };
          }),
        );
      } catch (err) {
        console.error("Failed to load Sort the Pictures questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  // Display-only: the learner name and photo the child already picked on /learner; never used for grading.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  const { speak, speakAll, stop } = useSpeech();
  useEffect(() => stop, [stop]);

  // Names each picture as the belt brings it in; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.id);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["sort the pictures"], prompt]);
      return;
    }
    speak(prompt);
  }, [round, speak, speakAll]);

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

  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const lock = (on: boolean) => {
    lockedRef.current = on;
    setLocked(on);
  };

  const finishedRef = useRef(false);
  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const submitted: SubmittedAnswer[] = Object.entries(answers.current).map(([id, response]) => ({ questionId: id, response }));
    onFinish?.(submitted);
  };

  // The next picture rides in, or the result is spoken and sent.
  const next = (earned: boolean) => {
    setWrongPick(null);
    setRevealed(false);
    lock(false);
    if (index < total - 1) return setIndex((i) => i + 1);
    // Stars are the right first picks, so the final count is the score.
    setStage("done");
    speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
  };

  // One try per picture: it drops into the tapped box; a wrong box shakes with an X, then the picture hops to the glowing right box with no star.
  const sort = (group: GroupId) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= group;
    setPlaced((p) => ({ ...p, [round.id]: group }));
    if (group === round.answer) {
      playTones([523, 659, 784], "sine");
      setStars((s) => Math.min(s + 1, total));
      return speak(rightSpeech(round.id, round.answer), () => next(true));
    }

    playTones([330, 247], "triangle");
    setWrongPick(group);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      setPlaced((p) => ({ ...p, [r.id]: r.answer }));
      playTones([523, 659, 784], "sine");
      speak(revealSpeech(r.id, r.answer), () => next(false));
    });
  };

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4 text-center`}>
        <p className="text-lg font-bold">Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

  const box = (g: (typeof GROUPS)[number]) => {
    const isWrong = wrongPick === g.id;
    const isAnswer = revealed && round?.answer === g.id;
    const inside = Object.keys(placed).filter((id) => placed[id] === g.id);
    return (
      <motion.button
        key={g.id}
        type="button"
        onClick={() => sort(g.id)}
        disabled={!round || locked}
        aria-label={`${g.label} box`}
        animate={isWrong ? { x: [0, -10, 10, -6, 6, 0] } : { scale: isAnswer ? 1.12 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
        style={{ transformOrigin: "50% 100%", "--bin-color": g.color } as React.CSSProperties}
        className={`${styles.bin} ${isAnswer ? styles.showAnswer : ""} relative flex shrink-0 flex-col rounded-2xl disabled:cursor-default ${focusRing}`}
      >
        {/* the sorted pictures; each keeps its layoutId, so a corrected one hops over to the right box */}
        <span className={`${styles.binInside} flex flex-wrap content-end items-end justify-center gap-[4%] rounded-t-2xl p-[5%]`}>
          {inside.map((id) => (
            <motion.span
              key={id}
              layoutId={`picture-${id}`}
              transition={{ duration: 0.55, ease: EASE_OUT }}
              className={`${styles.sorted} relative block aspect-square rounded-xl`}
            >
              <Image src={PICTURES[id].image} alt={PICTURES[id].name} fill sizes="80px" className="object-contain p-[10%]" draggable={false} />
            </motion.span>
          ))}
        </span>
        <span className={`${styles.binFront} flex items-center justify-center rounded-b-2xl font-extrabold leading-none`}>{g.label}</span>
        {isWrong && (
          <motion.span
            aria-hidden
            className={`${styles.wrongMark} pointer-events-none absolute inset-0 z-10 flex items-center justify-center font-black leading-none`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            ✕
          </motion.span>
        )}
      </motion.button>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full select-none flex-col overflow-hidden px-4 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5`}>
        {/* header: learner, title, stars; upright phones put the title on its own line */}
        <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          {/* Both sides grow equally, so the title sits in the true middle even though the learner pill is wider than the stars. */}
          <div className="flex flex-1 items-center gap-2">
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
            {activityName || "Sort the Pictures"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* instruction (the feature to sort by) with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => round && speak(promptSpeech(round.id))}
              disabled={!round || locked}
              aria-label="Hear the picture's name again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className={`${styles.board} ${styles.factory} relative flex min-h-0 flex-1 flex-col items-center justify-around gap-[clamp(12px,3dvh,32px)] py-2`}>
          {round ? (
            // the belt, with the picture riding in from the left until it is sorted
            <div className="flex shrink-0 flex-col items-center">
              <div className="flex items-end justify-center" style={{ minHeight: "calc(var(--item-w) * 1.15)" }}>
                {!placed[round.id] && (
                  <motion.div
                    key={round.id}
                    layoutId={`picture-${round.id}`}
                    initial={{ x: "-45vw", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.9, ease: EASE_OUT }}
                    className={`${styles.item} flex aspect-[1/1.15] flex-col items-center justify-center gap-[4%] rounded-3xl`}
                  >
                    <span className="pointer-events-none relative block h-[64%] w-[76%]">
                      <Image src={PICTURES[round.id].image} alt={PICTURES[round.id].name} fill preload sizes="190px" className="object-contain" draggable={false} />
                    </span>
                    <span className={`${styles.itemName} font-extrabold leading-none`}>{PICTURES[round.id].name}</span>
                  </motion.div>
                )}
              </div>
              <span className={`${styles.belt} mt-1 block w-[min(88vw,calc(var(--bin-w)*2.4))] rounded-full`} />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className={`${styles.doneCard} flex max-w-md shrink-0 flex-col items-center gap-4 rounded-3xl px-6 py-5 text-center`}
              role="status"
            >
              <p className={`${styles.doneTitle} text-2xl font-extrabold leading-tight sm:text-3xl`}>{DONE_TEXT}</p>
              <div className={`${styles.doneScore} flex items-center gap-2 text-4xl font-extrabold tabular-nums sm:text-5xl`}>
                <Star aria-hidden="true" className="h-9 w-9 text-[#f2b134] sm:h-11 sm:w-11" fill="#f2b134" strokeWidth={2.2} />
                {stars} / {total}
              </div>
              <p className="text-xl font-bold sm:text-2xl">
                You got {stars} of {total} correct!
              </p>
            </motion.div>
          )}
          {/* the two boxes; the groups stay on screen to the end */}
          <div className="flex shrink-0 items-end justify-center gap-[clamp(16px,6vw,72px)]">{GROUPS.map(box)}</div>
        </div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
