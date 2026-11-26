import { useEffect, useState } from "react";
import { GAME_URL } from "../config";
import { DINO_SPRITE, Sprite } from "./ui";

const LINKS = [
  { href: "#about", label: "درباره من" },
  { href: "#features", label: "ویژگی‌ها" },
  { href: "#demo", label: "دمو زنده" },
  { href: "#how", label: "کنترل‌ها" },
];

export default function Navbar({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 16);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? "border-b-4 border-ink bg-paper/90 backdrop-blur-md"
          : "border-b-4 border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-3 text-ink no-underline">
          <Sprite rows={DINO_SPRITE} size={30} />
          <span className="font-pixel text-[11px] tracking-wider" dir="ltr">
            HOSSEIN<span className="text-accent">.</span>M
          </span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm font-bold text-soft no-underline transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            aria-label={dark ? "حالت روز" : "حالت شب"}
            title={dark ? "حالت روز" : "حالت شب"}
            className="flex h-10 w-10 cursor-pointer items-center justify-center border-[3px] border-ink bg-card text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          >
            {dark ? (
              <svg width="18" height="18" viewBox="0 0 8 8" fill="currentColor" shapeRendering="crispEdges">
                <rect x="3" y="0" width="2" height="1" />
                <rect x="3" y="7" width="2" height="1" />
                <rect x="0" y="3" width="1" height="2" />
                <rect x="7" y="3" width="1" height="2" />
                <rect x="2" y="2" width="4" height="4" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 8 8" fill="currentColor" shapeRendering="crispEdges">
                <rect x="2" y="0" width="3" height="1" />
                <rect x="1" y="1" width="2" height="1" />
                <rect x="0" y="2" width="2" height="4" />
                <rect x="1" y="6" width="2" height="1" />
                <rect x="2" y="7" width="4" height="1" />
                <rect x="5" y="6" width="2" height="1" />
                <rect x="6" y="4" width="2" height="2" />
                <rect x="4" y="5" width="2" height="1" />
                <rect x="3" y="3" width="2" height="2" />
              </svg>
            )}
          </button>
          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden border-[3px] border-ink bg-ink px-4 py-2 text-sm font-extrabold text-on-ink no-underline transition-transform hover:-translate-y-0.5 sm:inline-block"
          >
            ▶ بازی کن
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="منو"
            className="flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-1.5 border-[3px] border-ink bg-card md:hidden"
          >
            <span className={`h-[3px] w-5 bg-ink transition-transform ${open ? "translate-y-[9px] rotate-45" : ""}`} />
            <span className={`h-[3px] w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`h-[3px] w-5 bg-ink transition-transform ${open ? "-translate-y-[9px] -rotate-45" : ""}`} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t-4 border-ink bg-paper md:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-3">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base font-bold text-ink no-underline"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="py-3">
              <a
                href={GAME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="pixel-btn w-full"
              >
                ▶ برو به بازی
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
