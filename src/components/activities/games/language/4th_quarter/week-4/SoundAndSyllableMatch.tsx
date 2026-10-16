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
  BAR_COLORS,
  INSTRUCTION,
  LETTER_SOUNDS,
  LOADING,
  REVEAL,
  SYLLABLES,
  WORDS,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  soundPrompt,
  syllablePrompt,
} from "./SoundAndSyllableMatch.data";
import styles from "./SoundAndSyllableMatch.module.css";

interface Round {
  key: string;
  kind: "syllable" | "sound";
  // The syllable heard, or the letter the pictured word begins with; it is also the answer.
  target: string;
  word?: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong bar buzzes on its own before the right one lights up.
const WRONG_MS = 600;

const promptFor = (r: Round) => (r.kind === "syllable" ? syllablePrompt(r.target) : soundPrompt(r.word!));

function buildRound(row: QuestionRow): Round {
  const { kind, target, word, choices } = (row.questionData ?? {}) as { kind?: unknown; target?: unknown; word?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (kind === "syllable") {
    if (target !== answer || !Object.hasOwn(SYLLABLES, answer)) throw new Error(`Question ${row.questionKey} needs a taught syllable "target" that is its answer`);
  } else if (kind === "sound") {
    if (typeof word !== "string" || !Object.hasOwn(WORDS, word) || WORDS[word].first !== answer) throw new Error(`Question ${row.questionKey} needs a known "word" that begins with its answer`);
  } else {
    throw new Error(`Question ${row.questionKey} needs a "kind" of syllable or sound`);
  }
  const table = kind === "syllable" ? SYLLABLES : LETTER_SOUNDS;
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every((c) => typeof c === "string" && Object.hasOwn(table, c)) || new Set(choices).size !== choices.length || !choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs different taught "choices" that include its answer`);
  }
  return { key: row.questionKey, kind, target: answer, word: kind === "sound" ? (word as string) : undefined, choices };
}

export default function SoundAndSyllableMatch({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Sound and Syllable Match questions:", err);
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
  const title = activityName || "Sound and Syllable Match";
  const score = results.filter(Boolean).length;

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
    const prompt = promptFor(round);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["sound and syllable match"], prompt]);
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
      speak(correctSpeech(round, roundIndex), advance);
      return;
    }
    stop();
    setWrong(i);
    const shown = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(shown), advance, { minMs: REVEAL_MIN_MS });
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
      <div aria-hidden className={`${styles.notes} pointer-events-none absolute inset-0`} />

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

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

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
            You matched {score} of {total} sounds!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptFor(round))}
              disabled={locked}
              aria-label="Hear it again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-evenly gap-[clamp(6px,2vh,18px)] py-2">
            {/* The music stand shows the pictured word, or an ear when the round is only a sound to hear. */}
            <div className={`${styles.stand} relative flex shrink-0 flex-col items-center`}>
              <div className={`${styles.sheet} flex items-center justify-center rounded-xl`} role="img" aria-label={round.word ? WORDS[round.word].name : "Listen"}>
                <span className={`${styles.standPicture} leading-none`}>{round.word ? WORDS[round.word].emoji : "👂"}</span>
              </div>
              <span aria-hidden className={`${styles.pole}`} />
            </div>

            {/* The xylophone: bars get shorter from left to right, each sitting on two rails. */}
            <div className={`${styles.frame} relative flex shrink-0 items-center justify-center gap-[clamp(6px,2vw,18px)] rounded-2xl`}>
              <span aria-hidden className={`${styles.rail} pointer-events-none absolute inset-x-[3%] top-[22%]`} />
              <span aria-hidden className={`${styles.rail} pointer-events-none absolute inset-x-[3%] bottom-[22%]`} />
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isTarget = choice === round.target;
                return (
                  <button
                    key={`${round.key}-${choice}`}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={locked}
                    aria-label={choice}
                    style={{ background: BAR_COLORS[i % BAR_COLORS.length], height: `calc(var(--x) * ${1.5 - i * 0.12})` }}
                    className={cn(
                      styles.bar,
                      "relative z-[1] flex items-center justify-center rounded-xl disabled:cursor-default",
                      picked === i && styles.barRight,
                      wrong === i && styles.barWrong,
                      reveal && isTarget && styles.barReveal,
                      reveal && !isTarget && wrong !== i && "opacity-50",
                    )}
                  >
                    <span className={`${styles.barText} pointer-events-none font-extrabold leading-none`}>{choice}</span>
                    <span aria-hidden className={`${styles.peg} pointer-events-none absolute left-1/2 top-[14%] size-2.5 -translate-x-1/2 rounded-full`} />
                    <span aria-hidden className={`${styles.peg} pointer-events-none absolute bottom-[14%] left-1/2 size-2.5 -translate-x-1/2 rounded-full`} />
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-3 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
