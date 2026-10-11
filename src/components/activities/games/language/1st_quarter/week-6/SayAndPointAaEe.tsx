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
import { FRIENDS, INSTRUCTION, PROMPT, WRONG, DONE_TEXT, rightSpeech, revealSpeech, resultSpeech, type FriendId } from "./SayAndPointAaEe.data";
import styles from "./SayAndPointAaEe.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the game waits after "Say it with me" so the child can say the letter aloud.
const SAY_PAUSE_MS = 1300;

interface Round {
  id: string;
  letter: string;
  answer: FriendId;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function SayAndPointAaEe({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // Which friend has the cookie, the friend picked by mistake, and whether the right friend is being shown after a miss.
  const [cookieAt, setCookieAt] = useState<FriendId | null>(null);
  const [wrongPick, setWrongPick] = useState<FriendId | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The first friend tapped for each cookie is the graded answer.
  const answers = useRef<Record<string, FriendId>>({});
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
            const letter = (row.questionData as { letter?: unknown } | null)?.letter;
            const answer = row.correctAnswer.answer as FriendId;
            if (typeof letter !== "string" || letter.toLowerCase() !== answer || !FRIENDS.some((f) => f.id === answer)) {
              throw new Error(`Question ${row.questionKey} needs an A or E cookie that matches its friend`);
            }
            return { id: row.questionKey, letter, answer };
          }),
        );
      } catch (err) {
        console.error("Failed to load Say and Point: Aa and Ee questions:", err);
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

  // Asks who eats each cookie as it appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["say and point: aa and ee"], PROMPT]);
      return;
    }
    speak(PROMPT);
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

  // Pending "say it" pause, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // After a moment for the child to say the letter, the next cookie comes, or the result is spoken and sent.
  const next = (earned: boolean) => {
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setCookieAt(null);
      setWrongPick(null);
      setRevealed(false);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, SAY_PAUSE_MS);
  };

  // One try per cookie: the right friend munches it; a wrong friend shakes its head with an X, then the cookie flies to the glowing right friend with no star.
  const feed = (friend: FriendId) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= friend;
    setCookieAt(friend);
    if (friend === round.answer) {
      playTones([523, 659, 784], "sine");
      setStars((s) => Math.min(s + 1, total));
      return speak(rightSpeech(round.letter), () => next(true));
    }

    playTones([330, 247], "triangle");
    setWrongPick(friend);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      setCookieAt(r.answer);
      playTones([523, 659, 784], "sine");
      speak(revealSpeech(r.letter, FRIENDS.find((f) => f.id === r.answer)!.name), () => next(false));
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

  // One cookie per round; its layoutId carries it from the middle to whichever friend it goes to.
  const cookie = (r: Round, onPlate: boolean) => (
    <motion.span
      layoutId={`cookie-${index}`}
      initial={onPlate ? false : { scale: 0, rotate: -40 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className={`${styles.cookie} ${onPlate ? styles.onPlate : ""} pointer-events-none flex items-center justify-center rounded-full font-extrabold leading-none`}
      aria-label={`Cookie with ${r.letter === r.letter.toUpperCase() ? "big" : "small"} ${r.letter}`}
    >
      {r.letter}
    </motion.span>
  );

  const friendCard = (f: (typeof FRIENDS)[number]) => {
    const isWrong = wrongPick === f.id;
    const isAnswer = revealed && round?.answer === f.id;
    const eating = round && cookieAt === f.id && round.answer === f.id;
    return (
      <motion.button
        type="button"
        onClick={() => feed(f.id)}
        disabled={!round || locked}
        aria-label={`${f.name}, letter ${f.label}`}
        animate={
          isWrong
            ? { rotate: [0, -8, 8, -6, 6, 0], opacity: 0.6 }
            : eating
              ? { scale: isAnswer ? [1.15, 1.22, 1.15] : [1, 1.08, 1], opacity: 1 }
              : { scale: isAnswer ? 1.15 : 1, opacity: 1 }
        }
        transition={{ duration: 0.55, ease: EASE_OUT }}
        style={{ transformOrigin: "50% 100%" }}
        className={`${styles.friend} ${isAnswer ? styles.showAnswer : ""} relative flex flex-col items-center gap-[4%] rounded-3xl p-[6%] disabled:cursor-default ${focusRing}`}
      >
        <span className={`${styles.sign} rounded-2xl px-[0.4em] py-[0.05em] font-extrabold leading-none`}>{f.label}</span>
        <span className="pointer-events-none relative block aspect-square w-[74%]">
          <Image src={f.image} alt="" fill sizes="220px" className="object-contain" draggable={false} />
        </span>
        <span className="text-[calc(var(--friend-w)*0.1)] font-extrabold leading-none">{f.name}</span>
        {/* the plate the cookie lands on */}
        <span className="pointer-events-none absolute -right-[8%] top-[22%] z-10">{round && cookieAt === f.id && cookie(round, true)}</span>
        {isWrong && (
          <motion.span
            aria-hidden
            className={`${styles.wrongMark} pointer-events-none absolute inset-0 z-20 flex items-center justify-center font-black leading-none`}
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
            {activityName || "Say and Point: Aa and Ee"}
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
              onClick={() => round && speak(PROMPT)}
              disabled={!round || locked}
              aria-label="Hear the question again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
          {round ? (
            <div className={`${styles.picnic} gap-x-[clamp(12px,4vw,56px)] gap-y-[clamp(14px,3dvh,32px)]`}>
              <div className={styles.slotA}>{friendCard(FRIENDS[0])}</div>
              {/* the cookie waits in the middle until a friend is tapped */}
              <div className={`${styles.slotCookie} flex items-center justify-center`} style={{ minHeight: "var(--cookie)", minWidth: "var(--cookie)" }}>
                {cookieAt === null && cookie(round, false)}
              </div>
              <div className={styles.slotE}>{friendCard(FRIENDS[1])}</div>
            </div>
          ) : (
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
                {stars} / {total}
              </div>
              <p className="text-xl font-bold sm:text-2xl">
                You got {stars} of {total} correct!
              </p>
            </motion.div>
          )}
        </div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
