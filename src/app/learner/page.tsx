"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { AnimatedDog } from "@/components/learner/animated-dog";
import { LearnerAvatar } from "@/components/learner/learner-avatar";

interface Learner {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  photoUrl: string | null;
}

// A tile is a square photo with the name under it: its height is 1.25x its width, and the gap between tiles 0.12x.
const TILE_ASPECT = 1.25;
const TILE_GAP = 0.12;

/** The column count that gives the biggest tiles for n learners in a width x height stage, so a full class (15) fits without scrolling. */
function bestFit(n: number, width: number, height: number): { cols: number; tile: number } {
  let best = { cols: 1, tile: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const tile = Math.min(width / (cols + TILE_GAP * (cols - 1)), height / (rows * TILE_ASPECT + TILE_GAP * (rows - 1)));
    if (tile > best.tile) best = { cols, tile };
  }
  // Never so small a child can't tap it (the stage scrolls then), never huge for a class of two.
  return { cols: best.cols, tile: Math.floor(Math.min(Math.max(best.tile, 64), 288)) };
}

export default function LearnerPage() {
  const router = useRouter();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function fetchLearners() {
      // This polls every 3s, so a failure here is routine (dev server
      // restarting, laptop asleep, wifi blip). Each failure mode is logged
      // distinctly — a bare "TypeError: Failed to fetch" doesn't say whether
      // the server is down, erroring, or returning something unparseable.
      let res: Response;
      try {
        res = await apiFetch("/api/classroom-session/learners");
      } catch (err) {
        console.error(
          "[learner] network error reaching /api/classroom-session/learners — server unreachable or request blocked:",
          err
        );
        if (isMounted) {
          setLoading(false);
          timeoutId = setTimeout(fetchLearners, 3000);
        }
        return;
      }

      try {
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`server responded ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
        }
        const data = await res.json();
        if (isMounted && data.learners) {
          setLearners(data.learners);
        }
      } catch (err) {
        console.error("[learner] failed to read learner list:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          timeoutId = setTimeout(fetchLearners, 3000);
        }
      }
    }

    fetchLearners();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // The stage's real size picks the grid, and rotating or resizing re-picks it.
  const stageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ cols: 1, tile: 0 });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFit(bestFit(learners.length, width, height));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [learners.length]);

  const handleSelectLearner = async (learner: Learner) => {
    sessionStorage.setItem("selectedLearner", JSON.stringify(learner));

    // Remembers this device's learner so the profile screen can wait for the class; /join still decides who plays.
    try {
      await apiFetch("/api/classroom-session/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId: learner.id }),
      });
    } catch (err) {
      console.error("Error claiming learner session:", err);
    }

    router.push(`/learner/profile/${learner.id}`);
  };

  if (loading) {
    return (
      <LearnerScreen>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full bg-[#f2c94c]/30" />
          <Skeleton className="w-48 h-5 rounded-full bg-[#f2c94c]/30" />
        </div>
      </LearnerScreen>
    );
  }

  return (
    <LearnerScreen>
      <AnimatedDog />

      {/* Phones held sideways are only ~340px tall, so the heading tightens and the tiles keep most of it. */}
      <div className="relative z-10 flex h-full flex-col items-center gap-[clamp(0.75rem,1.5vw,1.5rem)] px-4 pt-[clamp(1.25rem,4dvh,3rem)] pb-4 [@media(orientation:landscape)_and_(max-height:500px)]:gap-1 [@media(orientation:landscape)_and_(max-height:500px)]:pt-2 [@media(orientation:landscape)_and_(max-height:500px)]:pb-2">
        <div className="text-center">
          <h1 className="text-[length:clamp(2rem,4vw,4rem)] leading-tight font-extrabold font-chewy [@media(orientation:landscape)_and_(max-height:500px)]:text-[length:clamp(1.5rem,7vh,2rem)]">
            {"Choose Your Profile".split("").map((ch, i) => {
              const colors = ["text-red-500", "text-blue-500", "text-yellow-500"];
              const color = colors[i % colors.length];
              if (ch === " ") return <span key={i}>&nbsp;</span>;
              return (
                <span
                  key={i}
                  className={`title-letter inline-block ${color} drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {ch}
                </span>
              );
            })}
          </h1>
          <p className="subtitle-fade text-gray-700 text-[length:clamp(0.95rem,1.4vw,1.35rem)] mt-2 [@media(orientation:landscape)_and_(max-height:500px)]:mt-0">
            Tap your name to start the activity.
          </p>
          <style jsx>{`
            @keyframes titleBounceIn {
              0% { opacity: 0; transform: translateY(-24px) scale(0.5) rotate(-8deg); }
              55% { opacity: 1; transform: translateY(6px) scale(1.15) rotate(4deg); }
              75% { transform: translateY(-3px) scale(0.98) rotate(-2deg); }
              100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
            }
            @keyframes titleFloat {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
            @keyframes subtitleFadeIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .title-letter {
              animation: titleBounceIn 0.6s ease-out backwards,
                         titleFloat 2.4s ease-in-out infinite 0.8s;
            }
            .subtitle-fade {
              opacity: 0;
              animation: subtitleFadeIn 0.6s ease-out 0.9s forwards;
            }
            @media (prefers-reduced-motion: reduce) {
              .title-letter {
                animation: none;
                opacity: 1;
              }
              .subtitle-fade {
                animation: none;
                opacity: 1;
              }
            }
          `}</style>
        </div>

        {learners.length === 0 ? (
          <div className="text-center pt-12">
            <p className="text-gray-700 text-[length:clamp(1.5rem,2.5vw,2rem)] font-extrabold">No one is marked present yet.</p>
            <p className="text-gray-500 text-[length:clamp(0.95rem,1.4vw,1.35rem)] mt-2">Please wait for your teacher to take attendance.</p>
          </div>
        ) : (
          // Scrolls inside the stage only if a tiny screen hits the smallest tile, so no card is ever clipped away.
          <div ref={stageRef} className="min-h-0 w-full max-w-7xl flex-1 overflow-y-auto scrollbar-hide p-3">
            {/* Every size inside a tile follows --tile; not rendered until the stage is first measured, so nothing jumps
                and no photo mounts at 0px. Flex sized to exactly `cols` tiles, so a short last row sits centered. +1px absorbs subpixel rounding. */}
            {fit.tile > 0 && (
              <div
                className="mx-auto flex min-h-full flex-wrap content-center justify-center gap-[calc(var(--tile)*0.12)]"
                style={{ "--tile": `${fit.tile}px`, width: `calc(var(--tile) * ${fit.cols + 0.12 * (fit.cols - 1)} + 1px)` } as CSSProperties}
              >
                {learners.map((learner) => (
                  <button
                    key={learner.id}
                    onClick={() => handleSelectLearner(learner)}
                    className="relative w-(--tile) h-[calc(var(--tile)*1.25)] overflow-hidden rounded-2xl cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[#f2c94c] focus-visible:ring-offset-2"
                  >
                    <div className="bg-white border-[3px] border-[#f2c94c] shadow-xl w-full h-full flex flex-col items-center justify-center gap-[calc(var(--tile)*0.05)] p-[calc(var(--tile)*0.06)] rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200">
                      <LearnerAvatar
                        photoUrl={learner.photoUrl}
                        firstName={learner.firstName}
                        className="bg-yellow-100 text-[#a35b00] size-[calc(var(--tile)*0.66)] text-[length:calc(var(--tile)*0.3)]"
                      />
                      <span className="font-extrabold font-baloo2 text-gray-900 text-center capitalize leading-tight tracking-tight max-w-full truncate text-[length:max(12px,calc(var(--tile)*0.13))]">
                        {learner.firstName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </LearnerScreen>
  );
}

// Full-viewport classroom art stretched to the screen (never cropped or letterboxed), with the UI as an independent overlay above it.
function LearnerScreen({ children }: { children: ReactNode }) {
  return (
    <main className="relative w-screen h-dvh overflow-hidden">
      <Image
        src="/images/background-images/paper-bg.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
      />
      {children}
    </main>
  );
}
