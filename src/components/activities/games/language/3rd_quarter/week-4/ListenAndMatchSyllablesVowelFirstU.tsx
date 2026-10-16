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
  BEE_SPOTS,
  INSTRUCTION,
  LOADING,
  REVEAL,
  SOUNDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ListenAndMatchSyllablesVowelFirstU.data";
import styles from "./ListenAndMatchSyllablesVowelFirstU.module.css";

interface Round {
  key: string;
  target: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong bee buzzes on its own before the right one lights up.
const WRONG_MS = 600;

const isSyllable = (c: unknown): c is string => typeof c === "string" && c in SOUNDS;

function buildRound(row: QuestionRow): Round {
  const { target, choices } = (row.questionData ?? {}) as { target?: unknown; choices?: unknown };
  if (!isSyllable(target) || row.correctAnswer.answer !== target) throw new Error(`Question ${row.questionKey} needs a taught-syllable "target" that is its answer`);
  // Every choice shares the vowel, so each bee only has to carry the letter that finishes it.
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isSyllable) || new Set(choices).size !== choices.length || !choices.includes(target) || choices.some((c) => c[0] !== target[0])) {
    throw new Error(`Question ${row.questionKey} needs different taught-syllable "choices" that share its vowel and include its target`);
  }
  return { key: row.questionKey, target, choices };
}

function Bee() {
  return (
    <svg viewBox="0 0 120 100" className="absolute inset-x-0 top-0 h-[62%] w-full overflow-visible" aria-hidden>
      <ellipse className={styles.wing} cx="48" cy="22" rx="18" ry="24" fill="white" fillOpacity="0.85" stroke="#495057" strokeWidth="3" />
      <ellipse className={styles.wing} cx="74" cy="22" rx="18" ry="24" fill="white" fillOpacity="0.85" stroke="#495057" strokeWidth="3" />
      <path d="M100 56 L114 60 L100 64 Z" fill="#212529" />
      <ellipse cx="62" cy="58" rx="40" ry="28" fill="#ffd43b" stroke="#212529" strokeWidth="4" />
      <path d="M52 32 C 46 46, 46 70, 52 84 M74 32 C 80 46, 80 70, 74 84" fill="none" stroke="#212529" strokeWidth="9" />
      <circle cx="26" cy="54" r="18" fill="#ffd43b" stroke="#212529" strokeWidth="4" />
      <circle cx="20" cy="50" r="4" fill="#212529" />
      <path d="M14 60 Q 20 66 26 60" fill="none" stroke="#212529" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 37 C 18 26, 12 24, 8 26 M30 37 C 32 26, 38 22, 42 24" fill="none" stroke="#212529" strokeWidth="3" strokeLinecap="round" />
      <path d="M62 86 L62 100" stroke="#495057" strokeWidth="3" />
    </svg>
  );
}

function HoneyJar() {
  return (
    <svg viewBox="0 0 200 180" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d="M40 40 C 10 60, 10 160, 50 174 L150 174 C 190 160, 190 60, 160 40 Z" fill="#f59f00" stroke="#7c4a03" strokeWidth="5" />
      <path d="M40 40 C 70 34, 130 34, 160 40 L156 58 C 120 64, 80 64, 44 58 Z" fill="#fab005" stroke="#7c4a03" strokeWidth="4" />
      <rect x="44" y="8" width="112" height="34" rx="10" fill="#e8590c" stroke="#7c4a03" strokeWidth="5" />
      <path d="M58 64 C 54 80, 66 84, 62 98 M120 62 C 118 74, 128 78, 124 90" stroke="#ffe066" strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="44" cy="110" rx="8" ry="26" fill="white" opacity="0.3" />
    </svg>
  );
}

export default function ListenAndMatchSyllablesVowelFirstU({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Listen and Match Syllables: u (vowel first) questions:", err);
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
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "Listen and Match Syllables: u (vowel first)";
  const score = results.filter(Boolean).length;
  // The jar's blank fills with the right letter once a bee lands or the answer is shown.
  const filled = round && (picked !== null || reveal) ? round.target[1] : null;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.target);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["listen and match syllables: u (vowel first)"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setWrong(null);
    setReveal(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    const choice = round.choices[i];
    const earned = choice === round.target;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(i);
      speak(correctSpeech(round.target), advance);
      return;
    }
    setWrong(i);
    const target = round.target;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
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
    if (phase === "complete") speak(resultLine, finishOnce);
  }, [phase, resultLine, speak, finishOnce]);

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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>{LOADING}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.hive} pointer-events-none absolute left-[3%] top-[18%] h-[clamp(70px,16vh,140px)] w-[clamp(60px,12vh,120px)]`} />
      <div aria-hidden className={`${styles.meadow} pointer-events-none absolute inset-x-0 bottom-0 h-[22%]`} />

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

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,42px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
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
            You filled {score} of {total} honey jars!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(124,74,3,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.target))}
              disabled={locked}
              aria-label="Hear the syllable again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          {/* The meadow: bees hover up top, each carrying a letter; the right one flies down into the jar's blank. */}
          <main key={round.key} className={`${styles.play} relative z-[1] min-h-0 w-full max-w-3xl flex-1`}>
            {reveal && <p className={`${styles.revealNote} absolute left-1/2 top-[44%] z-[4] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}

            {round.choices.map((syllable, i) => {
              const isTarget = syllable === round.target;
              const spot = BEE_SPOTS[i % BEE_SPOTS.length];
              const landed = picked === i;
              return (
                <button
                  key={`${round.key}-${i}`}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={locked}
                  aria-label={`Bee with the letter ${syllable[1]}`}
                  style={{ left: landed ? "50%" : spot.left, top: landed ? "54%" : spot.top, "--buzz-delay": `${i * -0.5}s` } as React.CSSProperties}
                  className={cn(
                    styles.bee,
                    "absolute z-[2] rounded-full disabled:cursor-default",
                    landed && styles.beeLanded,
                    wrong === i && styles.beeWrong,
                    reveal && isTarget && styles.beeReveal,
                    reveal && !isTarget && wrong !== i && "opacity-50",
                  )}
                >
                  <Bee />
                  <span className={`${styles.card} pointer-events-none absolute bottom-0 left-1/2 flex items-center justify-center rounded-lg font-extrabold leading-none`}>{syllable[1]}</span>
                  {wrong === i && (
                    <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                      ✕
                    </span>
                  )}
                </button>
              );
            })}

            <div className={`${styles.jar} absolute bottom-0 left-1/2`} aria-label={filled ? `Honey jar says ${round.target}` : `Honey jar says ${round.target[0]} and a blank`}>
              <HoneyJar />
              <div className={`${styles.label} absolute inset-x-[22%] bottom-[16%] top-[42%] flex items-center justify-center gap-[6%] rounded-2xl font-extrabold leading-none`}>
                <span>{round.target[0]}</span>
                <span className={cn(styles.blank, "flex items-center justify-center rounded-lg", filled && styles.blankFilled)}>{filled ?? ""}</span>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
