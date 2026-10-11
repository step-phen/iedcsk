"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";

/* ------------------------------------------------------------------ */
/*  COLOR THE PICTURE — Kindergarten coloring activity                 */
/*  Drag-to-color only. No tap/click fill. Wrong color = locked wrong. */
/* ------------------------------------------------------------------ */

const COLORS = {
  red: { name: "RED", light: "#FF8A6B", dark: "#E63946" },
  blue: { name: "BLUE", light: "#8CACF5", dark: "#3E5FC4" },
  yellow: { name: "YELLOW", light: "#FFE29A", dark: "#F5B942" },
  green: { name: "GREEN", light: "#8FDD9A", dark: "#43A047" },
  orange: { name: "ORANGE", light: "#FFC08A", dark: "#F2994A" },
  purple: { name: "PURPLE", light: "#C6A8FF", dark: "#8E6FE0" },
  brown: { name: "BROWN", light: "#D8B48A", dark: "#8B5A2B" },
} as const;
type ColorKey = keyof typeof COLORS;
const INK = "#16215C";
const BLANK = "#FFFFFF";

/* ------------------------------------------------------------------ */
/*  One simple line-art picture (a house) with five parts to color.   */
/*  Each region: id, target color key, hint dot anchor, shape render.  */
/*  The shapes are code-owned art, not curriculum data — only which    */
/*  color is correct for each region is mirrored in the DB             */
/*  (activity_questions) so scoring is graded server-side like every   */
/*  other activity in this app.                                        */
/* ------------------------------------------------------------------ */

interface Region {
  id: string;
  target: ColorKey;
  hint: { x: number; y: number };
  render: (fill: string) => React.ReactNode;
}

interface PictureRound {
  slug: string;
  title: string;
  viewBox: string;
  regions: Region[];
  decoration?: React.ReactNode;
}

const ROUNDS: PictureRound[] = [
  {
    slug: "house",
    title: "House",
    viewBox: "0 0 320 260",
    regions: [
      { id: "roof", target: "red", hint: { x: 160, y: 90 }, render: (fill) => <polygon points="60,120 160,45 260,120" fill={fill} stroke={INK} strokeWidth="5" strokeLinejoin="round" /> },
      { id: "walls", target: "yellow", hint: { x: 235, y: 150 }, render: (fill) => <rect x="70" y="120" width="180" height="100" fill={fill} stroke={INK} strokeWidth="5" /> },
      { id: "door", target: "brown", hint: { x: 167, y: 200 }, render: (fill) => <rect x="150" y="160" width="35" height="60" rx="4" fill={fill} stroke={INK} strokeWidth="5" /> },
      { id: "window", target: "blue", hint: { x: 112, y: 157 }, render: (fill) => <rect x="95" y="140" width="35" height="35" rx="3" fill={fill} stroke={INK} strokeWidth="5" /> },
      { id: "grass", target: "green", hint: { x: 45, y: 233 }, render: (fill) => <rect x="30" y="220" width="260" height="26" rx="12" fill={fill} stroke={INK} strokeWidth="5" /> },
    ],
  },
];
const TOTAL_ROUNDS = ROUNDS.length;

// The part to color next, named with its color, e.g. "color the roof red".
const stepText = (region: Region) => `color the ${region.id} ${COLORS[region.target].name.toLowerCase()}`;

// One spoken step of the guided coloring: "First, color the roof red." ... "Last, color the grass green."
function stepSpeech(index: number, total: number, region: Region): string {
  const lead = index === 0 ? "First" : index === total - 1 ? "Last" : index % 2 ? "Next" : "Then";
  return `${lead}, ${stepText(region)}.`;
}

// What is said on the result screen; a miss is encouraged, never scolded.
function resultSpeech(score: number, total: number): string {
  const head = score === total ? "Wow, perfect coloring!" : score >= Math.ceil(total * 0.6) ? "Great job!" : "Good try! Let's practice more.";
  return `${head} You got ${score} out of ${total}.`;
}

// The line that opens a round: what the picture is, then its first step.
const introSpeech = (r: PictureRound) => `Let's color the ${r.title}! ${stepSpeech(0, r.regions.length, r.regions[0])}`;

/** Question data as stored in `activity_questions.question_data`. Used only
 *  as a "this activity is set up" gate — the shapes/targets themselves are
 *  code-owned art above, kept in lockstep with the DB seed by region id. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type RegionResult = "correct" | "wrong";

const BG_STYLE = {
  position: "fixed" as const,
  inset: 0,
  boxSizing: "border-box" as const,
  display: "flex",
  flexDirection: "column" as const,
  background: "radial-gradient(circle at 15% 10%, #FFF7E4 0%, #FDF8ED 45%, #F7F1E0 100%)",
  fontFamily: "'Baloo 2','Poppins','Trebuchet MS',system-ui,sans-serif",
  overflow: "hidden",
  padding: "14px 30px",
};

export default function ColorThePicture({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Gate on the DB having an answer key for this activity — same contract
  // every other game in this app follows — before letting the child play.
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
        setReady(true);
      } catch (err) {
        console.error("Failed to load Color the Picture questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  // One point per paintable part; a part painted the wrong color is locked and scores nothing.
  const maxScore = ROUNDS.reduce((n, r) => n + r.regions.length, 0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [interacted, setInteracted] = useState<Set<string>>(() => new Set());
  const [regionColor, setRegionColor] = useState<Record<string, ColorKey>>({});
  const [regionResult, setRegionResult] = useState<Record<string, RegionResult>>({});
  const [regionProgress, setRegionProgress] = useState<Record<string, number>>({});
  const [paintingId, setPaintingId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<ColorKey | null>(null);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [phase, setPhase] = useState<"playing" | "roundComplete" | "finished">("playing");
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);

  const paintColorRef = useRef<ColorKey | null>(null);
  // Parts already scored this round, so a part that is finalized twice (a state updater can run twice) never counts twice.
  const finalizedRef = useRef<Set<string>>(new Set());

  const round = ROUNDS[roundIndex];
  const palette = useMemo(() => {
    const seen: ColorKey[] = [];
    round.regions.forEach((r) => {
      if (!seen.includes(r.target)) seen.push(r.target);
    });
    return seen;
  }, [round]);

  useEffect(() => {
    setInteracted(new Set());
    setRegionColor({});
    setRegionResult({});
    setRegionProgress({});
    finalizedRef.current.clear();
    setPaintingId(null);
    setSelectedColor(null); // nothing pre-picked — the learner must choose a color first
  }, [roundIndex]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
  }, []);

  useEffect(() => stop, [stop]);

  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!ready) return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll(
        [learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["color the picture"]],
        () => {
          introStateRef.current = "done";
          speak(introSpeech(round), undefined, { interrupt: false });
        },
      );
      return;
    }

    if (introStateRef.current === "speaking") return;
    speak(introSpeech(round), undefined, { interrupt: false });
    // Re-runs only when the round actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, round.slug]);

  // The part still to color, in the picture's order; it drives both the spoken step and the line on screen.
  const nextRegion = round.regions.find((r) => !interacted.has(r.id));

  // After each part is painted, the next step is read out.
  useEffect(() => {
    if (!ready || interacted.size === 0 || !nextRegion) return;
    speak(stepSpeech(interacted.size, round.regions.length, nextRegion), undefined, { interrupt: false });
    // Re-runs only when another part has been painted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interacted.size]);

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

  const advanceRound = useCallback(() => {
    setTimeout(() => {
      setRoundIndex((i) => {
        if (i < TOTAL_ROUNDS - 1) {
          setPhase("playing");
          return i + 1;
        }
        setPhase("finished");
        return i;
      });
    }, 1300);
  }, []);

  // The result screen reads the score out, and the answers are sent once that line has ended.
  useEffect(() => {
    if (phase !== "finished") return;
    speak(resultSpeech(score, maxScore), () => handleFinish(answers));
    // Runs once, when the picture is done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // A region is locked the instant it's painted. Wrong color = permanently
  // marked wrong for this round; the child cannot redo it and get credit.
  const finalizeRegion = useCallback(
    (regionId: string) => {
      const color = paintColorRef.current;
      if (!color) return;
      const region = round.regions.find((r) => r.id === regionId);
      if (!region) return;
      if (finalizedRef.current.has(regionId)) return;
      finalizedRef.current.add(regionId);
      const isCorrect = color === region.target;
      const questionId = `${round.slug}-${region.id}`;

      // Computed synchronously from the current `answers` state, not read
      // back out of a setState updater — a function passed to setAnswers
      // doesn't run until React's next render, so advanceRound(nextAnswers)
      // below would otherwise always see the empty array this closure
      // started with, and the very last region of the game would submit
      // zero answers to the server. Same pattern as BigAndSmall/ColorHunt/
      // CleanOrDirty, which read state directly for exactly this reason.
      const nextAnswers = [...answers, { questionId, response: color }];
      setAnswers(nextAnswers);

      if (isCorrect) setScore((s) => s + 1);
      else setWrongCount((w) => w + 1);

      setInteracted((prev) => {
        const next = new Set(prev);
        next.add(regionId);
        if (next.size === round.regions.length) {
          setPhase("roundComplete"); // Great Job! toast — a wrong pick never blocks this
          advanceRound();
        }
        return next;
      });
      setRegionColor((prev) => ({ ...prev, [regionId]: color }));
      setRegionResult((prev) => ({ ...prev, [regionId]: isCorrect ? "correct" : "wrong" }));
    },
    [round, advanceRound, answers],
  );

  const bumpProgress = useCallback(
    (regionId: string, amount: number) => {
      setRegionProgress((prev) => {
        const cur = prev[regionId] || 0;
        if (cur >= 1) return prev;
        const next = Math.min(1, cur + amount);
        if (next >= 1) setTimeout(() => finalizeRegion(regionId), 0);
        return { ...prev, [regionId]: next };
      });
    },
    [finalizeRegion],
  );

  const regionIdAt = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    const target = el && el.closest("[data-region-id]");
    return target ? target.getAttribute("data-region-id") : null;
  };

  const paintLastPos = useRef({ x: 0, y: 0 });
  const DRAG_START_THRESHOLD = 4; // px — must actually move to count as a drag, not a tap

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "playing" || !selectedColor) return;
    const regionId = regionIdAt(e.clientX, e.clientY);
    if (!regionId || interacted.has(regionId)) return;
    e.preventDefault();
    paintColorRef.current = selectedColor;
    paintLastPos.current = { x: e.clientX, y: e.clientY };
    setPaintingId(regionId);
    // no progress on down — nothing gets colored until the child actually drags
  };

  useEffect(() => {
    if (!paintingId) return;
    const onMove = (e: PointerEvent) => {
      const regionId = regionIdAt(e.clientX, e.clientY);
      const last = paintLastPos.current;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < DRAG_START_THRESHOLD) return; // ignore jitter from a stationary tap
      const cappedDist = Math.min(dist, 40); // cap a single jump
      paintLastPos.current = { x: e.clientX, y: e.clientY };
      if (regionId === paintingId) {
        bumpProgress(paintingId, cappedDist * 0.0035); // real back-and-forth scribbling fills it in
      }
    };
    const onUp = () => setPaintingId(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintingId]);

  const repeatInstruction = useCallback(() => {
    speak(nextRegion ? stepSpeech(interacted.size, round.regions.length, nextRegion) : introSpeech(round));
  }, [round, nextRegion, interacted.size, speak]);

  if (loadError) {
    return (
      <div style={BG_STYLE}>
        <p style={{ fontSize: "18px", fontWeight: 800, color: "#16215C" }}>
          Couldn&apos;t load this activity. Please try again.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={BG_STYLE}>
        <p style={{ fontSize: "18px", fontWeight: 800, color: "#16215C" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <GlobalStyle />

      <div style={styles.headerBar}>
        {learnerName && (
          <div style={styles.learnerBadge}>
            <span style={{ fontSize: "18px", lineHeight: 1 }} aria-hidden>
              🙋
            </span>
            <span style={styles.learnerName}>{learnerName}</span>
          </div>
        )}
      </div>

      {phase !== "finished" && (
        <>
          {/* ---------- TOP ---------- */}
          <header style={styles.header}>
            <h1 style={styles.title}>{activityName || "COLOR THE PICTURE"}</h1>
            <div style={styles.instructionRow}>
              <div style={styles.instruction}>{nextRegion ? `Pick a color, then ${stepText(nextRegion)}!` : "Pick a color, then drag on the picture to color it!"}</div>
              <button
                type="button"
                onClick={repeatInstruction}
                aria-label="Hear the instruction again"
                style={styles.speakerButton}
              >
                <Volume2 size={14} strokeWidth={2.6} color="#16215C" />
              </button>
            </div>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${(interacted.size / round.regions.length) * 100}%`,
                }}
              />
            </div>
          </header>

          {/* ---------- CENTER: picture ---------- */}
          <main style={styles.canvasWrap}>
            <svg
              viewBox={round.viewBox}
              style={{ ...styles.canvas, cursor: "crosshair", touchAction: "none" }}
              onPointerDown={handlePointerDown}
            >
              {round.regions.map((region) => {
                const progress = regionProgress[region.id] || 0;
                const paintedColor = regionColor[region.id]
                  ? COLORS[regionColor[region.id]].dark
                  : selectedColor
                  ? COLORS[selectedColor].dark
                  : "#CCCCCC";
                const isActive = paintingId === region.id;
                return (
                  <g key={region.id} data-region-id={region.id} className={isActive ? "painting-active" : ""}>
                    {/* base unpainted shape */}
                    {region.render(BLANK)}
                    {/* progressive color reveal on top */}
                    {progress > 0 && (
                      <g style={{ opacity: progress, pointerEvents: "none" }}>{region.render(paintedColor)}</g>
                    )}
                  </g>
                );
              })}
              {round.decoration}

              {round.regions.map((region) => {
                if (interacted.has(region.id)) return null;
                const c = COLORS[region.target];
                return (
                  <circle
                    key={`hint-${region.id}`}
                    cx={region.hint.x}
                    cy={region.hint.y}
                    r="5"
                    fill={c.dark}
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}
              {round.regions.map((region) => {
                const result = regionResult[region.id];
                if (!result) return null;
                // Badge sits offset to the side, never on top of the fill,
                // so the real paint color is always what the child sees.
                const bx = region.hint.x + 24;
                const by = region.hint.y - 24;
                return (
                  <g key={`badge-${region.id}`} transform={`translate(${bx - 11}, ${by - 11})`} style={{ pointerEvents: "none" }}>
                    <circle cx="11" cy="11" r="11" fill="#ffffff" stroke={result === "correct" ? "#4CAF63" : "#E85D3E"} strokeWidth="3" />
                    {result === "correct" ? (
                      <polyline points="5.5,11.5 9,15 16.5,6.5" fill="none" stroke="#4CAF63" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <g stroke="#E85D3E" strokeWidth="2.8" strokeLinecap="round">
                        <line x1="6.5" y1="6.5" x2="15.5" y2="15.5" />
                        <line x1="15.5" y1="6.5" x2="6.5" y2="15.5" />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {phase === "roundComplete" && (
              <div style={styles.toast} className="toast-pop">
                Great Job! 🎉
              </div>
            )}
          </main>

          {/* ---------- BOTTOM: palette + score ---------- */}
          <footer style={styles.footer}>
            <div style={styles.paletteRow}>
              {palette.map((key) => {
                const c = COLORS[key];
                const active = selectedColor === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedColor(key)}
                    style={{
                      ...styles.swatch,
                      background: `linear-gradient(135deg, ${c.light}, ${c.dark})`,
                      ...(active ? styles.swatchActive : {}),
                    }}
                    aria-label={c.name}
                  />
                );
              })}
            </div>

            <div style={styles.scorePill}>Score: {score} / {maxScore}</div>
          </footer>
        </>
      )}

      {phase === "finished" && (
        <div style={styles.completeWrap} className="status-pop">
          <Confetti />
          <h1 style={styles.finishedTitle}>COLORING COMPLETE!</h1>
          <div style={styles.finishedScore}>Score: {score} / {maxScore}</div>
          <div style={styles.badgeRecapRow}>
            {Array.from({ length: score }).map((_, i) => (
              <span key={`c${i}`} style={{ ...styles.recapBadge, borderColor: "#4CAF63" }}>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <polyline points="3,8.5 6.5,12 13,4" fill="none" stroke="#4CAF63" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ))}
            {Array.from({ length: wrongCount }).map((_, i) => (
              <span key={`w${i}`} style={{ ...styles.recapBadge, borderColor: "#E85D3E" }}>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <g stroke="#E85D3E" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </g>
                </svg>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Confetti() {
  const pieces = [
    { left: "20%", color: "#F5B942", delay: "0s" },
    { left: "35%", color: "#4CAF63", delay: "0.15s" },
    { left: "50%", color: "#3E5FC4", delay: "0.05s" },
    { left: "65%", color: "#E63946", delay: "0.2s" },
    { left: "80%", color: "#8E6FE0", delay: "0.1s" },
  ];
  return (
    <div style={{ position: "relative", width: "100%", height: "40px" }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: p.left, background: p.color, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = {
  screen: BG_STYLE,
  headerBar: {
    position: "absolute" as const,
    top: "14px",
    left: "22px",
    right: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 5,
  },
  learnerBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#ffffff",
    border: "3px solid #16215C",
    borderRadius: "999px",
    padding: "5px 16px 5px 10px",
    fontWeight: 800,
    color: "#16215C",
  },
  learnerName: { fontSize: "14px", maxWidth: "9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  header: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "2px", flexShrink: 0, marginTop: "38px" },
  title: { fontSize: "clamp(20px, 2.6vw, 26px)", fontWeight: 900, color: "#16215C", margin: "1px 0 0 0", letterSpacing: "1px" },
  instructionRow: { display: "flex", alignItems: "center", gap: "6px" },
  instruction: { fontSize: "14px", fontWeight: 700, color: "#5B7FDB" },
  speakerButton: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: "#ffffff",
    border: "2px solid #16215C",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  progressTrack: {
    width: "260px",
    height: "12px",
    background: "#EDE4CC",
    borderRadius: "999px",
    border: `2px solid ${INK}`,
    overflow: "hidden",
    marginTop: "4px",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #F5B942, #EB6A45)",
    borderRadius: "999px",
    transition: "width 0.4s ease",
  },

  canvasWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
    position: "relative" as const,
  },
  canvas: {
    width: "100%",
    height: "100%",
    maxHeight: "560px",
    maxWidth: "760px",
  },

  toast: {
    position: "absolute" as const,
    top: "10px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#16215C",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: "20px",
    padding: "12px 28px",
    borderRadius: "999px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
  },

  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "22px",
    flexShrink: 0,
    minHeight: "72px",
  },

  paletteRow: { display: "flex", gap: "8px" },
  swatch: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: `2.5px solid ${INK}`,
    cursor: "pointer",
  },
  swatchActive: {
    outline: `2.5px solid ${INK}`,
    outlineOffset: "2px",
    transform: "scale(1.08)",
  },

  scorePill: {
    background: "#ffffff",
    border: `2.5px solid ${INK}`,
    borderRadius: "999px",
    padding: "10px 22px",
    fontWeight: 800,
    color: "#16215C",
    fontSize: "14px",
  },

  completeWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    textAlign: "center" as const,
    width: "100%",
    overflowY: "auto" as const,
    padding: "10px 20px 20px",
    boxSizing: "border-box" as const,
  },
  finishedTitle: { fontSize: "clamp(24px, 3.6vw, 38px)", fontWeight: 900, color: "#16215C", margin: 0 },
  finishedScore: { fontSize: "22px", fontWeight: 800, color: "#3E5FC4" },
  badgeRecapRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "center",
    gap: "6px",
    maxWidth: "320px",
  },
  recapBadge: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    border: "2px solid",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

function GlobalStyle() {
  return (
    <style>{`
      @keyframes paintPulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.08); } }
      .painting-active { animation: paintPulse 0.5s ease-in-out infinite; }

      @keyframes statusPop { 0% { transform: scale(0.6); opacity: 0; } 65% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      .status-pop { animation: statusPop 0.35s ease-out; }

      @keyframes toastPop { 0% { transform: translateX(-50%) scale(0.5); opacity: 0; } 60% { transform: translateX(-50%) scale(1.08); opacity: 1; } 100% { transform: translateX(-50%) scale(1); opacity: 1; } }
      .toast-pop { animation: toastPop 0.3s ease-out; }

      @keyframes confettiFall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(40px) rotate(220deg); opacity: 0; } }
      .confetti-piece { position: absolute; top: 0; width: 10px; height: 14px; border-radius: 3px; animation: confettiFall 1s ease-in infinite; }
    `}</style>
  );
}
