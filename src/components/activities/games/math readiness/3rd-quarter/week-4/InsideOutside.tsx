// Containers, objects and scene spots shared by the inside/outside games; containers are drawn with CSS, objects are emoji.

export type Place = "inside" | "outside";

export function isPlace(value: unknown): value is Place {
  return value === "inside" || value === "outside";
}

export const CONTAINERS: Record<string, { name: string; round: boolean; style: React.CSSProperties }> = {
  box: { name: "box", round: false, style: { background: "#e9c08a", border: "7px solid #8b5a2b", borderRadius: "14px" } },
  basket: {
    name: "basket",
    round: false,
    style: { background: "repeating-linear-gradient(45deg, #f0c27b 0 12px, #dca25a 12px 24px)", border: "7px solid #92400e", borderRadius: "20px 20px 60px 60px" },
  },
  fence: { name: "fence", round: false, style: { background: "rgba(187, 247, 208, 0.6)", border: "8px dashed #92400e", borderRadius: "18px" } },
  bowl: { name: "fishbowl", round: true, style: { background: "rgba(147, 197, 253, 0.6)", border: "7px solid #2563eb", borderRadius: "50%" } },
  hoop: { name: "hoop", round: true, style: { background: "rgba(255, 255, 255, 0.3)", border: "9px solid #f43f5e", borderRadius: "50%" } },
};

export const PLACE_OBJECTS: Record<string, { name: string; emoji: string }> = {
  teddy: { name: "teddy bear", emoji: "🧸" },
  sheep: { name: "sheep", emoji: "🐑" },
  fish: { name: "fish", emoji: "🐟" },
  apple: { name: "apple", emoji: "🍎" },
  duck: { name: "duck", emoji: "🦆" },
  ball: { name: "ball", emoji: "⚽" },
};

export const isContainer = (value: unknown): value is keyof typeof CONTAINERS => typeof value === "string" && value in CONTAINERS;
export const isPlaceObject = (value: unknown): value is keyof typeof PLACE_OBJECTS => typeof value === "string" && value in PLACE_OBJECTS;

/** Where the container sits in its scene, in % of the scene box. */
export const CONTAINER_BOX = { left: 30, top: 14, width: 40, height: 74 };

/** Object spots in % of the scene: two well inside the container, two well clear of it. */
export const SPOTS: Record<Place, { x: number; y: number }[]> = {
  inside: [
    { x: 42, y: 40 },
    { x: 58, y: 66 },
  ],
  outside: [
    { x: 13, y: 36 },
    { x: 87, y: 68 },
  ],
};

/** "inside the box" / "outside the box" — the phrase every game speaks and shows. */
export const placePhrase = (place: Place, container: string) => `${place} the ${CONTAINERS[container].name}`;

export function ContainerShape({ kind }: { kind: string }) {
  const { left, top, width, height } = CONTAINER_BOX;
  return (
    <div
      aria-hidden
      className="absolute"
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, boxShadow: "0 6px 0 rgba(34, 49, 79, 0.2)", ...CONTAINERS[kind].style }}
    />
  );
}

/** Whether a screen point lands inside the container drawn in `scene` — an ellipse test for round containers. */
export function pointIsInside(kind: string, scene: DOMRect, x: number, y: number): boolean {
  const left = scene.left + (scene.width * CONTAINER_BOX.left) / 100;
  const top = scene.top + (scene.height * CONTAINER_BOX.top) / 100;
  const w = (scene.width * CONTAINER_BOX.width) / 100;
  const h = (scene.height * CONTAINER_BOX.height) / 100;
  if (!CONTAINERS[kind].round) return x >= left && x <= left + w && y >= top && y <= top + h;
  const dx = (x - (left + w / 2)) / (w / 2);
  const dy = (y - (top + h / 2)) / (h / 2);
  return dx * dx + dy * dy <= 1;
}
