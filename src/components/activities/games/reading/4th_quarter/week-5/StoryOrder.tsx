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
  EVENTS,
  INSTRUCTION,
  QUESTION,
  REVEAL_TEXT,
  SQUARE_LABELS,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./StoryOrder.data";
import styles from "./StoryOrder.module.css";

interface Round {
  key: string;
  sentences: string[];
  events: string[];
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "listening" | "choosing" | "feedback";
type Verdict = "won" | "wrong" | null;

function isEvent(id: unknown): id is string {
  return typeof id === "string" && Object.hasOwn(EVENTS, id);
}

function buildRound(row: QuestionRow): Round {
  const { sentences, events, choices } = row.questionData as { sentences: unknown; events: unknown; choices: unknown };
  if (!Array.isArray(sentences) || sentences.length !== 3 || !sentences.every((s) => typeof s === "string" && s !== "")) {
    throw new Error(`Question ${row.questionKey} needs three "sentences"`);
  }
  if (!Array.isArray(events) || events.length !== 3 || !events.every(isEvent)) {
    throw new Error(`Question ${row.questionKey} needs three known "events"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => events.includes(c)) || new Set(choices).size !== 3) {
    throw new Error(`Question ${row.questionKey} needs "choices" that shuffle the events`);
  }
  if (row.correctAnswer.answer !== events.join(",")) {
    throw new Error(`Question ${row.questionKey} must have the events in order as its answer`);
  }
  return { key: row.questionKey, sentences, events, choices };
}

export default function StoryOrder({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Story Order questions:", err);
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
  const [placed, setPlaced] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Story Order";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const askQuestion = useCallback(() => {
    setStage("listening");
    speak(QUESTION, undefined, { onStart: () => setStage("choosing") });
  }, [speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["story order"]], askQuestion);
      return;
    }
    askQuestion();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPlaced([]);
    setVerdict(null);
    setRevealed(false);
    setStage("listening");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // The order is judged once the third square is filled; the wrong squares flash before the right order hops in.
  const place = useCallback(
    (id: string) => {
      if (stage !== "choosing" || !round || placed.includes(id)) return;
      const next = [...placed, id];
      setPlaced(next);
      if (next.length < 3) return;
      setStage("feedback");
      const response = next.join(",");
      answersRef.current = [...answersRef.current, { questionId: round.key, response }];
      const earned = response === round.events.join(",");
      setResults((r) => [...r, earned]);
      setVerdict(earned ? "won" : "wrong");
      if (earned) {
        speak(correctSpeech(round.sentences, roundIndex), advance);
        return;
      }
      window.setTimeout(() => {
        setPlaced(round.events);
        setRevealed(true);
      }, 700);
      speak(revealSpeech(round.sentences), advance, { minMs: REVEAL_MIN_MS + 700 });
    },
    [stage, round, placed, roundIndex, speak, advance],
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

  const backdrop = <div aria-hidden className={`${styles.asphalt} pointer-events-none absolute inset-0`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Drawing the hopscotch…</p>
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
            <div className={`${styles.headline} rounded-xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You ordered {score} of {total} stories!
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
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={askQuestion}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2.2vh,24px)]">
            <div key={round.key} className={`${styles.story} w-[min(94vw,720px)] rounded-xl px-[clamp(14px,3vw,28px)] py-[clamp(6px,1.4vh,14px)] text-center text-[clamp(18px,3.6vh,32px)] font-bold leading-snug`}>
              {round.sentences.join(" ")}
            </div>

            <div className="flex w-[min(96vw,720px)] items-stretch justify-center gap-[clamp(6px,1.6vw,14px)]">
              {SQUARE_LABELS.map((label, i) => {
                const id = placed[i];
                const wrongHere = verdict === "wrong" && !revealed && id !== round.events[i];
                return (
                  <div key={label} className="relative flex w-[clamp(90px,min(29vw,22vh),180px)] flex-col items-center gap-1">
                    <div
                      className={cn(
                        styles.square,
                        "relative flex aspect-square w-full items-center justify-center rounded-md",
                        id && styles.squareFilled,
                        verdict === "won" && styles.squareWon,
                        wrongHere && styles.squareWrong,
                        revealed && styles.squareReveal,
                      )}
                      style={verdict === "won" ? { animationDelay: `${i * 0.25}s` } : undefined}
                    >
                      <span aria-hidden className={`${styles.number} absolute left-2 top-1 text-[clamp(16px,3vh,26px)] font-extrabold`}>{i + 1}</span>
                      {id && (
                        <span key={`${id}-${revealed}`} aria-label={EVENTS[id].name} className={`${styles.chip} text-[clamp(38px,8.6vh,80px)] leading-none`}>
                          {EVENTS[id].emoji}
                        </span>
                      )}
                    </div>
                    <span className={`${styles.label} text-[clamp(13px,2.4vh,20px)] font-extrabold uppercase tracking-wide`}>{label}</span>
                    {wrongHere && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {revealed && i === 1 && (
                      <span className={`${styles.revealTag} absolute -top-9 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex w-[min(96vw,620px)] items-center justify-around gap-[clamp(6px,2vw,18px)]">
              {round.choices.map((id) => {
                const used = placed.includes(id);
                return (
                  <button
                    key={`${round.key}-${id}`}
                    type="button"
                    onClick={() => place(id)}
                    disabled={stage !== "choosing" || used}
                    aria-label={EVENTS[id].name}
                    className={cn(styles.card, "flex aspect-square w-[clamp(76px,min(24vw,17vh),140px)] items-center justify-center rounded-2xl text-[clamp(34px,7.6vh,70px)] leading-none", used && styles.cardUsed)}
                  >
                    <span aria-hidden>{EVENTS[id].emoji}</span>
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
