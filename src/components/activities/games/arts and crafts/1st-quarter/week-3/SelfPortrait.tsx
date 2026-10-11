"use client";

import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useLayoutEffect,
} from "react";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Group, Rect, Circle, Ellipse, Line, Text } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";

/* ============================================================
   SELF-PORTRAIT — "build my face" drag-and-drop
   A blank face waits with 5 dashed feature slots (hair, eyes,
   nose, mouth, ears); the learner drags each piece from the
   tray onto the matching spot to complete their own portrait.
   All art is drawn with plain Konva shapes — no images to load,
   so nothing can go missing/blank the way a raster asset can.
   ============================================================ */

const GREEN = "#3FAE72";
const RED = "#E15A5A";
const SKIN = "#F5C89B";
const SKIN_DARK = "#E3A870";
const HAIR_BROWN = "#6B4226";

/* ============================================================
   FEATURE LIBRARY — code-owned art + labels. Only which 5
   features make up this round of the game lives in the DB
   (activity_questions), same contract as every other activity.
   See scripts/sql/self-portrait-rounds.sql.
   ============================================================ */
type FeatureKey = "hair" | "eyes" | "nose" | "mouth" | "ears";

const FEATURE_LIB: Record<FeatureKey, { label: string }> = {
  hair: { label: "Hair" },
  eyes: { label: "Eyes" },
  nose: { label: "Nose" },
  mouth: { label: "Mouth" },
  ears: { label: "Ears" },
};

function isFeatureKey(value: string): value is FeatureKey {
  return value in FEATURE_LIB;
}

interface Round {
  id: FeatureKey;
  label: string;
}

/** Question data as stored in `activity_questions.question_data`. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

/* ============================================================
   BADGE
   ============================================================ */
interface BadgeTier {
  label: string;
  sub: string;
}

function getBadgeTier(score: number, total: number): BadgeTier {
  if (score === total && total > 0)
    return { label: "GOLD BADGE", sub: "Perfect! What a wonderful portrait!" };
  if (score >= Math.ceil(total * 0.6))
    return { label: "SILVER BADGE", sub: "Great job building your face!" };
  if (score >= 1)
    return { label: "STARTER BADGE", sub: "Nice try! Keep drawing yourself!" };
  return { label: "KEEP PRACTICING BADGE", sub: "Every try helps you learn — keep going!" };
}

function BadgeSvg() {
  return (
    <svg width="120" height="128" viewBox="0 0 140 150">
      <polygon points="45,80 30,148 70,128 110,148 95,80" fill="#E8734A" stroke="#1E2A4A" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="70" cy="62" r="52" fill="#F0B429" stroke="#1E2A4A" strokeWidth="4" />
      <circle cx="70" cy="62" r="40" fill="#FCE4A8" stroke="#1E2A4A" strokeWidth="3" />
      <polygon points="70,32 78,54 102,54 82,68 90,90 70,76 50,90 58,68 38,54 62,54"
        fill="#E8734A" stroke="#1E2A4A" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ============================================================
   FACE BOARD — react-konva canvas.
   The face and its 5 anatomical slots sit at fixed coordinates
   in a VBOX; a ResizeObserver drives the Stage's pixel size +
   uniform scale (same pattern as Shape.tsx / ShapesTracing.tsx).
   Slot hit-testing is a piece's own center against each slot's
   rect(s) — ears contribute two separate rects (left + right)
   since they don't share one bounding box without also covering
   the eyes/nose/mouth in between.
   ============================================================ */
const FACE_VBOX_W = 640;
const FACE_ROW_H = 420;
const ROW_GAP = 40;
const PIECE_BOX = 100;
const PIECE_GAP = 26;
const PIECE_ROW_H = PIECE_BOX + 30;
const BOARD_VBOX_H = FACE_ROW_H + ROW_GAP + PIECE_ROW_H;

const HEAD_CX = FACE_VBOX_W / 2;
const HEAD_CY = 230;
const HEAD_R = 140;
const PIECE_ROW_Y = FACE_ROW_H + ROW_GAP;

interface SlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One rect per hit-testable region — ears register two. */
const SLOT_RECTS: Record<FeatureKey, SlotRect[]> = {
  hair: [{ x: 170, y: 45, w: 300, h: 130 }],
  eyes: [{ x: 255, y: 185, w: 130, h: 40 }],
  nose: [{ x: 295, y: 225, w: 50, h: 50 }],
  mouth: [{ x: 270, y: 280, w: 100, h: 45 }],
  ears: [
    { x: 156, y: 194, w: 44, h: 72 },
    { x: 440, y: 194, w: 44, h: 72 },
  ],
};

function findSlotAt(cx: number, cy: number): FeatureKey | null {
  for (const key of Object.keys(SLOT_RECTS) as FeatureKey[]) {
    for (const r of SLOT_RECTS[key]) {
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) return key;
    }
  }
  return null;
}

/** The base head — always visible, drawn once behind everything else. */
function FaceHead() {
  return (
    <>
      <Circle x={HEAD_CX} y={HEAD_CY} radius={HEAD_R} fill={SKIN} stroke="#1E2A4A" strokeWidth={4} strokeScaleEnabled={false} />
      {/* soft cheek blush, purely decorative */}
      <Circle x={HEAD_CX - 78} y={HEAD_CY + 45} radius={20} fill="#F4A7A7" opacity={0.5} />
      <Circle x={HEAD_CX + 78} y={HEAD_CY + 45} radius={20} fill="#F4A7A7" opacity={0.5} />
    </>
  );
}

/** One anatomical slot: dashed guide when empty, the real feature once
 * placed, plus a checkmark badge like the other drag games. */
function FaceSlot({ feature, isFilled, isActive }: { feature: FeatureKey; isFilled: boolean; isActive: boolean }) {
  const guideStroke = isFilled ? "#2f9e8f" : isActive ? "#38bdf8" : "#38bdf8";
  const guideDash = isFilled ? undefined : [8, 7];
  const guideOpacity = isFilled ? 0 : isActive ? 1 : 0.65;

  return (
    <>
      {feature === "hair" && (
        <>
          <Ellipse x={HEAD_CX} y={110} radiusX={150} radiusY={65} stroke={guideStroke} strokeWidth={3} dash={guideDash} opacity={guideOpacity} strokeScaleEnabled={false} listening={false} />
          {isFilled && (
            <Ellipse x={HEAD_CX} y={112} radiusX={148} radiusY={64} fill={HAIR_BROWN} stroke="#1E2A4A" strokeWidth={3} strokeScaleEnabled={false} listening={false} />
          )}
        </>
      )}

      {feature === "eyes" && (
        <>
          {[HEAD_CX - 45, HEAD_CX + 45].map((cx, i) => (
            <Circle key={i} x={cx} y={205} radius={18} stroke={guideStroke} strokeWidth={3} dash={guideDash} opacity={guideOpacity} strokeScaleEnabled={false} listening={false} />
          ))}
          {isFilled &&
            [HEAD_CX - 45, HEAD_CX + 45].map((cx, i) => (
              <Group key={i} listening={false}>
                <Circle x={cx} y={205} radius={16} fill="white" stroke="#1E2A4A" strokeWidth={2.5} strokeScaleEnabled={false} />
                <Circle x={cx} y={205} radius={8} fill="#1E2A4A" />
                <Circle x={cx + 2.5} y={202} radius={2.5} fill="white" />
              </Group>
            ))}
        </>
      )}

      {feature === "nose" && (
        <>
          <Circle x={HEAD_CX} y={250} radius={16} stroke={guideStroke} strokeWidth={3} dash={guideDash} opacity={guideOpacity} strokeScaleEnabled={false} listening={false} />
          {isFilled && (
            <Group listening={false}>
              <Circle x={HEAD_CX} y={252} radius={15} fill={SKIN_DARK} stroke="#1E2A4A" strokeWidth={2.5} strokeScaleEnabled={false} />
              <Circle x={HEAD_CX - 5} y={256} radius={2} fill="#1E2A4A" />
              <Circle x={HEAD_CX + 5} y={256} radius={2} fill="#1E2A4A" />
            </Group>
          )}
        </>
      )}

      {feature === "mouth" && (
        <>
          <Ellipse x={HEAD_CX} y={302} radiusX={45} radiusY={18} stroke={guideStroke} strokeWidth={3} dash={guideDash} opacity={guideOpacity} strokeScaleEnabled={false} listening={false} />
          {isFilled && (
            <Line
              points={[HEAD_CX - 40, 295, HEAD_CX, 318, HEAD_CX + 40, 295]}
              stroke="#C0392B"
              strokeWidth={9}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
              strokeScaleEnabled={false}
              listening={false}
            />
          )}
        </>
      )}

      {feature === "ears" && (
        <>
          {[HEAD_CX - 142, HEAD_CX + 142].map((cx, i) => (
            <Ellipse key={i} x={cx} y={230} radiusX={22} radiusY={36} stroke={guideStroke} strokeWidth={3} dash={guideDash} opacity={guideOpacity} strokeScaleEnabled={false} listening={false} />
          ))}
          {isFilled &&
            [HEAD_CX - 142, HEAD_CX + 142].map((cx, i) => (
              <Group key={i} listening={false}>
                <Ellipse x={cx} y={230} radiusX={20} radiusY={34} fill={SKIN} stroke="#1E2A4A" strokeWidth={2.5} strokeScaleEnabled={false} />
                <Ellipse x={cx} y={230} radiusX={9} radiusY={16} fill={SKIN_DARK} opacity={0.6} />
              </Group>
            ))}
        </>
      )}

      {isFilled && (
        <SlotCheckmark feature={feature} />
      )}
    </>
  );
}

/** A small green checkmark hovering near whichever slot just got solved. */
function SlotCheckmark({ feature }: { feature: FeatureKey }) {
  const pos: Record<FeatureKey, { x: number; y: number }> = {
    hair: { x: HEAD_CX + 130, y: 60 },
    eyes: { x: HEAD_CX + 100, y: 190 },
    nose: { x: HEAD_CX + 45, y: 240 },
    mouth: { x: HEAD_CX + 75, y: 300 },
    ears: { x: HEAD_CX + 165, y: 200 },
  };
  const { x, y } = pos[feature];
  return (
    <Group x={x} y={y} listening={false}>
      <Circle radius={15} fill="#2f9e8f" stroke="white" strokeWidth={2} strokeScaleEnabled={false} shadowColor="rgba(34,49,79,0.4)" shadowBlur={4} shadowOffsetY={2} />
      <Text x={-8} y={-9} text="✓" fontSize={17} fontStyle="bold" fill="white" />
    </Group>
  );
}

/** A compact icon for the tray card — same feature art, scaled to fit a
 * small box instead of its real anatomical position/size. */
function PieceIcon({ feature }: { feature: FeatureKey }) {
  const c = PIECE_BOX / 2;
  switch (feature) {
    case "hair":
      return <Ellipse x={c} y={c} radiusX={34} radiusY={22} fill={HAIR_BROWN} stroke="#1E2A4A" strokeWidth={2.5} strokeScaleEnabled={false} />;
    case "eyes":
      return (
        <>
          {[c - 20, c + 20].map((x, i) => (
            <Group key={i}>
              <Circle x={x} y={c} radius={14} fill="white" stroke="#1E2A4A" strokeWidth={2} strokeScaleEnabled={false} />
              <Circle x={x} y={c} radius={7} fill="#1E2A4A" />
            </Group>
          ))}
        </>
      );
    case "nose":
      return (
        <Group>
          <Circle x={c} y={c} radius={20} fill={SKIN_DARK} stroke="#1E2A4A" strokeWidth={2.5} strokeScaleEnabled={false} />
          <Circle x={c - 6} y={c + 5} radius={2.4} fill="#1E2A4A" />
          <Circle x={c + 6} y={c + 5} radius={2.4} fill="#1E2A4A" />
        </Group>
      );
    case "mouth":
      return (
        <Line
          points={[c - 30, c - 8, c, c + 16, c + 30, c - 8]}
          stroke="#C0392B"
          strokeWidth={8}
          lineCap="round"
          lineJoin="round"
          tension={0.5}
          strokeScaleEnabled={false}
        />
      );
    case "ears":
      return (
        <>
          {[c - 26, c + 26].map((x, i) => (
            <Ellipse key={i} x={x} y={c} radiusX={13} radiusY={22} fill={SKIN} stroke="#1E2A4A" strokeWidth={2.5} strokeScaleEnabled={false} />
          ))}
        </>
      );
  }
}

/** One draggable piece. Position is uncontrolled while the user drags; a
 * miss tweens the piece back to its tray slot, a correct drop just
 * unmounts it (the caller removes it from `items` once placed). */
function DraggablePiece({
  round,
  x,
  y,
  onDragStart,
  onActiveSlotChange,
  onDrop,
}: {
  round: Round;
  x: number;
  y: number;
  onDragStart: () => void;
  onActiveSlotChange: (feature: FeatureKey | null) => void;
  onDrop: (round: Round, target: FeatureKey | null) => void;
}) {
  const groupRef = useRef<Konva.Group | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const node = groupRef.current;
    if (!node || isDraggingRef.current) return;
    node.to({ x, y, duration: 0.25, easing: Konva.Easings.EaseOut });
  }, [x, y]);

  const setCursor = (cursor: string) => (e: KonvaEventObject<Event>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable
      onDragStart={() => {
        isDraggingRef.current = true;
        onDragStart();
      }}
      onDragMove={(e) => {
        const node = e.target;
        onActiveSlotChange(findSlotAt(node.x() + PIECE_BOX / 2, node.y() + PIECE_BOX / 2));
      }}
      onDragEnd={(e) => {
        isDraggingRef.current = false;
        const node = e.target;
        const target = findSlotAt(node.x() + PIECE_BOX / 2, node.y() + PIECE_BOX / 2);
        onActiveSlotChange(null);
        if (target !== round.id) {
          node.to({ x, y, duration: 0.25, easing: Konva.Easings.EaseOut });
        }
        onDrop(round, target);
      }}
      onMouseEnter={setCursor("grab")}
      onMouseLeave={setCursor("default")}
      onMouseDown={setCursor("grabbing")}
      onMouseUp={setCursor("grab")}
    >
      <Rect
        width={PIECE_BOX}
        height={PIECE_BOX}
        cornerRadius={18}
        fill="#fffdf6"
        stroke="#9333ea"
        strokeWidth={4}
        strokeScaleEnabled={false}
        shadowColor="rgba(147,51,234,0.55)"
        shadowBlur={16}
        shadowOpacity={1}
      />
      <PieceIcon feature={round.id} />
      <Text
        y={PIECE_BOX - 20}
        width={PIECE_BOX}
        align="center"
        text={round.label}
        fontSize={13}
        fontStyle="bold"
        fill="#1E2A4A"
      />
    </Group>
  );
}

function FaceBoard({
  rounds,
  placed,
  activeSlot,
  onDragStart,
  onActiveSlotChange,
  onDrop,
}: {
  rounds: Round[];
  placed: Record<string, boolean>;
  activeSlot: FeatureKey | null;
  onDragStart: () => void;
  onActiveSlotChange: (feature: FeatureKey | null) => void;
  onDrop: (round: Round, target: FeatureKey | null) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale =
    size.w > 0 && size.h > 0
      ? Math.min(size.w / FACE_VBOX_W, size.h / BOARD_VBOX_H)
      : 0;

  const unplaced = useMemo(() => rounds.filter((r) => !placed[r.id]), [rounds, placed]);
  const pieceStartX = (FACE_VBOX_W - (unplaced.length * PIECE_BOX + (unplaced.length - 1) * PIECE_GAP)) / 2;

  return (
    <div ref={wrapperRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
      {scale > 0 && (
        <Stage width={FACE_VBOX_W * scale} height={BOARD_VBOX_H * scale} scaleX={scale} scaleY={scale}>
          <Layer>
            <FaceHead />
            {(Object.keys(FEATURE_LIB) as FeatureKey[]).map((key) => (
              <FaceSlot key={key} feature={key} isFilled={!!placed[key]} isActive={activeSlot === key && !placed[key]} />
            ))}

            {unplaced.map((round, i) => (
              <DraggablePiece
                key={round.id}
                round={round}
                x={pieceStartX + i * (PIECE_BOX + PIECE_GAP)}
                y={PIECE_ROW_Y}
                onDragStart={onDragStart}
                onActiveSlotChange={onActiveSlotChange}
                onDrop={onDrop}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function SelfPortrait({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const { speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Question data lives in the DB (activity_questions), fetched once — every
  // other activity in this app works the same way. Only which 5 features
  // make up this round comes from the server; the art/layout is code-owned
  // above, and each feature's anatomical slot is fixed (a face only has one
  // place eyes can go), so there's no outline-order to scramble here.
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

        const mapped: Round[] = rows
          .filter((row) => isFeatureKey(row.questionKey))
          .map((row) => {
            const key = row.questionKey as FeatureKey;
            return { id: key, label: FEATURE_LIB[key].label };
          });

        setRounds(mapped);
      } catch (err) {
        console.error("Failed to load Self-Portrait questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState(0);
  const [missedOnce, setMissedOnce] = useState<Record<string, boolean>>({});
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<FeatureKey | null>(null);
  const [finished, setFinished] = useState(false);

  const total = rounds?.length ?? 0;
  const placedCount = Object.keys(placed).length;

  useEffect(() => stop, [stop]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
  }, []);

  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds) return;
    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([
        learnerGreeting(getLearnerFirstName()),
        GAME_INTRO_LINES["self-portrait"],
      ]);
      introStateRef.current = "done";
    }
  }, [rounds, speakAll]);

  const finishedRef = useRef(false);
  const handleFinish = useCallback(
    (finalAnswers: SubmittedAnswer[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      stop();
      onFinish?.(finalAnswers);
    },
    [onFinish, stop],
  );

  const answersRef = useRef<SubmittedAnswer[]>([]);

  const handleDrop = useCallback(
    (round: Round, target: FeatureKey | null) => {
      if (placed[round.id] || !target) return;

      answersRef.current = [...answersRef.current, { questionId: round.id, response: target }];

      if (target === round.id) {
        const nextPlaced = { ...placed, [round.id]: true };
        setPlaced(nextPlaced);
        if (!missedOnce[round.id]) setScore((s) => s + 1);
        setWasCorrect(true);
        setFeedbackVisible(true);

        const isLastFeature = Object.keys(nextPlaced).length === total;
        setTimeout(() => {
          setFeedbackVisible(false);
          if (isLastFeature) setFinished(true);
        }, 1100);
      } else {
        setMissedOnce((prev) => ({ ...prev, [round.id]: true }));
        setWasCorrect(false);
        setFeedbackVisible(true);
        setTimeout(() => setFeedbackVisible(false), 1100);
      }
    },
    [placed, missedOnce, total],
  );

  const progressPct = finished ? 100 : total > 0 ? Math.round((placedCount / total) * 100) : 0;

  if (loadError) {
    return (
      <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]">
        <p className="text-lg font-extrabold text-[#1E2A4A]">
          Couldn&apos;t load this activity. Please try again.
        </p>
      </div>
    );
  }

  if (!rounds) {
    return (
      <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]">
        <p className="text-lg font-extrabold text-[#1E2A4A]">Loading…</p>
      </div>
    );
  }

  const badgeTier = getBadgeTier(score, total);

  return (
    <div className="relative box-border flex h-screen h-dvh w-full items-center justify-center overflow-hidden p-[clamp(8px,2vh,20px)] font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]">
      {learnerName && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full border-[2.5px] border-[#1E2A4A] bg-white py-1 pl-2 pr-3 text-xs font-extrabold text-[#1E2A4A] sm:left-3.5 sm:top-2.5 sm:gap-3 sm:border-[3px] sm:py-2.5 sm:pl-4 sm:pr-6 sm:text-2xl">
          <span className="text-[15px] leading-none sm:text-[32px]" aria-hidden>
            🙋
          </span>
          <span className="max-w-[6rem] overflow-hidden text-ellipsis whitespace-nowrap sm:max-w-[14rem]">
            {learnerName}
          </span>
        </div>
      )}

      {!finished && (
        <>
          <div className="absolute left-1/2 top-2 z-10 hidden max-w-[45%] -translate-x-1/2 truncate text-center text-[clamp(24px,4vh,40px)] font-extrabold tracking-[0.5px] text-[#1E2A4A] sm:top-2.5 sm:block">
            {activityName || "Self-Portrait"}
          </div>
          <div className="absolute right-2 top-2 z-10 rounded-full border-2 border-[#F0B429] bg-[#FCE4A8] px-2.5 py-1 text-xs font-extrabold text-[#1E2A4A] sm:right-3.5 sm:top-2.5 sm:border-[3px] sm:px-5 sm:py-2 sm:text-2xl">
            Score: {score}
          </div>
        </>
      )}

      {finished ? (
        <div className="flex w-full max-w-[600px] flex-col items-center justify-center gap-[clamp(4px,1vh,10px)] px-4 text-center sm:px-6">
          <h1 className="m-0 max-w-[90%] text-[clamp(18px,3.4vh,30px)] tracking-[0.5px] text-[#1E2A4A]">
            {(activityName || "SELF-PORTRAIT").toUpperCase()} COMPLETE!
          </h1>
          <p className="m-0 text-[clamp(16px,2.8vh,24px)] font-extrabold text-[#E8734A]">
            Score: {score} / {total}
          </p>
          <div className="my-[clamp(2px,0.8vh,8px)]">
            <BadgeSvg />
          </div>
          <div className="text-[clamp(13px,2vh,17px)] font-extrabold tracking-[1px] text-[#1E2A4A]">
            {badgeTier.label}
          </div>
          <div className="text-[clamp(10px,1.5vh,13px)] font-semibold text-[#4b5876]">
            {badgeTier.sub}
          </div>
          <button
            type="button"
            onClick={() => handleFinish(answersRef.current)}
            className="mt-[clamp(6px,1.2vh,14px)] rounded-full border-[2.5px] border-[#1E2A4A] bg-[#F0B429] px-[clamp(20px,4vw,36px)] py-[clamp(8px,1.4vh,14px)] text-[clamp(13px,2vh,18px)] font-extrabold text-[#1E2A4A] shadow-[0_5px_0_rgba(30,42,74,0.25)] transition-transform duration-[120ms] ease-in-out active:translate-y-[2px] active:shadow-[0_2px_0_rgba(30,42,74,0.25)]"
          >
            Finish
          </button>
        </div>
      ) : (
        <div className="flex h-full w-full max-w-[900px] flex-col px-4 sm:px-6">
          <div className="mt-6 flex-none truncate text-center text-base font-extrabold tracking-[0.5px] text-[#1E2A4A] sm:hidden">
            {activityName || "Self-Portrait"}
          </div>

          <div className="my-[clamp(2px,0.6vh,8px)] flex-none text-center text-[clamp(16px,3.2vh,30px)] font-extrabold tracking-[0.5px] text-[#1E2A4A]">
            Drag each part onto your face!
          </div>

          <div className="mx-auto mb-[clamp(6px,1vh,12px)] h-[clamp(10px,1.6vh,16px)] w-[min(80%,620px)] flex-none overflow-hidden rounded-full border-2 border-[#d8d2c2] bg-[#F1EAD9]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#F0B429,#E8734A)] transition-[width] duration-[400ms] ease-in-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <FaceBoard
            rounds={rounds}
            placed={placed}
            activeSlot={activeSlot}
            onDragStart={() => {}}
            onActiveSlotChange={setActiveSlot}
            onDrop={handleDrop}
          />

          <div className="mt-[clamp(6px,1.2vh,14px)] flex min-h-[clamp(26px,4.5vh,36px)] flex-none items-center justify-center">
            <div
              className={`rounded-full border-2 px-[22px] py-1.5 text-[clamp(13px,2.1vh,20px)] font-extrabold transition-[opacity,transform] duration-[180ms] ease-in-out ${
                feedbackVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
              }`}
              style={{
                borderColor: wasCorrect ? GREEN : RED,
                backgroundColor: wasCorrect ? "#DFF5E8" : "#FDE7E4",
                color: wasCorrect ? GREEN : RED,
              }}
            >
              {wasCorrect ? "Correct! Great drawing! 🎉" : "Not quite — try another spot!"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
