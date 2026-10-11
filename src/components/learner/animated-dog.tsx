"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { preloadImages } from "@/hooks/useImagePreload";

const FRAMES = [
  "/images/background-images/dog-assets/dog0.webp",
  "/images/background-images/dog-assets/dog1.webp",
  "/images/background-images/dog-assets/dog2.webp",
  "/images/background-images/dog-assets/dog3.webp",
  "/images/background-images/dog-assets/dog4.webp",
];

export function AnimatedDog() {
  const [frame, setFrame] = useState(0);

  // All 5 frames are tiny sprite cells cycling every 150ms — warm every frame
  // once up front instead of asking Next to emit a fresh <link rel="preload">
  // for whichever frame happens to be current.
  useEffect(() => {
    preloadImages(FRAMES);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
    }, 150);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="absolute bottom-2 left-0 w-32 h-32 sm:w-44 sm:h-44 md:w-56 md:h-56 pointer-events-none z-0 animate-dog-walk"
      aria-hidden="true"
    >
      <Image
        src={FRAMES[frame]}
        alt=""
        width={256}
        height={256}
        className="w-full h-full object-contain"
        priority
      />
      <style jsx>{`
        /* Walks edge to edge but never past them, so the whole dog stays on screen; 100% is the dog's own width. */
        @keyframes dogWalk {
          0% { transform: translateX(0) scaleX(1); }
          49% { transform: translateX(calc(100vw - 100%)) scaleX(1); }
          50% { transform: translateX(calc(100vw - 100%)) scaleX(-1); }
          99% { transform: translateX(0) scaleX(-1); }
          100% { transform: translateX(0) scaleX(1); }
        }
        .animate-dog-walk {
          animation: dogWalk 18s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-dog-walk {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
