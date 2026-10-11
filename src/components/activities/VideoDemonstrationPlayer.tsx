"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeech, getLearnerFirstName } from "@/hooks/useSpeech";

// One sentence per clip, since useSpeech cuts a single clip off at 12 seconds.
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter(Boolean);

// Practical activity video: the learner watches and follows along; onWatched fires when it ends and the teacher rates them later.
export default function VideoDemonstrationPlayer({
  activityName,
  videoUrl,
  instructions,
  onWatched,
}: {
  activityName: string | null;
  videoUrl: string;
  /** Spoken first, then shown under the video. */
  instructions: string | null;
  onWatched: () => void;
}) {
  // A video that fails to load shows a Continue button instead of a dead player.
  const [errored, setErrored] = useState(false);

  // idle: not heard yet, speaking: instruction playing, done: video unlocked for good.
  const [phase, setPhase] = useState<"idle" | "speaking" | "done">("idle");

  // Same ElevenLabs voice as the games; onEnd always runs, so a failed clip never locks the video.
  const { speakAll, stop } = useSpeech();

  useEffect(() => stop, [stop]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Keeps the video paused until the instruction has been spoken, then plays it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (phase === "done") {
      // If autoplay is blocked, the visible controls let the child press play.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [phase]);

  const instruction = instructions?.trim() ?? "";

  const speakInstructions = () => {
    setPhase("speaking");
    const name = getLearnerFirstName();
    const [first, ...rest] = sentences(instruction);
    const greeting = name ? `Hello ${name}!` : "Hello!";
    speakAll([`${greeting} ${first ?? ""}`.trim(), ...rest], () =>
      setPhase("done"),
    );
  };

  return (
    <div className="min-h-dvh learner-bg flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-4xl flex flex-col items-center gap-5">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#eb6a45]">
            Video Demonstration
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[#16215c]">
            {activityName || "Follow Along!"}
          </h1>
        </div>

        {!errored ? (
          <div className="relative w-full">
            <video
              ref={videoRef}
              className="w-full rounded-2xl border-4 border-[#16215c] shadow-lg"
              src={videoUrl}
              playsInline
              controls={phase === "done"}
              controlsList="nodownload noremoteplayback noplaybackrate"
              disablePictureInPicture
              onEnded={onWatched}
              onError={() => setErrored(true)}
              onPlay={(e) => {
                // Keyboard space/enter can still start playback while the controls are off.
                if (phase !== "done") e.currentTarget.pause();
              }}
            />

            {phase !== "done" && (
              <div className="absolute inset-0 rounded-2xl bg-[#16215c]/85 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <span
                  className="text-5xl sm:text-6xl"
                  role="img"
                  aria-label="Speaker"
                >
                  🔊
                </span>
                {phase === "idle" ? (
                  <button
                    onClick={speakInstructions}
                    className="px-6 py-2 rounded-full text-sm font-black shadow-xl bg-yellow-400 hover:bg-yellow-500 hover:scale-105 active:scale-95 text-blue-900 cursor-pointer transition-all duration-200"
                  >
                    Listen to Instructions
                  </button>
                ) : (
                  <p className="animate-pulse text-base sm:text-lg font-black text-white">
                    Listen carefully...
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-4 border-[#16215c] shadow-lg p-8 w-full text-center flex flex-col items-center gap-4">
            <p className="text-base font-bold text-gray-700">
              The video couldn&apos;t be played. Please tell your teacher.
            </p>
            <button
              onClick={onWatched}
              className="px-6 py-2 rounded-full text-sm font-black shadow-xl bg-yellow-400 hover:bg-yellow-500 hover:scale-105 active:scale-95 text-blue-900 cursor-pointer transition-all duration-200"
            >
              CONTINUE
            </button>
          </div>
        )}

        {instruction && (
          <p className="text-center text-base sm:text-lg font-bold text-[#16215c] max-w-2xl">
            {instruction}
          </p>
        )}
      </div>
    </div>
  );
}
