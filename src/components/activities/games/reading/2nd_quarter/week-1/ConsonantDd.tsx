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
  INSTRUCTION,
  LETTER,
  LISTEN,
  QUESTION,
  REVEAL_TEXT,
  WORDS,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ConsonantDd.data";
import styles from "./ConsonantDd.module.css";

interface Round {
  key: string;
  /** Left mound to right mound, in the order they are dug up. */
  choices: string[];
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
  const { choices } = row.questionData as { choices: unknown };
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((w) => typeof w === "string" && Object.hasOwn(WORDS, w))) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  const dWords = (choices as string[]).filter((w) => WORDS[w].isD);
  if (dWords.length !== 1 || dWords[0] !== row.correctAnswer.answer) {
    throw new Error(`Question ${row.questionKey} needs exactly one D picture, and it must be the answer`);
  }
  return { key: row.questionKey, choices: choices as string[], answer: row.correctAnswer.answer };
}

// Dino tracks pressed into the ground: [left %, bottom %, rotation deg].
const TRACKS: [number, number, number][] = [
  [4, 4, -20],
  [12, 9, -10],
  [20, 3, -25],
  [80, 8, 15],
  [88, 3, 25],
  [95, 10, 10],
];

function Footprint() {
  return (
    <svg viewBox="0 0 40 44" className="size-full">
      <ellipse cx="20" cy="30" rx="11" ry="12" />
      <ellipse cx="8" cy="12" rx="4.5" ry="7" transform="rotate(-25 8 12)" />
      <ellipse cx="20" cy="7" rx="4.5" ry="7" />
      <ellipse cx="32" cy="12" rx="4.5" ry="7" transform="rotate(25 32 12)" />
    </svg>
  );
}

export default function ConsonantDd({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant Dd questions:", err);
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
  const [dug, setDug] = useState(0);
  const [naming, setNaming] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Consonant Dd";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Each picture pops out of its mound while its name is spoken, then the question opens the round for tapping.
  const digUp = useCallback(
    (r: Round) => {
      setStage("naming");
      const step = (i: number) => {
        if (i >= r.choices.length) {
          setNaming(-1);
          setStage("choosing");
          speak(QUESTION);
          return;
        }
        speak(WORDS[r.choices[i]].name, () => step(i + 1), {
          onStart: () => {
            setDug((n) => Math.max(n, i + 1));
            setNaming(i);
          },
        });
      };
      step(0);
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["consonant dd"]], () => digUp(round));
      return;
    }
    speak(LISTEN, () => digUp(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setDug(0);
    setNaming(-1);
    setStage("naming");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (word: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(word);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: word }];
      const earned = word === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(word, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(round.answer), advance, { minMs: REVEAL_MIN_MS });
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

  const ground = (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`${styles.sun} absolute left-[6%] top-[12%] size-[clamp(46px,9vh,80px)] rounded-full`} />
      <div className={`${styles.dirt} absolute inset-x-0 bottom-0 h-[38vh]`} />
      {TRACKS.map(([left, bottom, turn]) => (
        <span key={left} className={`${styles.track} absolute size-[clamp(22px,4vh,34px)]`} style={{ left: `${left}%`, bottom: `${bottom}%`, rotate: `${turn}deg` }}>
          <Footprint />
        </span>
      ))}
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
        {ground}
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Grabbing the shovels…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {ground}

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
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultSign} rounded-xl px-[clamp(20px,4vw,40px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You dug up {score} of {total} D pictures!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(80,40,10,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => digUp(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear the pictures again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2.4vh,24px)]">
            <div className="flex flex-col items-center">
              <div className={`${styles.sign} flex items-baseline gap-2 rounded-lg px-[clamp(16px,3vw,28px)] py-1 leading-none`} aria-label={`The letter ${LETTER.shown}`}>
                <span className="text-[clamp(40px,8vh,76px)] font-extrabold">{LETTER.shown[0]}</span>
                <span className="text-[clamp(32px,6.6vh,62px)] font-extrabold">{LETTER.shown[1]}</span>
              </div>
              <div className={`${styles.post} h-[clamp(14px,3vh,28px)] w-3`} />
            </div>

            <div className="flex items-end justify-center gap-[clamp(8px,3vw,40px)]">
              {round.choices.map((word, i) => {
                const isPicked = picked === word;
                const won = isPicked && word === round.answer;
                const isDug = i < dug;
                return (
                  <div key={`${round.key}-${word}`} className="relative">
                    <button
                      type="button"
                      onClick={() => choose(word)}
                      disabled={stage !== "choosing"}
                      aria-label={isDug ? WORDS[word].name : "Dirt mound"}
                      className={cn(
                        styles.dig,
                        "relative flex aspect-[5/6] w-[clamp(90px,min(27vw,26vh),190px)] flex-col items-center justify-end",
                        naming === i && styles.digNaming,
                        won && styles.digWon,
                        isPicked && !won && styles.digWrong,
                        reveal === word && styles.digReveal,
                      )}
                    >
                      {isDug && (
                        <span className={`${styles.find} absolute inset-x-[6%] top-0 bottom-[22%] flex items-center justify-center rounded-2xl p-[10%]`}>
                          <Image src={WORDS[word].image} alt="" width={256} height={256} loading="eager" draggable={false} className="pointer-events-none size-full select-none object-contain" />
                        </span>
                      )}
                      {isDug && <span aria-hidden className={`${styles.dust} absolute bottom-[18%] h-[30%] w-[90%] rounded-full`} />}
                      <span aria-hidden className={cn(styles.mound, "relative h-[36%] w-full", isDug && styles.moundDug)} />
                      {isPicked && !won && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                    </button>
                    {reveal === word && (
                      <span className={`${styles.revealTag} absolute -top-9 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
