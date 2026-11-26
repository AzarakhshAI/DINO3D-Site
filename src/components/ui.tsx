import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fade/slide in when scrolled into view */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Counts up to a padded number once visible */
export function CountUp({
  to,
  pad = 5,
  duration = 1600,
}: {
  to: number;
  pad?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / duration);
          setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return <span ref={ref}>{String(v).padStart(pad, "0")}</span>;
}

/** Renders a bitmap (array of strings, '#' = filled) as crisp SVG pixels */
export function Sprite({
  rows,
  size = 64,
  className = "",
}: {
  rows: string[];
  size?: number;
  className?: string;
}) {
  const h = rows.length;
  const w = rows[0].length;
  const rects: ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] === "#") {
        let e = x;
        while (e < row.length && row[e] === "#") e++;
        rects.push(
          <rect key={`${x}-${y}`} x={x} y={y} width={e - x} height={1} />
        );
        x = e;
      } else x++;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      fill="currentColor"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      {rects}
    </svg>
  );
}

export const DINO_SPRITE = [
  "........########",
  "........########",
  "........###.####",
  "........########",
  "........########",
  "........#####...",
  "#......#####....",
  "#.....######.#..",
  "##...#######.#..",
  "###.#########...",
  "#############...",
  ".###########....",
  "..##########....",
  "...#######......",
  "....##..##......",
  "....##..##......",
  "....#...#.......",
];

export const CACTUS_SPRITE = [
  "....##....",
  "....##....",
  "#...##.#..",
  "#...##.##.",
  "##..##.##.",
  "##..##.##.",
  "######.##.",
  "..######..",
  "....##....",
  "....##....",
  "....##....",
  "....##....",
];

export const ICONS = {
  cube: [
    "..####..",
    ".#....#.",
    "#.####.#",
    "#.#..#.#",
    "#.#..#.#",
    "#.####.#",
    ".#....#.",
    "..####..",
  ],
  bolt: [
    "....###.",
    "...###..",
    "..###...",
    ".######.",
    "...###..",
    "..###...",
    ".###....",
    ".##.....",
  ],
  trophy: [
    "########",
    "#.####.#",
    "#.####.#",
    ".######.",
    "..####..",
    "...##...",
    "...##...",
    "..####..",
  ],
  phone: [
    ".######.",
    ".#....#.",
    ".#....#.",
    ".#....#.",
    ".#....#.",
    ".#....#.",
    ".#.##.#.",
    ".######.",
  ],
  speaker: [
    "...#....",
    "..##..#.",
    "####...#",
    "####.#.#",
    "####.#.#",
    "####...#",
    "..##..#.",
    "...#....",
  ],
  heart: [
    ".##..##.",
    "########",
    "########",
    "########",
    ".######.",
    "..####..",
    "...##...",
    "........",
  ],
};
