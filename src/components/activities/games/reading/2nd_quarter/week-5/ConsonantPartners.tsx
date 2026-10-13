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
  BIG_SOCK,
  INSTRUCTION,
  LETTERS,
  NEXT,
  REVEAL_TEXT,
  SOCKS,
  correctSpeech,
  questionSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ConsonantPartners.data";
import styles from "./ConsonantPartners.module.css";

interface Round {
  key: string;
  /** The uppercase letter on the big sock. */
  letter: string;
  /** Lowercase letters on the line, left to right. */
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "asking" | "choosing" | "feedback";

const isTaught = (l: unknown): l is string => typeof l === "string" && LETTERS.includes(l.toUpperCase()) && l.length === 1;

function buildRound(row: QuestionRow): Round {
  const { letter, choices } = row.questionData as { letter: unknown; choices: unknown };
  if (!isTaught(letter) || letter !== letter.toUpperCase()) throw new Error(`Question ${row.questionKey} needs a taught uppercase "letter"`);
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => isTaught(c) && c === c.toLowerCase())) {
    throw new Error(`Question ${row.questionKey} needs three taught lowercase "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (answer !== letter.toLowerCase() || choices.filter((c) => c === answer).length !== 1) {
    throw new Error(`Question ${row.questionKey} needs its lowercase partner once among the choices, and it must be the answer`);
  }
  return { key: row.questionKey, letter, choices: choices as string[], answer };
}

function Sock({ letter, body, stripe, big = false }: { letter: string; body: string; stripe: string; big?: boolean }) {
  return (
    <svg viewBox="0 0 64 92" className="block h-full w-full overflow-visible" aria-hidden>
      <path d="M12 4 H48 V56 Q60 60 61 73 Q62 88 46 88 H22 Q10 88 11 74 Z" fill={body} stroke="#2b3a4a" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M12 4 H48 V16 H12 Z" fill={stripe} stroke="#2b3a4a" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M11 74 Q10 88 22 88 H30 Q24 80 26 72 Z" fill={stripe} opacity="0.75" />
      <circle cx="30" cy="46" r="17" fill="#ffffff" stroke="#2b3a4a" strokeWidth="2.5" />
      <text x="30" y="47" textAnchor="middle" dominantBaseline="central" fontFamily="inherit" fontWeight="800" fontSize={big ? 28 : 26} fill="#2b3a4a">
        {letter}
      </text>
    </svg>
  );
}

export default function ConsonantPartners({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant Partners questions:", err);
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
  const [stage, setStage] = useState<Stage>("asking");
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Consonant Partners";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const ask = useCallback(
    (r: Round) => {
      setStage("asking");
      speak(questionSpeech(r.letter), () => setStage("choosing"));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["consonant partners"]], () => ask(round));
      return;
    }
    speak(NEXT, () => ask(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setStage("asking");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (choice: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
      const earned = choice === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(round.letter, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(round.letter), advance, { minMs: REVEAL_MIN_MS });
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

  const backdrop = (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`${styles.sunny} absolute -right-10 -top-10 size-48 rounded-full`} />
      <div className={`${styles.fence} absolute inset-x-0 bottom-0 h-[22%]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Hanging up the socks…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
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

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.sign} rounded-2xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You matched {score} of {total} sock pairs!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(43,58,74,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => ask(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly">
            <div className="relative w-[min(96vw,720px)]">
              <div aria-hidden className={`${styles.line} absolute inset-x-0 top-[10px] h-[5px] rounded-full`} />
              <div className="relative flex items-start justify-around">
                {round.choices.map((choice, i) => {
                  const isPicked = picked === choice;
                  const won = isPicked && choice === round.answer;
                  return (
                    <div key={`${round.key}-${choice}`} className="relative flex flex-col items-center">
                      <span aria-hidden className={`${styles.peg} relative z-[2] h-6 w-3 rounded-sm`} />
                      <button
                        type="button"
                        onClick={() => choose(choice)}
                        disabled={stage !== "choosing"}
                        aria-label={`Sock with small ${choice.toUpperCase()}`}
                        className={cn(
                          styles.sock,
                          "-mt-2 h-[clamp(92px,22vh,190px)] w-[clamp(64px,15.5vh,134px)]",
                          won && styles.sockWon,
                          isPicked && !won && styles.sockWrong,
                          reveal === choice && styles.sockReveal,
                        )}
                      >
                        <span className={`${styles.flap} block h-full w-full`} style={{ animationDelay: `${i * -0.9}s` }}>
                          <Sock letter={choice} {...SOCKS[i % SOCKS.length]} />
                        </span>
                      </button>
                      {isPicked && !won && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -right-2 top-6 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                      {reveal === choice && (
                        <span className={`${styles.revealTag} absolute -bottom-8 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative flex flex-col items-center">
              <div key={round.key} className={cn(styles.bigSock, "relative z-[1] -mb-[clamp(30px,6vh,56px)] h-[clamp(96px,21vh,190px)] w-[clamp(68px,15vh,136px)]", picked === round.answer && styles.bigSockHappy)} aria-label={`Big ${round.letter}`}>
                <Sock letter={round.letter} {...BIG_SOCK} big />
              </div>
              <div aria-hidden className={`${styles.basket} relative z-[2] h-[clamp(48px,10vh,90px)] w-[clamp(150px,34vh,300px)] rounded-b-[40%] rounded-t-xl`} />
            </div>
          </main>
        </>
      )}
    </div>
  );
}
