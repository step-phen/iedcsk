"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
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

  // Past 8 names the cards shrink so a full class (about 15) fits on one tablet screen without scrolling.
  const compact = learners.length > 8;

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

      <div className="relative z-10 flex h-full flex-col items-center gap-[clamp(0.75rem,1.5vw,1.5rem)] px-4 pt-[clamp(1.25rem,4dvh,3rem)] pb-4">
        <div className="text-center">
          <h1 className="text-[length:clamp(2rem,4vw,4rem)] leading-tight font-extrabold font-chewy">
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
          <p className="subtitle-fade text-gray-700 text-[length:clamp(0.95rem,1.4vw,1.35rem)] mt-2">
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
          // Scrolls inside the stage only if a very large class outgrows it, so no card is ever clipped away.
          <div className="min-h-0 w-full max-w-7xl flex-1 overflow-y-auto scrollbar-hide p-3">
            <div className={cn("flex flex-wrap justify-center", compact ? "gap-[clamp(0.75rem,1vw,1rem)]" : "gap-[clamp(1rem,1.75vw,1.75rem)]")}>
              {learners.map((learner) => (
                <button
                  key={learner.id}
                  onClick={() => handleSelectLearner(learner)}
                  className={cn(
                    compact ? "w-[clamp(7rem,11vw,11rem)] rounded-2xl" : "w-[clamp(11rem,18vw,18rem)] rounded-3xl",
                    "relative overflow-hidden cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[#f2c94c] focus-visible:ring-offset-2",
                  )}
                >
                  <div
                    className={cn(
                      "bg-white border-4 border-[#f2c94c] shadow-2xl w-full h-full flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200",
                      compact ? "gap-1.5 px-2 py-3" : "gap-3 px-4 py-5",
                    )}
                  >
                    <LearnerAvatar
                      photoUrl={learner.photoUrl}
                      firstName={learner.firstName}
                      className={cn(
                        "bg-yellow-100 text-[#a35b00]",
                        compact
                          ? "size-[clamp(3rem,4.5vw,4.5rem)] text-[length:clamp(1.5rem,2.2vw,2.2rem)]"
                          : "size-[clamp(4rem,6vw,6rem)] text-[length:clamp(2rem,3vw,3rem)]",
                      )}
                    />
                    <span
                      className={cn(
                        "font-extrabold font-baloo2 text-gray-900 text-center capitalize leading-normal tracking-tight px-1 max-w-full",
                        // Small cards wrap a long name onto two lines instead of cutting it short.
                        compact
                          ? "text-[length:clamp(0.85rem,1.15vw,1.15rem)] line-clamp-2 break-words"
                          : "text-[length:clamp(1.1rem,1.6vw,1.6rem)] whitespace-nowrap overflow-hidden text-ellipsis",
                      )}
                    >
                      {learner.firstName}
                    </span>
                  </div>
                </button>
              ))}
            </div>
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
