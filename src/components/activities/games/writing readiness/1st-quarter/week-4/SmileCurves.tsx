"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";
import { Circle, Image as KonvaImage, Line } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import TracePad, { flat } from "./TracePad";
import {
  VIEW_W,
  VIEW_H,
  FACE_BOX,
  FRIENDS,
  MOUTH_PATH,
  INSTRUCTION,
  WRONG,
  REVEAL,
  DONE_TEXT,
  isFriend,
  promptSpeech,
  rightSpeech,
  resultSpeech,
  type FriendKey,
} from "./SmileCurves.data";
import styles from "./SmileCurves.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long a smiling friend stays before the next one.
const NEXT_PAUSE_MS = 900;

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

/** Loads a picture for Konva, which can't draw next/image's <img>; null until it has loaded. */
function useBoardImage(src: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = new window.Image();
    el.onload = () => setImg(el);
    el.src = src;
    return () => {
      el.onload = null;
    };
  }, [src]);
  // A picture still held from an earlier src is never shown for the new one.
  return img?.src.endsWith(src) ? img : null;
}

/** A friend's face picture, with rosy cheeks by the mouth corners once it smiles. */
function FaceDrawing({ friend, happy }: { friend: FriendKey; happy: boolean }) {
  const img = useBoardImage(FRIENDS[friend].image);
  if (!img) return null;
  const { x, bottom, h } = FACE_BOX;
  const w = (h * img.width) / img.height;
  return (
    <>
      <KonvaImage image={img} x={x - w / 2} y={bottom - h} width={w} height={h} />
      {happy && [-1, 1].map((s) => <Circle key={s} x={x + s * 165} y={275} radius={28} fill="#ff6f91" opacity={0.45} />)}
    </>
  );
}

export default function SmileCurves({ activityId, activityName, onFinish }: GameComponentProps) {
  const [friends, setFriends] = useState<FriendKey[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  // Whether each smile was traced right on the first try.
  const [results, setResults] = useState<boolean[]>([]);
  // The current friend smiles (cheeks and a hop) once its mouth is drawn.
  const [happy, setHappy] = useState(false);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(true);
  const [wrong, setWrong] = useState(false);
  const [demo, setDemo] = useState(false);
  // The first try at each smile is the graded answer.
  const answers = useRef<Record<string, string>>({});
  const friend = stage === "playing" ? friends?.[index] : undefined;
  const total = friends?.length ?? 0;
  const stars = results.filter(Boolean).length;

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
        setFriends(
          rows.map((row) => {
            if (!isFriend(row.questionKey)) throw new Error(`Question ${row.questionKey} needs to be a known friend`);
            return row.questionKey;
          }),
        );
      } catch (err) {
        console.error("Failed to load Smile Curves questions:", err);
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

  // A ref, not only state, so a stroke landing as the lock flips can't count twice.
  const lockedRef = useRef(true);
  const lock = (on: boolean) => {
    lockedRef.current = on;
    setLocked(on);
  };

  // Reads each friend as it comes up, then opens the board; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!friend) return;
    const prompt = promptSpeech(friend);
    const open = () => lock(false);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["smile curves"], prompt], open);
      return;
    }
    speak(prompt, open);
  }, [friend, speak, speakAll]);

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

  const finishedRef = useRef(false);
  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const submitted: SubmittedAnswer[] = Object.entries(answers.current).map(([id, response]) => ({ questionId: id, response }));
    onFinish?.(submitted);
  };

  // Pending pause after a smile, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The friend is smiling: the next one comes, or the result is spoken and sent.
  const finishSmile = (earned: boolean) => {
    setResults((r) => [...r, earned]);
    setHappy(true);
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setWrong(false);
      setDemo(false);
      setHappy(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first tries, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  // One try per smile: a good trace makes the friend beam with a star; a miss turns red, then the pencil shows the smile glowing, with no star.
  const onAttempt = (pass: boolean) => {
    if (!friend || lockedRef.current) return;
    lock(true);
    answers.current[friend] ??= pass ? "correct" : "missed";
    if (pass) {
      playTones([523, 659, 784], "sine");
      setHappy(true);
      return speak(rightSpeech(friend), () => finishSmile(true));
    }
    playTones([330, 247], "triangle");
    setWrong(true);
    speak(WRONG, () => setDemo(true));
  };

  const onDemoEnd = () => speak(REVEAL, () => finishSmile(false));

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4 text-center`}>
        <p className="text-lg font-bold">Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!friends) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

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
            {activityName || "Smile Curves"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* the instruction with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{friend ? INSTRUCTION : DONE_TEXT}</p>
            <button
              type="button"
              onClick={() => friend && speak(promptSpeech(friend))}
              disabled={!friend || demo}
              aria-label="Hear the instruction again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* the friend's face: the mouth is the undercurve to trace; the face hops when it smiles */}
        <motion.div
          className="relative flex min-h-0 flex-1 items-center justify-center py-2"
          animate={wrong && !demo ? { x: [0, -10, 10, -6, 6, 0] } : happy ? { y: [0, -18, 0, -8, 0] } : { x: 0, y: 0 }}
          transition={{ duration: happy ? 0.7 : 0.45 }}
        >
          {friend ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={friend}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="h-full w-full"
              >
                <TracePad
                  viewW={VIEW_W}
                  viewH={VIEW_H}
                  path={MOUTH_PATH}
                  under={<FaceDrawing friend={friend} happy={happy} />}
                  guideColor="#3b2a1a"
                  inkColor="#3b2a1a"
                  inkWidth={14}
                  disabled={locked}
                  demo={demo}
                  onDemoEnd={onDemoEnd}
                  onAttempt={onAttempt}
                  className={`${styles.board} h-full w-full`}
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            // every friend from the game, all smiling (pale if missed), once it is done
            <div className={`${styles.parade} flex flex-wrap content-center items-center justify-center`} aria-hidden>
              {friends.map((f, i) => (
                <motion.span
                  key={f}
                  className={`${styles.friendMini} relative block`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: results[i] ? 1 : 0.55, y: [0, -10, 0] }}
                  transition={{ opacity: { delay: i * 0.12, duration: 0.5 }, y: { repeat: Infinity, duration: 1.6, delay: i * 0.2 } }}
                >
                  <TracePad
                    viewW={VIEW_W}
                    viewH={VIEW_H}
                    path={MOUTH_PATH}
                    under={
                      <>
                        <FaceDrawing friend={f} happy />
                        <Line points={flat(MOUTH_PATH)} stroke="#3b2a1a" strokeWidth={14} lineCap="round" />
                      </>
                    }
                    guideColor="transparent"
                    inkColor="transparent"
                    disabled
                    demo={false}
                    onAttempt={() => {}}
                    showGuide={false}
                    className="h-full w-full"
                  />
                </motion.span>
              ))}
            </div>
          )}
          <AnimatePresence>
            {wrong && !demo && (
              <motion.span
                aria-hidden
                className={`${styles.wrongMark} pointer-events-none absolute inset-0 flex items-center justify-center font-black leading-none`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                ✕
              </motion.span>
            )}
          </AnimatePresence>
          {stage === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.3 }}
              className={`${styles.doneCard} absolute bottom-[6%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded-3xl px-6 py-3 text-center`}
              role="status"
            >
              <div className={`${styles.doneScore} flex items-center gap-2 text-4xl font-extrabold tabular-nums sm:text-5xl`}>
                <Star aria-hidden="true" className="h-9 w-9 text-[#f2b134] sm:h-11 sm:w-11" fill="#f2b134" strokeWidth={2.2} />
                {stars} / {total}
              </div>
              <p className="whitespace-nowrap text-lg font-bold sm:text-2xl">
                You got {stars} of {total} correct!
              </p>
            </motion.div>
          )}
        </motion.div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
