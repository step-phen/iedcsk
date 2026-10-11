"use client";

import { DotLottieReact, setWasmUrl } from "@lottiefiles/dotlottie-react";

// Served from public/ because the system runs on a LAN with no CDN access.
setWasmUrl("/animations/dotlottie-player.wasm");

// A looping .lottie file from public/animations/; size comes from className and the animation is decorative.
export function LottieAnimation({ src, className = "size-40" }: { src: string; className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      <DotLottieReact src={encodeURI(src)} loop autoplay />
    </div>
  );
}
