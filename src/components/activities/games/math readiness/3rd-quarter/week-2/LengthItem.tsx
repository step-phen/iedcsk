// Draws a long thing exactly `length` blocks wide, so every kind compares fairly against every other and against the measuring stick.

export type LengthKind = "train" | "caterpillar" | "pencil" | "ribbon" | "stick";

export const LENGTH_KINDS: Record<Exclude<LengthKind, "stick">, { name: string }> = {
  train: { name: "train" },
  caterpillar: { name: "caterpillar" },
  pencil: { name: "pencil" },
  ribbon: { name: "ribbon" },
};

export function isLengthKind(value: unknown): value is Exclude<LengthKind, "stick"> {
  return typeof value === "string" && value in LENGTH_KINDS;
}

/** Block size shared by both length games; every item is exactly length × this wide. */
export const UNIT = "clamp(34px, 6.6vh, 56px)";

const blocks = (n: number, render: (i: number) => React.ReactNode) => Array.from({ length: n }, (_, i) => render(i));

export function LengthItem({ kind, length }: { kind: LengthKind; length: number }) {
  const width = `calc(${UNIT} * ${length})`;

  if (kind === "train" || kind === "caterpillar") {
    const [head, body] = kind === "train" ? ["🚂", "🚃"] : ["🐛", "🟢"];
    return (
      <div className="flex items-center" style={{ width, height: UNIT }}>
        {blocks(length, (i) => (
          <span key={i} aria-hidden className="flex items-center justify-center leading-none" style={{ width: UNIT, height: UNIT, fontSize: `calc(${UNIT} * 0.86)` }}>
            {i === 0 ? head : body}
          </span>
        ))}
      </div>
    );
  }

  if (kind === "pencil") {
    return (
      <div className="flex items-center" style={{ width, height: `calc(${UNIT} * 0.56)` }}>
        <div className="h-full rounded-l-md border-[3px] border-r-0 border-[#22314f] bg-[#f9a8d4]" style={{ width: `calc(${UNIT} * 0.45)` }} />
        <div
          className="h-full flex-1 border-y-[3px] border-[#22314f]"
          style={{ background: "repeating-linear-gradient(#fbbf24 0 30%, #f59e0b 30% 36%, #fbbf24 36% 64%, #f59e0b 64% 70%, #fbbf24 70% 100%)" }}
        />
        <div
          className="h-full"
          style={{ width: `calc(${UNIT} * 0.7)`, background: "#f5d0a9", clipPath: "polygon(0 0, 100% 50%, 0 100%)", borderLeft: "3px solid #22314f" }}
        />
      </div>
    );
  }

  if (kind === "stick") {
    return (
      <div
        className="relative rounded-md border-[3px] border-[#22314f]"
        style={{ width, height: `calc(${UNIT} * 0.62)`, background: "#c08552" }}
      >
        {blocks(length - 1, (i) => (
          <span key={i} aria-hidden className="absolute top-0 h-1/2 w-[3px] bg-[#22314f]" style={{ left: `calc(${UNIT} * ${i + 1} - 1.5px)` }} />
        ))}
      </div>
    );
  }

  return <div className="rounded-full border-[3px] border-[#22314f]" style={{ width, height: `calc(${UNIT} * 0.42)`, background: "#a855f7" }} />;
}
