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
import { STOPS, PICTURES, INSTRUCTION, RIGHT, WRONG, DONE_TEXT, promptSpeech, stopSpeech, resultSpeech, type Vowel } from "./VowelPictureSort.data";
import styles from "./VowelPictureSort.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface Round {
  id: string;
  answer: Vowel;
}

interface QuestionRow {
  questionKey: string;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function VowelPictureSort({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // Whether the bus has driven off, the stop each passenger waits at, the stop picked by mistake, and whether the right stop is being shown.
  const [busAway, setBusAway] = useState(false);
  const [placed, setPlaced] = useState<Record<string, Vowel>>({});
  const [wrongPick, setWrongPick] = useState<Vowel | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The first stop tapped for each picture is the graded answer.
  const answers = useRef<Record<string, Vowel>>({});
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
            const answer = row.correctAnswer.answer as Vowel;
            if (!(row.questionKey in PICTURES) || !STOPS.some((s) => s.id === answer)) {
              throw new Error(`Question ${row.questionKey} needs a known picture and a vowel answer`);
            }
            return { id: row.questionKey, answer };
          }),
        );
      } catch (err) {
        console.error("Failed to load Vowel Picture Sort questions:", err);
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

  // Says each passenger's name as its bus pulls in; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.id);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["vowel picture sort"], prompt]);
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

  // The passenger is at the right stop: chime, the sound and the stop are said, then the next bus comes; only a right first pick earns a star.
  const arrive = (r: Round, earned: boolean, lead: string) => {
    playTones([523, 659, 784], "sine");
    if (earned) setStars((s) => Math.min(s + 1, total));
    const isLast = index === total - 1;
    const stopInfo = STOPS.find((s) => s.id === r.answer)!;
    speak(`${lead} ${stopSpeech(r.id, stopInfo)}`.trim(), () => {
      setWrongPick(null);
      setRevealed(false);
      lock(false);
      if (!isLast) {
        setBusAway(false);
        return setIndex((i) => i + 1);
      }
      // Stars are the right first picks, so the final count is the score; it is sent once the result line has been spoken.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    });
  };

  // One try per picture: the bus drives off and the passenger gets off at the tapped stop; a wrong stop gets an X, then the passenger walks to the right one with no star.
  const pick = (vowel: Vowel) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= vowel;
    setBusAway(true);
    setPlaced((p) => ({ ...p, [round.id]: vowel }));
    if (vowel === round.answer) return arrive(round, true, RIGHT);

    playTones([330, 247], "triangle");
    setWrongPick(vowel);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      setPlaced((p) => ({ ...p, [r.id]: r.answer }));
      arrive(r, false, "");
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

  const busStop = (s: (typeof STOPS)[number]) => {
    const isWrong = wrongPick === s.id;
    const isAnswer = revealed && round?.answer === s.id;
    const riders = Object.keys(placed).filter((id) => placed[id] === s.id);
    return (
      <div key={s.id} className={`${styles.stop} relative z-10 flex shrink-0 flex-col items-center`}>
        <motion.button
          type="button"
          onClick={() => pick(s.id)}
          disabled={!round || locked}
          aria-label={`Bus stop ${s.label}`}
          animate={isWrong ? { x: [0, -8, 8, -4, 4, 0] } : { scale: isAnswer ? 1.15 : 1 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          style={{ transformOrigin: "50% 100%" }}
          className={`${isAnswer ? styles.showAnswer : ""} relative flex w-full flex-col items-center rounded-2xl disabled:cursor-default ${focusRing}`}
        >
          <span
            className={`${styles.sign} relative flex aspect-square w-[78%] items-center justify-center rounded-full font-extrabold leading-none`}
            style={{ "--stop-color": s.color } as React.CSSProperties}
          >
            {s.label}
            {isWrong && (
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
          </span>
          <span className={`${styles.pole} block h-[calc(var(--stop-w)*0.3)] w-[9%] rounded-b-sm`} />
        </motion.button>
        {/* the passengers waiting at this stop; each keeps its layoutId, so a corrected one walks over to the right stop */}
        <div className="flex h-[calc(var(--stop-w)*0.8)] w-full items-center justify-center gap-1 px-[4%]">
          {riders.map((id) => (
            <motion.div
              key={id}
              layoutId={`rider-${id}`}
              initial={revealed && id === round?.id ? false : { y: -30, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: revealed ? 0 : 0.25 }}
              className={`${styles.passenger} relative aspect-square min-w-0 max-w-[76%] flex-1 rounded-xl`}
            >
              <Image src={PICTURES[id].image} alt={PICTURES[id].name} fill sizes="120px" className="object-contain p-[8%]" draggable={false} />
            </motion.div>
          ))}
        </div>
      </div>
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
            {activityName || "Vowel Picture Sort"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* instruction with the replay button */}
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

        <div className={`${styles.board} relative flex min-h-0 flex-1 flex-col items-center justify-around gap-[clamp(10px,2.5dvh,28px)] py-2`}>
          {round ? (
            // A fresh bus pulls in for every picture, then drives off once a stop is tapped.
            <motion.div
              key={`${round.id}-${index}`}
              initial={{ x: "-60%", opacity: 0 }}
              animate={busAway ? { x: "70%", opacity: 0 } : { x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className={`${styles.bus} relative shrink-0`}
            >
              <motion.div
                className="absolute inset-0"
                animate={busAway ? { y: 0 } : { y: [0, -4, 0] }}
                transition={busAway ? { duration: 0.2 } : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className={`${styles.busBody} absolute inset-x-0 bottom-[14%] top-0`} />
                <span className={`${styles.busWindow} absolute left-[7%] top-[11%] h-[52%] w-[60%] overflow-hidden rounded-[14%]`}>
                  {!busAway && (
                    <Image src={PICTURES[round.id].image} alt={PICTURES[round.id].name} fill preload sizes="280px" className="object-contain p-[6%]" draggable={false} />
                  )}
                </span>
                <span className={`${styles.nameBoard} absolute left-[7%] top-[65%] flex h-[15%] w-[60%] items-center justify-center truncate font-extrabold leading-none`}>
                  {PICTURES[round.id].name}
                </span>
                <span className={`${styles.windshield} absolute right-[5%] top-[11%] h-[40%] w-[21%] rounded-[16%] rounded-tr-[45%]`} />
                <span className={`${styles.light} absolute right-[2%] top-[58%] aspect-square w-[7%] rounded-full`} />
                <span className={`${styles.wheel} absolute bottom-0 left-[13%] aspect-square w-[19%] rounded-full`} />
                <span className={`${styles.wheel} absolute bottom-0 right-[15%] aspect-square w-[19%] rounded-full`} />
              </motion.div>
            </motion.div>
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
          {/* the street: one stop per vowel on a shared sidewalk; the groups stay on screen to the end */}
          <div className={`${styles.street} relative flex shrink-0 items-start justify-center gap-[clamp(4px,1.2vw,20px)] px-2`}>
            <span className={`${styles.curb} pointer-events-none absolute inset-x-0 bottom-0 h-[calc(var(--stop-w)*0.8)] rounded-2xl`} />
            {STOPS.map(busStop)}
          </div>
        </div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
