"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { shuffle } from "@/lib/utils";
import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { getLearnerFirstName, getLearnerPhotoUrl, pickRandom, useSpeech } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { ASSETS, SPEECH, feedbackSpeech, hintSpeech, itemAsset, itemLabel, resultSpeech, scoreBadgeAsset } from "./ThingsINeedForMyWritingActivities.data";
import styles from "./ThingsINeedForMyWritingActivities.module.css";

// The rest of the backdrop lives in .screen; the faint white wash keeps the tray readable over the artwork.
const BG_STYLE = {
  backgroundImage: `linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.04)), url(${ASSETS.background})`,
} as const;

type Feedback = {
  kind: "success" | "error";
  message: string;
  /** Spoken in place of message when the voice says more than the bubble shows. */
  spoken?: string;
} | null;

/** Tray item as consumed by this component, mapped from the API response. */
type PackItem = {
  id: string;
  label: string;
  image: string;
  correctAction: "pack" | "leave";
};

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

/** One tray item from its DB row: the item's word as question_key and in question_data, and pack or leave as the answer. */
function toPackItem(row: QuestionRow): PackItem {
  const { item } = row.questionData as { item: unknown };
  const answer = row.correctAnswer.answer;
  if (typeof item !== "string" || (answer !== "pack" && answer !== "leave")) {
    throw new Error(`Question ${row.questionKey} needs an "item" word and a pack or leave answer`);
  }
  return { id: row.questionKey, label: itemLabel(item), image: itemAsset(item), correctAction: answer };
}

export default function ThingsINeedForMyWritingActivities({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  // CSS backgrounds aren't seen by <Image>, so this game's shared backdrop
  // gets a real preload link the same way <Image priority> images do — every
  // screen (loading, error, board) shares this same background.
  ReactDOM.preload(ASSETS.background, { as: "image" });
  // Item data lives in the DB (activity_questions), so the tray always shows
  // whatever the activity is actually configured with — null until loaded.
  const [items, setItems] = useState<PackItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [packed, setPacked] = useState<Record<string, boolean>>({});
  const [firstAttempt, setFirstAttempt] = useState<Record<string, "pack">>({});
  const [wrongPulse, setWrongPulse] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [bagPulse, setBagPulse] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Display-only: the learner name the child already picked on /learner.
  // Never used for grading/identity. Note: the unauthenticated picker
  // endpoint that fills this (/api/classroom-session/learners) deliberately
  // returns firstName only — middle/last name are withheld from that
  // unauthenticated caller. There's nothing more to display here.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  // The game screen can need to scroll to reach the item tray on shorter
  // viewports. Without resetting scroll on finish, the result screen renders
  // at whatever scroll position gameplay left it at, and the header (title
  // banner, instruction panel) — first in the DOM, scrolled above the fold —
  // looks like it vanished even though it's still there.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bagRef = useRef<HTMLDivElement | null>(null);
  // A drag also produces a native click, so both onClick and onDragEnd would
  // otherwise call handlePackAttempt for one gesture — two spoken lines.
  //
  // The flag has to be raised in onDragStart, NOT onDragEnd: framer-motion
  // defers onDragEnd through `frame.postRender()`
  // (VisualElementDragControls.mjs:174), so it runs a frame LATER than the
  // click, while onDragStart runs via `frame.update()` during the drag itself
  // — comfortably before pointerup. Ordering per gesture is therefore:
  // pointerdown -> [dragstart] -> pointerup -> click -> dragend.
  const draggingRef = useRef(false);
  const introSpokenRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Bumped every time a new feedback message is shown. The feedback bar is
  // hidden from that message's own speak() onEnd callback, which checks this
  // against the id it captured — so an older message's speech finishing late
  // (the learner tapped a second item before the first line finished) can
  // never hide the newer message that's since taken over the bar.
  const feedbackRequestIdRef = useRef(0);
  const wrongPulseTimerRef = useRef<number | null>(null);

  const { speak, speakAll, stop } = useSpeech();
  const reduceMotion = useReducedMotion();

  // Fetched once per activity (and again on Retry, via reloadKey). Shuffled
  // here so the tray order varies per attempt; `shuffle` returns a new array,
  // so the fetched rows are never mutated in place.
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

        setItems(shuffle(rows.map(toPackItem)));
      } catch (err) {
        console.error("Failed to load Pack My Writing Bag questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, reloadKey]);

  // A wrong pick's feedback is on screen, so the tray points to the right answers.
  const hint = feedback?.kind === "error";

  const handleRetry = useCallback(() => {
    setLoadError(false);
    setReloadKey((key) => key + 1);
  }, []);

  // Both derived from the loaded data — never a hardcoded 5, so changing which
  // items are "pack" in the DB changes the target the badge counts towards.
  const targetCount = useMemo(
    () => (items ?? []).filter((item) => item.correctAction === "pack").length,
    [items],
  );

  const score = useMemo(
    () =>
      (items ?? []).filter(
        (item) => item.correctAction === "pack" && packed[item.id],
      ).length,
    [items, packed],
  );

  // The targetCount guard matters while items are still loading: without it
  // `0 === 0` reads as a finished game and the result screen fires instantly.
  const done = targetCount > 0 && score === targetCount;

  // No Finish button: once the result line has been spoken, the answers are sent and the learner goes on to the class-ended page.
  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const submitted: SubmittedAnswer[] = (items ?? []).map((item) => ({
      questionId: item.id,
      response: firstAttempt[item.id] ?? "leave",
    }));

    onFinish?.(submitted);
  }, [firstAttempt, items, onFinish]);

  useEffect(() => {
    if (introSpokenRef.current) return;
    introSpokenRef.current = true;

    // useSpeech's speakAll() already defers past React StrictMode's dev-only
    // phantom mount -> cleanup -> mount cycle (see its own comment), so no
    // extra deferral is needed here.
    speakAll([
      learnerGreeting(getLearnerFirstName()),
      GAME_INTRO_LINES["pack my writing bag"],
    ]);
  }, [speakAll]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    return () => {
      if (wrongPulseTimerRef.current) window.clearTimeout(wrongPulseTimerRef.current);
      if (audioCtxRef.current) void audioCtxRef.current.close();
    };
  }, []);

  // The result waits for the last item's feedback to finish speaking, which is when its bubble clears; a fixed delay cut long lines off.
  const resultShownRef = useRef(false);
  useEffect(() => {
    if (!done || feedback || resultShownRef.current) return;
    resultShownRef.current = true;
    setShowResult(true);
    speak(resultSpeech(targetCount), finishOnce);
  }, [done, feedback, speak, targetCount, finishOnce]);

  // Scrolling as soon as showResult flips true raced the result screen's own
  // layout — its bag image (loading="lazy") hadn't sized in yet, so the
  // scroll landed at a "top" that then shifted once the image loaded,
  // leaving the header cropped above the fold. Waiting a frame for that
  // layout to settle first fixes it.
  useEffect(() => {
    if (!showResult) return;
    const frame = requestAnimationFrame(() => {
      rootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [showResult]);

  const playPickupSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(320, now);
      oscillator.frequency.exponentialRampToValueAtTime(620, now + 0.08);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      oscillator.start(now);
      oscillator.stop(now + 0.08);
    } catch {
      // Audio is an enhancement; the game remains fully playable without it.
    }
  }, []);

  const rememberFirstAttempt = useCallback((itemId: string) => {
    setFirstAttempt((current) =>
      itemId in current ? current : { ...current, [itemId]: "pack" },
    );
  }, []);

  // Shows a feedback message and speaks it, hiding the bar only once that
  // speech actually finishes — not on a fixed timer. useSpeech's onEnd fires
  // for both a normal finish and a playback/fetch error (its internal
  // `finish()` backs both `audio.onended` and `audio.onerror`), so a single
  // callback covers "hide when done" either way. The request id guards
  // against a two-taps-in-a-row race: if the learner picks another item
  // before this message's speech ends, that second call bumps the id, so
  // this message's eventual onEnd sees a stale id and leaves the newer
  // message on screen instead of hiding it.
  const showFeedback = useCallback(
    (next: NonNullable<Feedback>) => {
      const requestId = ++feedbackRequestIdRef.current;
      setFeedback(next);

      // Interrupts the intro or anything else still playing, so the feedback is heard right away.
      speak(next.spoken ?? next.message, () => {
        if (feedbackRequestIdRef.current === requestId) {
          setFeedback(null);
        }
      });
    },
    [speak],
  );

  const handlePackAttempt = useCallback(
    (item: PackItem) => {
      // No lock while feedback plays: a new answer cuts the current line off, so the bubble and the voice always match the latest item.
      if (packed[item.id]) return;

      rememberFirstAttempt(item.id);

      if (item.correctAction === "pack") {
        setPacked((current) => ({ ...current, [item.id]: true }));
        setBagPulse((value) => value + 1);
        showFeedback({ kind: "success", message: feedbackSpeech(pickRandom(SPEECH.correct), item.id, true) });
        return;
      }

      setWrongPulse(item.id);
      // The bubble explains the wrong item; the voice then points to the writing things still in the tray, which glow meanwhile.
      const message = feedbackSpeech(pickRandom(SPEECH.wrong), item.id, false);
      const remaining = (items ?? []).filter((i) => i.correctAction === "pack" && !packed[i.id]).map((i) => i.id);
      showFeedback({ kind: "error", message, spoken: `${message} ${hintSpeech(remaining)}` });

      if (wrongPulseTimerRef.current) window.clearTimeout(wrongPulseTimerRef.current);
      wrongPulseTimerRef.current = window.setTimeout(() => setWrongPulse(null), 520);
    },
    [items, packed, rememberFirstAttempt, showFeedback],
  );

  const handleDragEnd = useCallback(
    (item: PackItem, pointerX: number, pointerY: number) => {
      const bag = bagRef.current;
      if (!bag) return;

      const rect = bag.getBoundingClientRect();
      const droppedInside =
        pointerX >= rect.left &&
        pointerX <= rect.right &&
        pointerY >= rect.top &&
        pointerY <= rect.bottom;

      if (droppedInside) handlePackAttempt(item);
    },
    [handlePackAttempt],
  );

  if (loadError) {
    return (
      <div
        className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-5 px-6 text-center`}
        style={BG_STYLE}
      >
        <div className={`${styles.messageCard} rounded-[2rem] px-7 py-5 shadow-lg`}>
          <p className="text-xl font-black sm:text-2xl">
            We couldn&apos;t get your writing things ready.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className={`${styles.blueButton} min-h-14 rounded-full px-12 py-3 text-xl font-black outline-none focus-visible:ring-4 focus-visible:ring-white/70 sm:text-2xl`}
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  if (!items) {
    return (
      <div
        className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center`}
        style={BG_STYLE}
      >
        <div className={`${styles.messageCard} rounded-[2rem] px-7 py-5 shadow-lg`}>
          <p className="text-xl font-black sm:text-2xl">
            Getting your writing things ready…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col overflow-y-auto overflow-x-hidden`}
      style={BG_STYLE}
    >
      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-3 py-1.5 sm:px-5 lg:px-7">
        {/* Header */}
        <div className={`${styles.header} flex flex-col items-center gap-1.5 max-sm:gap-1`}>
          <h1 className="sr-only">{activityName || "Pack My Writing Bag!"}</h1>

          {learnerName && (
            <div className={`${styles.badge} fixed left-2 top-2 z-20 hidden shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 sm:flex short:gap-1.5 short:py-1 short:pl-1 short:pr-3`}>
              <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-9 text-lg sm:size-11 sm:text-xl short:size-7 short:text-sm`} />
              <span className="max-w-[9rem] truncate text-base font-extrabold capitalize leading-none sm:max-w-[13rem] sm:text-xl short:max-w-[7rem] short:text-sm">
                {learnerName}
              </span>
            </div>
          )}

          <Image
            src={ASSETS.title}
            alt=""
            width={2794}
            height={323}
            priority
            draggable={false}
            className="h-auto w-full max-w-xl select-none short:max-w-[min(50vw,380px)]"
          />

          {!showResult && (
            // Landscape phones are too short for the panel; the intro already says the instruction aloud.
            <div className="relative mt-1 w-full max-w-xl sm:mt-0.5 short:hidden">
              <Image
                src={ASSETS.instructionPanel}
                alt=""
                width={2072}
                height={333}
                priority
                draggable={false}
                className="h-auto w-full select-none"
              />
              {/* On phones the panel is full width, so the text starts after the drawn speaker icon instead of over it. */}
              <p className={`${styles.instructionText} absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-xs font-extrabold leading-tight max-sm:pl-[17%] max-sm:pr-[5%] max-sm:text-[11px] sm:px-8 sm:text-sm lg:text-base`}>
                <span>
                  Drag or tap the things you need for writing into the
                </span>
                <span>school bag!</span>
              </p>
            </div>
          )}

          {/* Only score-badge0..5 exist on disk, so the asset index stays
              clamped to 5 even if the DB ever defines more pack items. */}
          <div className="fixed right-2 top-2 z-20 hidden sm:block">
            <Image
              src={scoreBadgeAsset(score)}
              alt={`Score: ${score} of ${targetCount}`}
              width={928}
              height={1189}
              loading="eager"
              className="h-auto w-16 lg:w-20 short:w-10"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.section
              key="game"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className={`${styles.board} flex flex-1 flex-col items-center justify-center gap-1.5 short:flex-row short:gap-[4vw]`}
            >
              {/* Bag; the wrapper anchors the phone-only score badge beside it without moving with the bag's pulse. */}
              <div className="relative mx-auto">
              <motion.div
                ref={bagRef}
                key={`bag-${bagPulse}`}
                animate={
                  bagPulse > 0
                    ? { scale: [1, 1.045, 0.985, 1], rotate: [0, -1, 1, 0] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.45 }}
                className={`${styles.bag} relative mx-auto w-[min(34vw,300px)] min-w-[180px] -translate-y-2 select-none max-sm:w-[min(40vw,19dvh)] max-sm:min-w-0 max-sm:translate-y-0 short:w-[min(24vw,40dvh)] short:min-w-0 short:translate-y-0 sm:-translate-y-3 sm:w-[min(28vw,320px)] lg:w-[min(22vw,340px)]`}
              >
                {/* Feedback bubble — under the bag on phones/tablets, to its
                    left from `lg` up where there's room beside it. A plain
                    wrapper holds the position so Framer's animated transform
                    (on the motion.div inside) never overrides it. */}
                <div
                  className={`${styles.bubble} pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-[min(94vw,440px)] -translate-x-1/2
                             lg:left-auto lg:right-full lg:top-1/2 lg:mr-2 lg:mt-0 lg:w-[min(36vw,480px)] lg:translate-x-0 lg:-translate-y-1/2
                             xl:w-[min(36vw,520px)] short:w-[min(40vw,320px)]`}
                >
                  <AnimatePresence>
                    {feedback && (
                      <motion.div
                        key={`${feedback.kind}-${feedback.message}`}
                        initial={{ opacity: 0, y: 10, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.94 }}
                        className="relative"
                        role="status"
                        aria-live="polite"
                      >
                        <Image
                          src={ASSETS.feedbackBar}
                          alt=""
                          width={2172}
                          height={724}
                          priority
                          className="h-auto w-full select-none"
                        />
                        <p
                          className={`absolute inset-0 flex items-center pl-[22%] pr-[8%] text-center text-[10px] font-black leading-tight sm:text-xs lg:text-sm ${
                            feedback.kind === "success"
                              ? styles.feedbackSuccess
                              : styles.feedbackError
                          }`}
                        >
                          {feedback.message}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Image
                  src={ASSETS.bag}
                  alt="School bag drop zone"
                  width={700}
                  height={700}
                  priority
                  draggable={false}
                  className="h-auto w-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.12)]"
                />

                <div className="pointer-events-none absolute left-1/2 top-[30%] w-[57%] -translate-x-1/2 text-center">
                  <p className="flex flex-col items-center text-sm font-black leading-tight text-white/90 drop-shadow max-sm:text-[10px] sm:text-lg lg:text-xl short:text-[10px]">
                    <span>Drop items</span>
                    <span>here!</span>
                  </p>
                </div>
              </motion.div>
                {/* Phones in portrait hide the corner badge (it would cover the title), so the score sits in the free space beside the bag. */}
                <Image
                  src={scoreBadgeAsset(score)}
                  alt={`Score: ${score} of ${targetCount}`}
                  width={928}
                  height={1189}
                  loading="eager"
                  className="absolute left-full top-1/2 ml-[6vw] h-auto w-[clamp(52px,15vw,72px)] -translate-y-1/2 sm:hidden"
                />
              </div>

              {/* Item tray — flex-wrap instead of a fixed grid so the row
                  re-centers itself as items get packed away, and so the
                  container's height always comes from its content. */}
              <div className={`${styles.trayOuter} relative mx-auto w-full max-w-[1400px] px-1 short:mx-0 short:w-[min(62vw,560px)]`}>
                {/* Phones get four smaller cards per row, so the whole tray fits under the bag without scrolling away from it. */}
                <div className={`${styles.tray} relative flex flex-wrap justify-center gap-2 py-4 px-3 max-sm:px-1 max-sm:py-2 sm:gap-3 sm:py-6 sm:px-4 lg:gap-2 lg:py-8 lg:px-5 xl:gap-3 short:gap-2 short:p-1`}>
                  {items.map((item) => {
                    const isPacked = !!packed[item.id];
                    // While a wrong pick's feedback plays, the writing things zoom in and glow and the rest step back.
                    const hinted = hint && item.correctAction === "pack";
                    const dimmed = hint && item.correctAction === "leave";

                    return (
                      <AnimatePresence key={item.id} mode="popLayout">
                        {!isPacked && (
                          <motion.button
                            layout
                            type="button"
                            drag
                            dragSnapToOrigin
                            dragElastic={0.16}
                            dragMomentum={false}
                            onPointerDown={() => {
                              draggingRef.current = false;
                            }}
                            onDragStart={() => {
                              draggingRef.current = true;
                              playPickupSound();
                            }}
                            onDragEnd={(_, info) => {
                              handleDragEnd(item, info.point.x, info.point.y);
                              // Runs after the click that this gesture also
                              // produced, so clearing here can't unblock it.
                              draggingRef.current = false;
                            }}
                            onClick={() => {
                              // A drag already handled (or deliberately
                              // ignored) this gesture in onDragEnd.
                              if (draggingRef.current) return;
                              handlePackAttempt(item);
                            }}
                            initial={{ opacity: 0, scale: 0.7, y: 12 }}
                            animate={{
                              opacity: dimmed ? 0.4 : 1,
                              scale: hinted && !reduceMotion ? 1.12 : dimmed && !reduceMotion ? 0.92 : 1,
                              y: 0,
                              rotate:
                                wrongPulse === item.id
                                  ? [0, -8, 8, -6, 6, 0]
                                  : 0,
                            }}
                            exit={{
                              opacity: 0,
                              scale: 0.35,
                              y: -60,
                              transition: { duration: 0.28 },
                            }}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            whileDrag={{ scale: 1.14, zIndex: 30, rotate: 0 }}
                            transition={{
                              default: {
                                type: "spring",
                                stiffness: 280,
                                damping: 20,
                              },
                              rotate:
                                wrongPulse === item.id
                                  ? { duration: 0.45 }
                                  : { duration: 0.2 },
                            }}
                            className={`group flex h-[120px] w-[110px] touch-none cursor-grab flex-col items-center justify-center gap-1 rounded-xl p-1 shadow-sm outline-none ${styles.itemCard} focus-visible:ring-4 focus-visible:ring-[#3aa3ff]/40 active:cursor-grabbing max-sm:h-[clamp(78px,12dvh,104px)] max-sm:w-[calc((100%-1.5rem)/4)] sm:h-[130px] lg:h-[140px] short:h-[clamp(64px,30dvh,100px)] short:w-[calc((100%-2rem)/5)] ${hinted ? styles.itemHint : ""}`}
                            aria-label={`Pack ${item.label}`}
                          >
                            <div className="flex h-[80px] w-full shrink-0 items-center justify-center max-sm:h-auto max-sm:min-h-0 max-sm:flex-1 sm:h-[90px] lg:h-[98px] short:h-auto short:min-h-0 short:flex-1">
                              <Image
                                src={item.image}
                                alt=""
                                width={112}
                                height={112}
                                priority
                                draggable={false}
                                className="max-h-[80px] max-w-[80px] select-none object-contain max-sm:max-h-[min(64px,7.5dvh)] max-sm:max-w-[85%] sm:max-h-[90px] sm:max-w-[90px] lg:max-h-[98px] lg:max-w-[98px] short:max-h-[min(60px,20dvh)] short:max-w-[85%]"
                              />
                            </div>
                            <div className="flex h-[28px] w-full shrink-0 items-center justify-center max-sm:h-4 short:h-4">
                              <span className="line-clamp-2 text-center text-xs font-black leading-tight max-sm:line-clamp-1 max-sm:text-[10px] short:line-clamp-1 short:text-[10px]">
                                {item.label}
                              </span>
                            </div>
                          </motion.button>
                        )}
                      </AnimatePresence>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="result"
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="flex flex-1 flex-col items-center justify-center gap-3 py-3 text-center short:flex-row short:gap-6 short:py-1"
            >
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, -2, 2, 0] }}
                transition={{ duration: 1.15, repeat: 1 }}
                className="relative w-[min(40vw,280px)] short:w-[min(24vw,38dvh)]"
              >
                <Image
                  src={ASSETS.bag}
                  alt="Packed school bag"
                  width={700}
                  height={700}
                  loading="eager"
                  className="h-auto w-full object-contain"
                />
              </motion.div>

              <div className={`${styles.resultCard} rounded-[2rem] px-7 py-4 shadow-lg`}>
                <h2 className={`${styles.resultTitle} text-3xl font-black sm:text-4xl`}>
                  Bag Packed! 🎒
                </h2>
                <p className={`${styles.resultText} mt-2 text-lg font-bold sm:text-xl`}>
                  Great job! You packed all {targetCount} writing things!
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
