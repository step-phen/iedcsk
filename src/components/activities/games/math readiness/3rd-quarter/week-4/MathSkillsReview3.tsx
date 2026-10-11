"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import { SNACKS } from "../week-1/BigOrSmall.data";
import { OBJECTS as SIZE_OBJECTS, OBJECT_FONT } from "../week-1/SizeSorting.data";
import { LengthItem, UNIT } from "../week-2/LengthItem";
import { LANDMARKS, OBJECTS as PARK_OBJECTS, SPOT } from "../week-3/NearOrFar.data";
import { ContainerShape, PLACE_OBJECTS, SPOTS } from "./InsideOutside";
import {
  ASSETS,
  CARD_ICON,
  answerOf,
  correctSpeech,
  instruction,
  parseTask,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Task,
} from "./MathSkillsReview3.data";
import styles from "./MathSkillsReview3.module.css";

interface Round {
  key: string;
  task: Task;
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

function buildRound(row: QuestionRow): Round {
  const task = parseTask(row.questionData, row.questionKey);
  const answer = answerOf(task);
  if (row.correctAnswer.answer !== answer) throw new Error(`Question ${row.questionKey}'s answer must be "${answer}"`);
  return { key: row.questionKey, task, answer };
}

const EMOJI_SIZE = "text-[clamp(44px,9vh,78px)]";

export default function MathSkillsReview3({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Math Skills Review 3 questions:", err);
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
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Math Skills Review 3";
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
    const prompt = instruction(round.task);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["math skills review 3"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const tap = useCallback(
    (id: string) => {
      if (!round || picked) return;
      const correct = id === round.answer;
      setPicked(id);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: id }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round.task) : revealSpeech(round.task), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, picked, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Shuffling the picture cards…</p>
      </div>
    );
  }

  const { task, answer } = round;

  /** One tappable choice with the shared wrong / reveal / correct marks. */
  const choice = (id: string, label: string, content: React.ReactNode, className: string, style?: React.CSSProperties) => (
    <button
      key={id}
      type="button"
      onClick={() => tap(id)}
      disabled={!!picked}
      aria-label={label}
      style={style}
      className={cn(
        styles.choice,
        "relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
        className,
        picked === id && id !== answer && styles.choiceWrong,
        picked && id === answer && (picked === answer ? styles.choiceCorrect : styles.choiceReveal),
      )}
    >
      {content}
      {picked === id && id !== answer && (
        <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
          ✕
        </span>
      )}
    </button>
  );

  const body = (() => {
    switch (task.kind) {
      case "size": {
        const snack = SNACKS[task.object];
        const ids = roundIndex % 2 === 0 ? ["big", "small"] : ["small", "big"];
        return (
          <div className="flex items-center justify-center gap-[clamp(18px,5vw,56px)]">
            {ids.map((id) =>
              choice(
                id,
                `${id} ${snack.name}`,
                <span aria-hidden className="leading-none" style={{ fontSize: id === "big" ? "clamp(84px, 19vh, 150px)" : "clamp(32px, 6.5vh, 52px)" }}>
                  {snack.emoji}
                </span>,
                `${styles.plate} size-[clamp(130px,26vh,210px)] rounded-full`,
              ),
            )}
          </div>
        );
      }
      case "order": {
        const object = SIZE_OBJECTS[task.object];
        return (
          <div className="flex items-end justify-center gap-[clamp(12px,4vw,44px)]">
            {(["medium", "big", "small"] as const).map((id) =>
              choice(
                id,
                `${id} ${object.name}`,
                <span aria-hidden className="leading-none" style={{ fontSize: OBJECT_FONT[id] }}>
                  {object.emoji}
                </span>,
                `${styles.plate} size-[clamp(110px,22vh,180px)] rounded-full`,
              ),
            )}
          </div>
        );
      }
      case "length": {
        const longLane = task.lengths[0] > task.lengths[1] ? 0 : 1;
        return (
          <div className={`${styles.startLine} flex flex-col gap-[clamp(14px,4vh,32px)]`} style={{ width: `calc(${UNIT} * 7.2)` }}>
            {task.lengths.map((length, lane) => {
              const id = lane === longLane ? "long" : "short";
              return choice(id, `${id} ${task.item}`, <LengthItem kind={task.item} length={length} />, `${styles.lane} w-full justify-start rounded-r-2xl py-[clamp(8px,1.8vh,16px)]`);
            })}
          </div>
        );
      }
      case "distance": {
        const x = (spot: keyof typeof SPOT) => (task.side === "left" ? SPOT[spot] : 100 - SPOT[spot]);
        const object = PARK_OBJECTS[task.object];
        return (
          <div className={`${styles.park} relative h-[clamp(200px,40vh,360px)] w-full overflow-hidden rounded-2xl`}>
            <div className="absolute bottom-[12%] flex -translate-x-1/2 flex-col items-center" style={{ left: `${x("landmark")}%` }}>
              <span aria-hidden className="text-[clamp(24px,4.6vh,40px)] leading-none">📍</span>
              <span aria-hidden className="text-[clamp(70px,15vh,130px)] leading-none">{LANDMARKS[task.landmark].emoji}</span>
            </div>
            {(["near", "far"] as const).map((id) =>
              choice(
                id,
                `${object.name} ${id === "near" ? "near" : "far from"} the ${LANDMARKS[task.landmark].name}`,
                <span aria-hidden className={`${EMOJI_SIZE} leading-none`}>{object.emoji}</span>,
                "absolute bottom-[12%] size-[clamp(70px,14vh,116px)] -translate-x-1/2 rounded-full",
                { left: `${x(id)}%` },
              ),
            )}
          </div>
        );
      }
      case "position": {
        const object = PLACE_OBJECTS[task.object];
        const spots = { inside: SPOTS.inside[0], outside: SPOTS.outside[1] };
        return (
          <div className={`${styles.room} relative h-[clamp(200px,40vh,360px)] w-full overflow-hidden rounded-2xl`}>
            <ContainerShape kind={task.container} />
            {(["inside", "outside"] as const).map((id) =>
              choice(
                id,
                `${object.name} ${id}`,
                <span aria-hidden className={`${EMOJI_SIZE} leading-none`}>{object.emoji}</span>,
                "absolute size-[clamp(70px,14vh,116px)] -translate-x-1/2 -translate-y-1/2 rounded-full",
                { left: `${spots[id].x}%`, top: `${spots[id].y}%` },
              ),
            )}
          </div>
        );
      }
    }
  })();

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
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

      <h1 className="relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight drop-shadow-[0_2px_0_white]">{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-md px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} picture cards right!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(34,49,79,0.25)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{instruction(task)}</p>
            <button
              type="button"
              onClick={() => speak(instruction(task))}
              disabled={!!picked}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center py-[clamp(8px,2vh,20px)]">
            <div key={round.key} className={`${styles.card} relative flex min-h-[clamp(240px,46vh,420px)] w-[min(94vw,820px)] items-center justify-center rounded-[28px] p-[clamp(12px,2.4vw,24px)]`}>
              <span aria-hidden className={`${styles.cardIcon} absolute -left-3 -top-3 z-[1] flex size-[clamp(40px,7vh,56px)] items-center justify-center rounded-full text-[clamp(20px,3.6vh,30px)]`}>
                {CARD_ICON[task.kind]}
              </span>
              {body}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
