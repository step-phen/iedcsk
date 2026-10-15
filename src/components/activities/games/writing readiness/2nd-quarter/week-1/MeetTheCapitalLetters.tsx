"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  VIEW_W,
  VIEW_H,
  LETTERS,
  INSTRUCTION,
  REVEAL,
  isTarget,
  promptSpeech,
  correctSpeech,
  revealSpeech,
  resultHeadline,
  resultSpeech,
  type Point,
  type Target,
} from "./MeetTheCapitalLetters.data";
import styles from "./MeetTheCapitalLetters.module.css";

interface Round {
  key: string;
  target: Target;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

// intro: greeting plays; watch: the plane skywrites; pick: the child taps a cloud; then right, or wrong → reveal.
type Mode = "intro" | "watch" | "pick" | "right" | "wrong" | "reveal";

// How long one stroke of smoke takes to write.
const STROKE_MS = 1300;
// How long the wrong cloud shakes on its own before the right one lights up.
const WRONG_MS = 600;

const isCapital = (c: unknown): c is string => typeof c === "string" && /^[A-Z]$/.test(c);

function buildRound(row: QuestionRow): Round {
  const { target, choices } = (row.questionData ?? {}) as { target?: unknown; choices?: unknown };
  if (!isTarget(target) || row.correctAnswer.answer !== target) throw new Error(`Question ${row.questionKey} needs a skywritten "target" that is its answer`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isCapital) || new Set(choices).size !== choices.length || !choices.includes(target)) {
    throw new Error(`Question ${row.questionKey} needs different capital-letter "choices" that include its target`);
  }
  return { key: row.questionKey, target, choices };
}

const pointsAttr = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

/** A little red plane seen from above, nose pointing right. */
function Plane() {
  return (
    <g>
      <path d="M-30 0 L-40 -16 L-31 -16 L-20 -3 Z M-30 0 L-40 16 L-31 16 L-20 3 Z" fill="#b83232" />
      <path d="M-2 -6 L-14 -36 L-3 -36 L14 -6 Z M-2 6 L-14 36 L-3 36 L14 6 Z" fill="#c93d3d" />
      <path d="M-32 0 Q-30 -9 0 -9 L22 -6 Q36 0 22 6 L0 9 Q-30 9 -32 0 Z" fill="#ef5350" stroke="#9e2a2a" strokeWidth={2} />
      <circle cx={17} cy={0} r={4} fill="#cfeaff" />
    </g>
  );
}

/** A puffy cloud the letter choice sits on. */
function CloudShape() {
  return (
    <svg viewBox="0 0 140 96" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path
        d="M30 86 C10 86 2 70 8 56 C2 40 16 26 32 30 C36 12 58 4 74 14 C86 2 112 6 116 28 C134 30 140 50 132 62 C138 78 124 88 108 86 Z"
        fill="currentColor"
        stroke="var(--cloud-edge)"
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MeetTheCapitalLetters({ activityId, activityName, onFinish }: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);

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
        setRounds(rows.map(buildRound));
      } catch (err) {
        console.error("Failed to load Meet the Capital Letters questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [mode, setMode] = useState<Mode>("intro");
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "Meet the Capital Letters";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Skywriting progress, 0 to 1 across all strokes; each bump of flight replays it from the start.
  const [flight, setFlight] = useState(0);
  const [t, setT] = useState(0);
  const flownRef = useRef<(() => void) | undefined>(undefined);
  const strokeCount = round ? LETTERS[round.target].strokes.length : 1;
  useEffect(() => {
    if (flight === 0) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (STROKE_MS * strokeCount), 1);
      setT(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else flownRef.current?.();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [flight, strokeCount]);

  // The clouds open only once the letter is written and the prompt is heard, whichever finishes last.
  const waitingRef = useRef(0);
  const settle = useCallback(() => {
    waitingRef.current -= 1;
    if (waitingRef.current === 0) {
      lockedRef.current = false;
      setMode("pick");
    }
  }, []);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    const watch = () => {
      waitingRef.current = 2;
      flownRef.current = settle;
      speak(promptSpeech(round.target), settle, {
        onStart: () => {
          setMode("watch");
          setFlight((f) => f + 1);
        },
      });
    };
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["meet the capital letters"]], watch);
      return;
    }
    watch();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const replay = () => {
    if (!round) return;
    flownRef.current = undefined;
    setFlight((f) => f + 1);
    speak(promptSpeech(round.target));
  };

  const advance = useCallback(() => {
    setPicked(null);
    setT(0);
    if (roundIndex + 1 >= total) setComplete(true);
    else {
      setMode("intro");
      setRoundIndex(roundIndex + 1);
    }
  }, [roundIndex, total]);

  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lockedRef.current = true;
    const choice = round.choices[i];
    const earned = choice === round.target;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    setPicked(i);
    if (earned) {
      setMode("right");
      speak(correctSpeech(round.target), advance);
      return;
    }
    setMode("wrong");
    const target = round.target;
    timerRef.current = window.setTimeout(() => {
      setMode("reveal");
      speak(revealSpeech(target), advance, { minMs: REVEAL_MIN_MS });
    }, WRONG_MS);
  };

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (complete) speak(resultLine, finishOnce);
  }, [complete, resultLine, speak, finishOnce]);

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Fueling the plane…</p>
      </div>
    );
  }

  // Each stroke shows as much smoke as the plane has flown of it; the plane sits at the newest puff.
  const strokes = LETTERS[round.target].strokes;
  const smoke = strokes.map((s, i) => {
    const f = Math.min(Math.max(t * strokes.length - i, 0), 1);
    return f > 0 ? s.slice(0, Math.max(2, Math.round(f * (s.length - 1)) + 1)) : [];
  });
  const current = smoke.filter((s) => s.length > 1).pop();
  const flying = t > 0 && t < 1 && current;
  const tip = current?.[current.length - 1];
  const prev = current?.[current.length - 2];
  const heading = tip && prev ? (Math.atan2(tip.y - prev.y, tip.x - prev.x) * 180) / Math.PI : 0;

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.drift} pointer-events-none absolute inset-0`} />

      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {!complete && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(20px,3.6vh,30px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {complete ? (
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center">
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You found {score} of {total} letters!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(20,60,110,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            {/* After a miss the instruction pill turns green and says why the right cloud is glowing. */}
            <p className={cn(styles.instruction, mode === "reveal" && styles.revealNote, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {mode === "reveal" ? REVEAL : INSTRUCTION}
            </p>
            <button
              type="button"
              onClick={replay}
              disabled={mode !== "pick"}
              aria-label="Watch the plane again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2vmin,24px)] py-2 landscape:flex-row">
            {/* The patch of sky the plane writes in, sized from its box so it never spills. */}
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch [container-type:size]">
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className={cn(styles.sky, "h-[min(100cqh,calc(100cqw*0.84))] w-[min(100cqw,calc(100cqh/0.84))] overflow-visible")}
                role="img"
                aria-label={mode === "right" || mode === "reveal" ? `Capital ${round.target} written in smoke` : "A letter written in smoke"}
              >
                {smoke.map((s, i) => s.length > 1 && <polyline key={`${round.key}-${i}`} points={pointsAttr(s)} className={cn(styles.smoke, (mode === "right" || mode === "reveal") && styles.smokeDone)} />)}
                {flying && tip && (
                  <g transform={`translate(${tip.x} ${tip.y}) rotate(${heading})`}>
                    <Plane />
                  </g>
                )}
              </svg>
            </div>

            <div className="flex shrink-0 flex-row items-center justify-center gap-[clamp(8px,2.4vw,26px)] landscape:flex-col">
              {round.choices.map((letter, i) => {
                const isTargetChoice = letter === round.target;
                return (
                  <button
                    key={`${round.key}-${letter}`}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={mode !== "pick"}
                    aria-label={`Capital ${letter}`}
                    className={cn(
                      styles.cloud,
                      "relative h-[clamp(64px,15vmin,124px)] w-[clamp(92px,21vmin,178px)] shrink-0 disabled:cursor-default",
                      mode === "intro" || mode === "watch" ? styles.cloudWaiting : undefined,
                      picked === i && mode === "wrong" && styles.cloudWrong,
                      picked === i && mode === "reveal" && styles.cloudMissed,
                      picked === i && mode === "right" && styles.cloudRight,
                      mode === "reveal" && isTargetChoice && styles.cloudReveal,
                      mode === "reveal" && !isTargetChoice && picked !== i && "opacity-50",
                    )}
                  >
                    <CloudShape />
                    <span className={`${styles.letter} pointer-events-none relative flex size-full items-center justify-center pt-[6%] text-[clamp(34px,8vmin,68px)] font-extrabold leading-none`}>{letter}</span>
                    {picked === i && (mode === "wrong" || mode === "reveal") && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-2 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
