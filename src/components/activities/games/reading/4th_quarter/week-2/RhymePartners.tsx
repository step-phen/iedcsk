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
  REVEAL_TEXT,
  WORDS,
  correctSpeech,
  listenLine,
  questionLine,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./RhymePartners.data";
import styles from "./RhymePartners.module.css";

interface Round {
  key: string;
  word: string;
  answer: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "listening" | "choosing" | "feedback";

const BASKET_COLORS = [styles.sockPink, styles.sockBlue, styles.sockYellow];

function buildRound(row: QuestionRow): Round {
  const { word, choices } = row.questionData as { word: unknown; choices: unknown };
  if (typeof word !== "string" || !Object.hasOwn(WORDS, word)) {
    throw new Error(`Question ${row.questionKey} needs a known "word"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string" && Object.hasOwn(WORDS, c))) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer) || answer === word) {
    throw new Error(`Question ${row.questionKey} must have its rhyming answer among the choices`);
  }
  return { key: row.questionKey, word, answer, choices: choices as string[] };
}

function Sock({ emoji, className }: { emoji: string; className?: string }) {
  return (
    <span className={cn(styles.sock, "relative block aspect-[5/6] w-full", className)}>
      <svg aria-hidden viewBox="0 0 100 120" className="absolute inset-0 size-full overflow-visible">
        <path className={styles.sockBody} d="M22 8 H70 V66 C70 76 76 80 84 84 C98 91 97 110 82 112 L46 110 C30 109 22 98 22 84 Z" />
        <rect className={styles.sockCuff} x="22" y="8" width="48" height="16" />
        <path className={styles.sockHeel} d="M70 84 C78 88 86 92 90 100 C93 108 88 112 82 112 L74 111 C80 104 78 94 70 90 Z" />
      </svg>
      <span aria-hidden className="pointer-events-none absolute left-[46%] top-[46%] -translate-x-1/2 -translate-y-1/2 select-none text-[clamp(30px,6.6vh,60px)] leading-none">
        {emoji}
      </span>
    </span>
  );
}

export default function RhymePartners({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Rhyme Partners questions:", err);
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
  const [stage, setStage] = useState<Stage>("listening");
  const [heard, setHeard] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Rhyme Partners";
  const score = results.filter(Boolean).length;
  const onLine = reveal ?? (picked === round?.answer ? picked : null);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Each basket sock wiggles while its name is heard, so the child links every spoken word to its picture.
  const sayNames = useCallback(
    (r: Round) => {
      setStage("listening");
      const step = (i: number) => {
        if (i >= r.choices.length) {
          setHeard(null);
          setStage("choosing");
          speak(questionLine(r.word));
          return;
        }
        speak(WORDS[r.choices[i]].name, () => step(i + 1), { onStart: () => setHeard(r.choices[i]) });
      };
      speak(listenLine(r.word), () => step(0), { onStart: () => setHeard(r.word) });
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["rhyme partners"]], () => sayNames(round));
      return;
    }
    sayNames(round);
    // speakAll is stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setHeard(null);
    setStage("listening");
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
        speak(correctSpeech(round.word, word, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(round.word, round.answer), advance, { minMs: REVEAL_MIN_MS });
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

  const backdrop = <div aria-hidden className={`${styles.tiles} pointer-events-none absolute inset-0`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Washing the socks…</p>
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
            <div className={`${styles.headline} rounded-full px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You paired {score} of {total} socks!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(20,83,74,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => sayNames(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear the words again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(12px,3.5vh,36px)]">
            <div key={round.key} className="relative flex w-[min(96vw,620px)] items-start justify-center gap-[clamp(18px,6vw,60px)] pt-3" aria-label={`${WORDS[round.word].name} and its rhyme partner`}>
              <span aria-hidden className={`${styles.rope} absolute inset-x-0 top-3 h-1.5 rounded-full`} />
              <div className="relative w-[clamp(80px,min(24vw,20vh),150px)]">
                <span aria-hidden className={`${styles.peg} absolute -top-2 left-[34%] z-[2] h-7 w-3 rounded-sm`} />
                <Sock emoji={WORDS[round.word].emoji} className={cn(styles.sockTeal, styles.hanging, heard === round.word && styles.sockHeard)} />
              </div>
              <div className="relative w-[clamp(80px,min(24vw,20vh),150px)]">
                <span aria-hidden className={`${styles.peg} absolute -top-2 left-[34%] z-[2] h-7 w-3 rounded-sm`} />
                {onLine ? (
                  <Sock emoji={WORDS[onLine].emoji} className={cn(styles.sockTeal, styles.pinned, reveal && styles.pinnedReveal)} />
                ) : (
                  <span aria-hidden className={`${styles.ghost} flex aspect-[5/6] w-full items-center justify-center rounded-2xl text-[clamp(30px,6vh,54px)] font-extrabold`}>
                    ?
                  </span>
                )}
              </div>
            </div>

            <div className={`${styles.basket} relative flex w-[min(96vw,700px)] items-end justify-around gap-[clamp(6px,2vw,18px)] rounded-b-[40px] rounded-t-xl px-[clamp(8px,2vw,20px)] pb-[clamp(10px,2vh,18px)] pt-[clamp(14px,3vh,26px)]`}>
              {round.choices.map((word, i) => {
                const isPicked = picked === word;
                const won = isPicked && word === round.answer;
                return (
                  <div key={`${round.key}-${word}`} className="relative w-[clamp(84px,min(26vw,22vh),170px)]">
                    <button
                      type="button"
                      onClick={() => choose(word)}
                      disabled={stage !== "choosing"}
                      aria-label={WORDS[word].name}
                      className={cn(
                        styles.sockButton,
                        "block w-full rounded-2xl p-1",
                        won && styles.sockGone,
                        isPicked && !won && styles.sockWrong,
                        reveal === word && styles.sockReveal,
                      )}
                    >
                      <Sock emoji={WORDS[word].emoji} className={cn(BASKET_COLORS[i], heard === word && styles.sockHeard)} />
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
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
