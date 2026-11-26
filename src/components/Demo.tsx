import { useCallback, useEffect, useRef, useState } from "react";
import { AUTHOR_HI, GAME_URL } from "../config";
import type { GameState, SoundKind } from "../game/DinoWorld";
import { playSound } from "../game/sound";
import DinoCanvas, { type DinoHandle } from "./DinoCanvas";
import { Reveal } from "./ui";

const pad = (n: number) => String(n).padStart(5, "0");
const KEY = "dino3d-hi";

function loadHi() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export default function Demo({ dark }: { dark: boolean }) {
  void dark;
  const game = useRef<DinoHandle>(null);
  const section = useRef<HTMLElement>(null);
  const visible = useRef(false);
  const soundRef = useRef(true);
  const hiRef = useRef(loadHi());

  const [sound, setSound] = useState(true);
  const [state, setState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(hiRef.current);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const onSound = useCallback((k: SoundKind) => {
    if (soundRef.current) playSound(k);
    if (k === "milestone") setFlash((f) => f + 1);
  }, []);

  const onState = useCallback((s: GameState) => {
    setState(s);
  }, []);

  const onScore = useCallback((s: number) => {
    setScore(s);
    if (s > hiRef.current) {
      hiRef.current = s;
      setHi(s);
      try {
        localStorage.setItem(KEY, String(s));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // visibility + keyboard
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
      },
      { threshold: 0.45 }
    );
    io.observe(el);

    const isUi = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);

    const down = (e: KeyboardEvent) => {
      if (!visible.current || isUi(e.target)) return;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (!e.repeat) game.current?.jump();
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        game.current?.setDuck(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        game.current?.setDuck(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      io.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const beatAuthor = state === "over" && score > AUTHOR_HI;

  return (
    <section
      id="demo"
      ref={section}
      className="relative border-y-4 border-ink bg-card/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-pixel text-[10px] tracking-widest text-accent" dir="ltr">
            ▶ PLAY DEMO
          </p>
          <h2 className="mt-4 text-4xl font-black sm:text-5xl">
            همین‌جا بازی کن!
          </h2>
          <p className="mt-5 leading-8 text-soft">
            این دمو از منطق اصلی بازی DINO 3D استفاده می‌کند. با <b className="text-ink">Space</b> یا
            لمس صفحه بپر و با <b className="text-ink">↓</b> خم شو. فکر می‌کنی
            بتونی رکورد من، <span className="font-pixel text-xs text-ink" dir="ltr">{pad(AUTHOR_HI)}</span>، رو بشکنی؟
          </p>
        </Reveal>

        <Reveal delay={150} className="mt-12">
          <div
            className="pixel-box scanlines relative mx-auto h-[min(62vh,540px)] min-h-[340px] w-full max-w-5xl select-none overflow-hidden"
            style={{ touchAction: "manipulation" }}
          >
            <DinoCanvas
              ref={game}
              mode="play"
              dark={dark}
              className="absolute inset-0 cursor-pointer"
              onScore={onScore}
              onState={onState}
              onSound={onSound}
            />

            {/* tap layer */}
            <div
              className="absolute inset-0 z-10"
              onPointerDown={(e) => {
                e.preventDefault();
                game.current?.jump();
              }}
            />

            {/* HUD */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-5"
              dir="ltr"
            >
              <button
                className="hud-btn pointer-events-auto"
                onClick={(e) => {
                  setSound((s) => !s);
                  e.currentTarget.blur();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                SOUND {sound ? "ON" : "OFF"}
              </button>
              <div className="font-pixel text-[10px] text-soft sm:text-base">
                <span>HI {pad(hi)}</span>
                <span
                  key={flash}
                  className={`ml-3 text-ink sm:ml-6 ${flash ? "hud-flash" : ""}`}
                >
                  {pad(score)}
                </span>
              </div>
            </div>

            {/* overlays */}
            {state === "ready" && (
              <div className="pointer-events-none absolute inset-x-0 top-[22%] z-20 text-center">
                <div className="pop inline-block bg-paper/80 px-5 py-4 backdrop-blur-sm">
                  <div className="font-pixel text-xs text-ink sm:text-base" dir="ltr">
                    PRESS SPACE / TAP
                  </div>
                  <div className="blink mt-3 text-sm font-bold text-soft">
                    برای شروع بزن
                  </div>
                </div>
              </div>
            )}
            {state === "over" && (
              <div className="pointer-events-none absolute inset-x-0 top-[18%] z-20 text-center">
                <div className="pop inline-block bg-paper/85 px-6 py-5 backdrop-blur-sm">
                  <div className="font-pixel text-sm text-ink sm:text-xl" dir="ltr">
                    G A M E&nbsp;&nbsp;O V E R
                  </div>
                  {beatAuthor && (
                    <div className="mt-3 text-sm font-extrabold text-accent sm:text-base">
                      🎉 رکورد حسین رو شکستی!
                    </div>
                  )}
                  <div className="mt-3 text-sm font-bold text-soft">
                    دوباره بزن تا شروع بشه
                  </div>
                </div>
              </div>
            )}

            {/* DUCK button */}
            <button
              className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 touch-none border-[3px] border-soft bg-paper/60 px-6 py-3 font-pixel text-[10px] text-soft backdrop-blur-sm transition-colors hover:text-ink active:border-ink active:text-ink sm:text-xs"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                game.current?.setDuck(true);
              }}
              onPointerUp={() => game.current?.setDuck(false)}
              onPointerLeave={() => game.current?.setDuck(false)}
              onPointerCancel={() => game.current?.setDuck(false)}
              onContextMenu={(e) => e.preventDefault()}
              dir="ltr"
            >
              DUCK ↓
            </button>
            <div
              className="pointer-events-none absolute bottom-4 right-4 z-20 hidden font-pixel text-[10px] text-soft sm:block"
              dir="ltr"
            >
              TAP = JUMP
            </div>
          </div>
        </Reveal>

        <Reveal delay={250} className="mt-12 text-center">
          <p className="mb-6 text-soft">دمو باحال بود؟ نسخه‌ی کامل و بی‌پایانش منتظرته 👇</p>
          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-btn text-lg"
          >
            ▶ بازی کامل را شروع کن
          </a>
        </Reveal>
      </div>
    </section>
  );
}
