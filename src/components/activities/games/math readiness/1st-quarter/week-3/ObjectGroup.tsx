"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import { objectAsset } from "../week-1/NumberRecognition.data";

/** A group of up to ten of one object in rows of five, like a ten frame, so it is easy to count; the one being counted aloud pulses. Sized off its container (container-type: size). */
export default function ObjectGroup({
  object,
  count,
  counting,
  className,
  size = "min(17cqw, 40cqh)",
}: {
  object: string;
  count: number;
  counting?: number | null;
  className?: string;
  // Each picture's side; the default fits five across and two rows down, whatever shape the container is.
  size?: string;
}) {
  return (
    <span className={`${className ?? ""} flex flex-wrap content-center items-center justify-center`} style={{ gap: "2cqw", width: "100%", height: "100%" }}>
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="relative block shrink-0"
          style={{ width: size, height: size, flexBasis: size }}
          animate={counting === i ? { scale: 1.3, filter: "drop-shadow(0 0 8px #ffd23f)" } : { scale: 1, filter: "drop-shadow(0 0 0px rgba(0,0,0,0))" }}
          transition={{ duration: 0.25 }}
        >
          <Image src={objectAsset(object)} alt="" fill sizes="80px" className="object-contain" draggable={false} />
        </motion.span>
      ))}
    </span>
  );
}
