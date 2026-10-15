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
  LISTEN,
  QUESTION,
  REVEAL_TEXT,
  WHERE,
  WHO,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  sceneName,
} from "./ReadAndMatch.data";
import styles from "./ReadAndMatch.module.css";

interface Round {
  key: string;
  text: string;
  answer: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "reading" | "choosing" | "feedback";

function isScene(scene: unknown): scene is string {
  if (typeof scene !== "string") return false;
  const [who, where, extra] = scene.split("-");
  return extra === undefined && Object.hasOwn(WHO, who) && Object.hasOwn(WHERE, where ?? "");
}

function buildRound(row: QuestionRow): Round {
  const { text, choices } = row.questionData as { text: unknown; choices: unknown };
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error(`Question ${row.questionKey} needs a "text" to read`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every(isScene)) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} must have its answer among the choices`);
  }
  return { key: row.questionKey, text, answer, choices };
}

function Scene({ scene }: { scene: string }) {
  const [who, where] = scene.split("-");
  const inside = WHERE[where].inside;
  return (
    <span aria-hidden className="pointer-events-none relative block size-full select-none">
      <span className={cn("absolute left-1/2 -translate-x-1/2 text-[clamp(30px,7vh,64px)] leading-none", inside ? "top-[14%] z-0" : "top-[4%] z-[1]")}>{WHO[who].emoji}</span>
      <span className={cn("absolute bottom-[6%] left-1/2 -translate-x-1/2 text-[clamp(40px,9vh,84px)] leading-none", inside ? "z-[1]" : "z-0")}>{WHERE[where].emoji}</span>
    </span>
  );
}

export default function ReadAndMatch({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Read and Match questions:", err);
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
  const [stage, setStage] = useState<Stage>("reading");
  const [opened, setOpened] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Read and Match";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The envelope opens as the prompt is heard, so the letter is on screen before any postcard can be tapped.
  const openLetter = useCallback(() => {
    setStage("reading");
    speak(LISTEN, () => {
      speak(QUESTION, undefined, { onStart: () => setStage("choosing") });
    }, { onStart: () => setOpened(true) });
  }, [speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["read and match"]], openLetter);
      return;
    }
    openLetter();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setOpened(false);
    setStage("reading");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (scene: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(scene);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: scene }];
      const earned = scene === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(round.text, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(round.text), advance, { minMs: REVEAL_MIN_MS });
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

  const backdrop = <div aria-hidden className={`${styles.stripes} pointer-events-none absolute inset-0`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Sorting the mail…</p>
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
            You matched {score} of {total} postcards!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(40,30,20,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(QUESTION)}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(14px,4vh,40px)]">
            <div key={round.key} className={cn(styles.envelope, "relative w-[min(92vw,620px)] rounded-xl px-[clamp(16px,4vw,40px)] pb-[clamp(14px,3vh,28px)] pt-[clamp(26px,5vh,46px)]", opened && styles.envelopeOpen)}>
              <span aria-hidden className={`${styles.flap} absolute inset-x-0 top-0 h-[clamp(22px,4.5vh,40px)]`} />
              <span aria-hidden className={`${styles.stamp} absolute right-3 top-2 flex size-[clamp(34px,6.5vh,54px)] items-center justify-center text-[clamp(18px,3.6vh,30px)]`}>🌻</span>
              <p className={`${styles.letter} relative m-0 text-center text-[clamp(30px,7vh,62px)] font-extrabold leading-tight`}>{round.text}</p>
            </div>

            <div className="flex w-[min(96vw,720px)] items-stretch justify-around gap-[clamp(8px,2vw,20px)]">
              {round.choices.map((scene, i) => {
                const isPicked = picked === scene;
                const won = isPicked && scene === round.answer;
                return (
                  <div key={`${round.key}-${scene}`} className={cn("relative w-[clamp(96px,min(29vw,30vh),220px)]", i === 0 && "-rotate-3", i === 2 && "rotate-3")}>
                    <button
                      type="button"
                      onClick={() => choose(scene)}
                      disabled={stage !== "choosing"}
                      aria-label={sceneName(scene)}
                      className={cn(
                        styles.postcard,
                        "relative flex aspect-[4/5] w-full items-center justify-center rounded-lg p-[6%]",
                        won && styles.postcardWon,
                        isPicked && !won && styles.postcardWrong,
                        reveal === scene && styles.postcardReveal,
                      )}
                    >
                      <span className={`${styles.photo} block size-full rounded-md`}>
                        <Scene scene={scene} />
                      </span>
                      {won && <span aria-hidden className={`${styles.postmark} absolute -bottom-3 -right-3 flex size-12 items-center justify-center rounded-full text-2xl font-extrabold`}>✓</span>}
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === scene && (
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
