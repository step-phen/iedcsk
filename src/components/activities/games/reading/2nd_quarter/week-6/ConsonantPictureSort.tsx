"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, MotionConfig, type PanInfo } from "framer-motion";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  CABS,
  INSTRUCTION,
  LETTERS,
  NEXT,
  REVEAL_TEXT,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ConsonantPictureSort.data";
import styles from "./ConsonantPictureSort.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface Round {
  key: string;
  word: string;
  /** Truck letters, left to right. */
  trucks: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "naming" | "choosing" | "feedback";

function buildRound(row: QuestionRow): Round {
  const { word, trucks } = row.questionData as { word: unknown; trucks: unknown };
  if (typeof word !== "string" || !Object.hasOwn(WORDS, word)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (!Array.isArray(trucks) || trucks.length !== 3 || !trucks.every((t) => typeof t === "string" && LETTERS.includes(t)) || new Set(trucks).size !== 3) {
    throw new Error(`Question ${row.questionKey} needs three different taught "trucks"`);
  }
  const answer = row.correctAnswer.answer;
  if (answer !== WORDS[word].letter || !trucks.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs its picture's first letter as the answer, on one of the trucks`);
  }
  return { key: row.questionKey, word, trucks: trucks as string[], answer };
}

// The truck under the pointer, found through its data-truck attribute.
function truckAt(point: { x: number; y: number }): string | null {
  for (const el of document.elementsFromPoint(point.x - window.scrollX, point.y - window.scrollY)) {
    const truck = el.closest<HTMLElement>("[data-truck]");
    if (truck) return truck.dataset.truck ?? null;
  }
  return null;
}

export default function ConsonantPictureSort({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant Picture Sort questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [stage, setStage] = useState<Stage>("naming");
  const [hover, setHover] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [won, setWon] = useState<string | null>(null);
  // Round keys loaded into each truck, so the beds fill up as the game goes on.
  const [cargo, setCargo] = useState<Record<string, string[]>>({});
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Consonant Picture Sort";
  const score = results.filter(Boolean).length;
  const wordOf = useCallback((key: string) => rounds?.find((r) => r.key === key)?.word ?? "", [rounds]);
  const loaded = round ? Object.values(cargo).some((keys) => keys.includes(round.key)) : false;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const ask = useCallback(
    (r: Round) => {
      setStage("naming");
      speak(promptSpeech(r.word), () => setStage("choosing"));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["consonant picture sort"]], () => ask(round));
      return;
    }
    speak(NEXT, () => ask(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setWrong(null);
    setReveal(null);
    setWon(null);
    setStage("naming");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // A ref, not only state, so a drop and a tap landing in the same tick can't both answer.
  const answeredRef = useRef<string | null>(null);
  const answer = useCallback(
    (letter: string) => {
      if (stage !== "choosing" || !round || answeredRef.current === round.key) return;
      answeredRef.current = round.key;
      setStage("feedback");
      setHover(null);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: letter }];
      const earned = letter === round.answer;
      setResults((r) => [...r, earned]);
      setCargo((c) => ({ ...c, [round.answer]: [...(c[round.answer] ?? []), round.key] }));
      if (earned) {
        setWon(letter);
        speak(correctSpeech(round.word, roundIndex), advance);
        return;
      }
      setWrong(letter);
      setReveal(round.answer);
      speak(revealSpeech(round.word), advance, { minMs: REVEAL_MIN_MS });
    },
    [stage, round, roundIndex, speak, advance],
  );

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (phase === "complete") speak(resultLine, finishOnce);
  }, [phase, resultLine, speak, finishOnce]);

  const rootRef = useRef<HTMLDivElement>(null);

  const backdrop = (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`${styles.ground} absolute inset-x-0 bottom-0 h-[30%]`} />
    </div>
  );

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.pill} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        {backdrop}
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Starting the trucks…</p>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
        {backdrop}

        {learnerName && (
          <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
            <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
            <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
          </div>
        )}
        {phase !== "complete" && (
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

        <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,44px)] font-extrabold leading-tight`}>{title}</h1>

        {phase === "complete" ? (
          <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
            <div className="flex items-center gap-3">
              <div className={`${styles.sign} rounded-2xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
              <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
                <Volume2 size={18} strokeWidth={2.6} />
              </button>
            </div>
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
              You sorted {score} of {total} pictures!
            </p>
            <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
              {results.map((earned, i) => (
                <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(51,38,20,0.3)]" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
              <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
              <button
                type="button"
                onClick={() => ask(round)}
                disabled={stage !== "choosing"}
                aria-label="Hear the picture name again"
                className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
              >
                <Volume2 size={18} strokeWidth={2.6} />
              </button>
            </div>

            <main className="relative z-[2] flex min-h-0 w-full flex-1 flex-col items-center justify-between pt-1">
              {/* Crane cable with the picture crate hanging off its hook. */}
              <div className="relative flex min-h-0 flex-1 flex-col items-center">
                <span aria-hidden className={`${styles.cable} w-[4px] flex-1 max-h-[8vh]`} />
                <span aria-hidden className={`${styles.hook} -mt-1 h-4 w-6 rounded-b-full`} />
                {!loaded && (
                  <motion.button
                    key={round.key}
                    type="button"
                    layoutId={`load-${round.key}`}
                    aria-label={`${WORDS[round.word].name}. Drag it to a truck, or tap a truck.`}
                    drag={stage === "choosing"}
                    dragConstraints={rootRef}
                    dragElastic={0}
                    dragMomentum={false}
                    dragSnapToOrigin
                    whileDrag={{ scale: 1.1, zIndex: 50 }}
                    onDrag={(_: unknown, info: PanInfo) => setHover(truckAt(info.point))}
                    onDragEnd={(_: unknown, info: PanInfo) => {
                      setHover(null);
                      const t = truckAt(info.point);
                      if (t) answer(t);
                    }}
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, rotate: stage === "choosing" ? [0, -3, 3, 0] : 0 }}
                    transition={{ y: { duration: 0.5, ease: EASE_OUT }, rotate: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
                    className={cn(styles.crate, "relative z-[5] flex aspect-square w-[clamp(84px,min(26vw,19vh),160px)] touch-none flex-col items-center justify-center rounded-2xl", stage === "naming" && styles.crateNaming)}
                  >
                    <span aria-hidden className="pointer-events-none text-[clamp(40px,9vh,84px)] leading-none">{WORDS[round.word].emoji}</span>
                    <span className="pointer-events-none text-[clamp(13px,2.4vh,20px)] font-extrabold leading-none">{WORDS[round.word].name}</span>
                  </motion.button>
                )}
              </div>

              <div className="flex w-[min(98vw,760px)] items-end justify-around gap-1">
                {round.trucks.map((letter, i) => (
                  <div key={letter} className="relative w-[clamp(98px,min(31vw,26vh),220px)]">
                    <button
                      type="button"
                      data-truck={letter}
                      onClick={() => answer(letter)}
                      disabled={stage !== "choosing"}
                      aria-label={`Truck ${letter}${cargo[letter]?.length ? `, holding ${cargo[letter].map((k) => WORDS[wordOf(k)].name).join(" and ")}` : ""}`}
                      className={cn(
                        styles.truck,
                        "relative block w-full",
                        hover === letter && styles.truckHover,
                        won === letter && styles.truckWon,
                        wrong === letter && styles.truckWrong,
                        reveal === letter && styles.truckReveal,
                      )}
                      style={{ "--cab": CABS[i % CABS.length] } as React.CSSProperties}
                    >
                      {/* Pictures already sorted sit in the bed. */}
                      <span className="pointer-events-none absolute bottom-[86%] left-[4%] z-[1] flex w-[64%] flex-wrap-reverse justify-center">
                        {(cargo[letter] ?? []).map((k) => (
                          <motion.span key={k} layoutId={`load-${k}`} transition={{ duration: 0.5, ease: EASE_OUT }} className="text-[clamp(20px,4.4vh,40px)] leading-none">
                            {WORDS[wordOf(k)].emoji}
                          </motion.span>
                        ))}
                      </span>
                      <span className={`${styles.bed} relative z-[2] ml-[2%] flex h-[clamp(44px,9vh,84px)] w-[68%] items-center justify-center`}>
                        <span className="flex items-baseline font-extrabold leading-none">
                          <span className="text-[clamp(28px,5.8vh,54px)]">{letter}</span>
                          <span className="text-[clamp(22px,4.6vh,42px)]">{letter.toLowerCase()}</span>
                        </span>
                      </span>
                      <span aria-hidden className={`${styles.cab} absolute bottom-[22%] right-[2%] z-[2] h-[clamp(38px,8vh,74px)] w-[30%] rounded-tr-[40%] rounded-tl-md`}>
                        <span className={`${styles.window} absolute right-[14%] top-[14%] h-[38%] w-[52%] rounded-tr-[50%] rounded-tl-sm`} />
                      </span>
                      <span aria-hidden className={`${styles.chassis} relative z-[1] -mt-1 block h-[clamp(10px,2vh,16px)] w-full rounded-md`} />
                      <span aria-hidden className="relative z-[3] -mt-[clamp(8px,1.6vh,12px)] flex justify-between px-[10%]">
                        <span className={`${styles.wheel} block size-[clamp(24px,5vh,44px)] rounded-full`} />
                        <span className={`${styles.wheel} block size-[clamp(24px,5vh,44px)] rounded-full`} />
                      </span>
                    </button>
                    {wrong === letter && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-2 z-[6] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === letter && (
                      <span className={`${styles.revealTag} absolute -top-[clamp(60px,12vh,100px)] left-1/2 z-[6] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(12px,2vh,17px)] font-extrabold`}>{REVEAL_TEXT}</span>
                    )}
                  </div>
                ))}
              </div>
            </main>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
