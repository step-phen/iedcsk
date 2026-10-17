"use client";

import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
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
  QUESTION,
  REVEAL_TEXT,
  WHERE,
  WHO,
  answerLine,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./WhoAndWhere.data";
import styles from "./WhoAndWhere.module.css";

interface Round {
  key: string;
  text: string;
  who: string[];
  where: string[];
  answerWho: string;
  answerWhere: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "listening" | "choosing" | "feedback";

function knownList(list: unknown, known: Record<string, unknown>): list is string[] {
  return Array.isArray(list) && list.length === 3 && list.every((id) => typeof id === "string" && Object.hasOwn(known, id));
}

function buildRound(row: QuestionRow): Round {
  const { text, who, where } = row.questionData as { text: unknown; who: unknown; where: unknown };
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error(`Question ${row.questionKey} needs a story "text"`);
  }
  if (!knownList(who, WHO) || !knownList(where, WHERE)) {
    throw new Error(`Question ${row.questionKey} needs three known "who" and three known "where" choices`);
  }
  const [answerWho, answerWhere, extra] = row.correctAnswer.answer.split("|");
  if (extra !== undefined || !who.includes(answerWho) || !where.includes(answerWhere ?? "")) {
    throw new Error(`Question ${row.questionKey} needs an answer of "<who>|<where>" from its choices`);
  }
  return { key: row.questionKey, text, who, where, answerWho, answerWhere };
}

export default function WhoAndWhere({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Who and Where questions:", err);
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
  const [pickedWho, setPickedWho] = useState<string | null>(null);
  const [pickedWhere, setPickedWhere] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Who and Where?";
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["who and where?"]], askQuestion);
      return;
    }
    askQuestion();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPickedWho(null);
    setPickedWhere(null);
    setRevealed(false);
    setStage("listening");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // The story is judged once both a character and a place are in the box; each row locks after its pick.
  const judge = useCallback(
    (who: string, where: string) => {
      if (!round) return;
      setStage("feedback");
      answersRef.current = [...answersRef.current, { questionId: round.key, response: `${who}|${where}` }];
      const line = answerLine(round.answerWho, round.answerWhere);
      const earned = who === round.answerWho && where === round.answerWhere;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(line, roundIndex), advance);
        return;
      }
      setRevealed(true);
      speak(revealSpeech(line), advance, { minMs: REVEAL_MIN_MS });
    },
    [round, roundIndex, speak, advance],
  );

  const pickWho = useCallback(
    (id: string) => {
      if (stage !== "choosing" || pickedWho) return;
      setPickedWho(id);
      if (pickedWhere) judge(id, pickedWhere);
    },
    [stage, pickedWho, pickedWhere, judge],
  );

  const pickWhere = useCallback(
    (id: string) => {
      if (stage !== "choosing" || pickedWhere) return;
      setPickedWhere(id);
      if (pickedWho) judge(pickedWho, id);
    },
    [stage, pickedWho, pickedWhere, judge],
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

  const backdrop = <div aria-hidden className={`${styles.table} pointer-events-none absolute inset-0`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Opening the shoebox…</p>
      </div>
    );
  }

  const boxWho = revealed ? round.answerWho : pickedWho;
  const boxWhere = revealed ? round.answerWhere : pickedWhere;
  const won = stage === "feedback" && !revealed;

  const card = (row: "who" | "where", id: string) => {
    const isWho = row === "who";
    const picked = isWho ? pickedWho : pickedWhere;
    const answer = isWho ? round.answerWho : round.answerWhere;
    const isPicked = picked === id;
    const wrong = stage === "feedback" && isPicked && id !== answer;
    const showReveal = revealed && id === answer && picked !== answer;
    const item = isWho ? WHO[id] : WHERE[id];
    return (
      <div key={`${round.key}-${row}-${id}`} className="relative w-[clamp(74px,min(22vw,15vh),130px)]">
        <button
          type="button"
          onClick={() => (isWho ? pickWho(id) : pickWhere(id))}
          disabled={stage !== "choosing" || picked !== null}
          aria-label={item.name}
          className={cn(
            styles.card,
            isWho ? styles.cardWho : styles.cardWhere,
            "flex aspect-[4/5] w-full flex-col items-center justify-center rounded-xl",
            isPicked && !wrong && styles.cardPicked,
            won && isPicked && styles.cardWon,
            wrong && styles.cardWrong,
            showReveal && styles.cardReveal,
          )}
        >
          <span aria-hidden className="text-[clamp(28px,6vh,54px)] leading-none">{item.emoji}</span>
          <span className="text-[clamp(14px,2.6vh,22px)] font-extrabold leading-tight">{item.name}</span>
        </button>
        {wrong && (
          <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-8 items-center justify-center rounded-full text-lg font-extrabold leading-none`}>
            ✕
          </span>
        )}
        {showReveal && (
          <span className={`${styles.revealTag} absolute -top-8 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(12px,2vh,16px)] font-extrabold`}>{REVEAL_TEXT}</span>
        )}
      </div>
    );
  };

  const boxStyle = boxWhere ? ({ "--sky": WHERE[boxWhere].sky, "--ground": WHERE[boxWhere].ground } as CSSProperties) : undefined;

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
            You built {score} of {total} stories!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(60,30,10,0.35)]" />
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

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(6px,1.6vh,16px)]">
            <div className="flex w-[min(96vw,820px)] items-center gap-[clamp(8px,2vw,18px)]">
              <p key={round.key} className={`${styles.story} m-0 flex-1 rounded-xl px-[clamp(10px,2.4vw,22px)] py-[clamp(6px,1.4vh,14px)] text-[clamp(17px,3.4vh,30px)] font-bold leading-snug`}>
                {round.text}
              </p>
              <div className={cn(styles.box, "relative flex aspect-[4/3] w-[clamp(110px,28vw,230px)] shrink-0 items-end justify-center overflow-hidden rounded-md", won && styles.boxWon)} style={boxStyle}>
                {boxWhere && <span aria-hidden key={boxWhere} className={`${styles.backdropPic} absolute right-[8%] top-[10%] text-[clamp(26px,6vh,56px)] leading-none`}>{WHERE[boxWhere].emoji}</span>}
                {boxWho && <span aria-hidden key={boxWho} className={`${styles.actor} relative mb-[8%] text-[clamp(30px,7vh,64px)] leading-none`}>{WHO[boxWho].emoji}</span>}
                {!boxWho && !boxWhere && <span className={`${styles.empty} mb-[30%] text-[clamp(13px,2.2vh,18px)] font-extrabold`}>Your scene</span>}
              </div>
            </div>

            <div className="flex w-full flex-col items-center gap-[clamp(4px,1vh,10px)]">
              <div className="flex items-center gap-[clamp(6px,1.6vw,14px)]">
                <span className={`${styles.rowLabel} w-[clamp(64px,13vw,96px)] rounded-full py-0.5 text-center text-[clamp(15px,2.8vh,24px)] font-extrabold`}>Who?</span>
                {round.who.map((id) => card("who", id))}
              </div>
              <div className="flex items-center gap-[clamp(6px,1.6vw,14px)]">
                <span className={`${styles.rowLabel} w-[clamp(64px,13vw,96px)] rounded-full py-0.5 text-center text-[clamp(15px,2.8vh,24px)] font-extrabold`}>Where?</span>
                {round.where.map((id) => card("where", id))}
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
