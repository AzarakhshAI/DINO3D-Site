import { useEffect, useRef, useState } from "react";
import { AUTHOR_HI, GAME_URL } from "../config";
import { Game, type GameState } from "../game/OriginalGame";
import { Reveal } from "./ui";

const pad = (n: number) => String(Math.min(99999, Math.max(0, Math.floor(n)))).padStart(5, "0");

function loadHi() {
  try {
    return Number(localStorage.getItem("dino3d-hi")) || 0;
  } catch {
    return 0;
  }
}

export default function Demo({ dark }: { dark: boolean }) {
  void dark; // The original game controls its own day/night cycle.
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const visible = useRef(false);

  const [sound, setSound] = useState(true);
  const [state, setState] = useState<GameState>("ready");
  const [paused, setPaused] = useState(false);
  const scoreValue = useRef(0);
  const scoreDisplay = useRef<HTMLSpanElement>(null);
  const hiDisplay = useRef<HTMLSpanElement>(null);
  const [beatAuthor, setBeatAuthor] = useState(false);

  useEffect(() => {
    const el = section.current;
    const mount = host.current;
    if (!el || !mount) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
      },
      { threshold: 0.2 }
    );
    observer.observe(el);

    let instance: Game;
    try {
      instance = new Game(mount, {
        isActive: () => visible.current,
        onState: (next) => {
          setState(next);
          if (next === "over") setBeatAuthor(scoreValue.current > AUTHOR_HI);
          else setBeatAuthor(false);
          if (next !== "playing") setPaused(false);
        },
        onScore: (nextScore, nextHi, shown) => {
          scoreValue.current = nextScore;
          if (scoreDisplay.current) {
            scoreDisplay.current.textContent = pad(nextScore);
            scoreDisplay.current.style.visibility = shown ? "visible" : "hidden";
          }
          if (hiDisplay.current) hiDisplay.current.textContent = nextHi > 0 ? `HI ${pad(nextHi)}` : "";
        },
        onPause: setPaused,
        onMute: setSound,
      });
    } catch {
      mount.textContent = "مرورگر شما از WebGL پشتیبانی نمی‌کند. لطفاً مرورگر دیگری را امتحان کنید.";
      observer.disconnect();
      return;
    }

    game.current = instance;
    return () => {
      visible.current = false;
      observer.disconnect();
      instance.dispose();
      game.current = null;
    };
  }, []);

  const toggleSound = () => game.current?.setMuted(!sound);

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
            این نسخه، موتور اصلی بازی DINO 3D است. با <b className="text-ink">Space</b> یا لمس
            صفحه بپر و با <b className="text-ink">↓</b> خم شو. فکر می‌کنی
            بتونی رکورد من، <span className="font-pixel text-xs text-ink" dir="ltr">{pad(AUTHOR_HI)}</span>، رو بشکنی؟
          </p>
        </Reveal>

        <Reveal delay={150} className="mt-12">
          <div
            className="pixel-box scanlines relative mx-auto h-[min(62vh,540px)] min-h-[340px] w-full max-w-5xl select-none overflow-hidden"
            style={{ touchAction: "none" }}
          >
            <div ref={host} className="absolute inset-0 cursor-pointer" />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-5" dir="ltr">
              <button
                className="hud-btn pointer-events-auto"
                onClick={(e) => {
                  toggleSound();
                  e.currentTarget.blur();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                SOUND {sound ? "ON" : "OFF"}
              </button>
              <div className="font-pixel text-[10px] text-soft sm:text-base">
                <span ref={hiDisplay}>HI {pad(loadHi())}</span>
                <span ref={scoreDisplay} className="ml-3 text-ink sm:ml-6">00000</span>
              </div>
            </div>

            {state === "ready" && (
              <div className="pointer-events-none absolute inset-x-0 top-[22%] z-20 text-center">
                <div className="pop inline-block bg-paper/80 px-5 py-4 backdrop-blur-sm">
                  <div className="font-pixel text-xs text-ink sm:text-base" dir="ltr">PRESS SPACE / TAP</div>
                  <div className="blink mt-3 text-sm font-bold text-soft">برای شروع بزن</div>
                </div>
              </div>
            )}
            {paused && (
              <div className="pointer-events-none absolute inset-x-0 top-[22%] z-20 text-center">
                <div className="pop inline-block bg-paper/85 px-6 py-5 backdrop-blur-sm">
                  <div className="font-pixel text-sm text-ink sm:text-xl" dir="ltr">PAUSED</div>
                  <div className="mt-3 text-sm font-bold text-soft">برای ادامه P یا لمس صفحه را بزن</div>
                </div>
              </div>
            )}
            {state === "over" && (
              <div className="pointer-events-none absolute inset-x-0 top-[18%] z-20 text-center">
                <div className="pop inline-block bg-paper/85 px-6 py-5 backdrop-blur-sm">
                  <div className="font-pixel text-sm text-ink sm:text-xl" dir="ltr">G A M E&nbsp;&nbsp;O V E R</div>
                  {beatAuthor && (
                    <div className="mt-3 text-sm font-extrabold text-accent sm:text-base">🎉 رکورد حسین رو شکستی!</div>
                  )}
                  <div className="mt-3 text-sm font-bold text-soft">برای شروع دوباره بزن</div>
                </div>
              </div>
            )}

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
            <div className="pointer-events-none absolute bottom-4 right-4 z-20 hidden font-pixel text-[10px] text-soft sm:block" dir="ltr">
              TAP = JUMP
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden font-pixel text-[9px] text-soft sm:block" dir="ltr">
              P / ESC = PAUSE · M = MUTE
            </div>
          </div>
        </Reveal>

        <Reveal delay={250} className="mt-12 text-center">
          <p className="mb-6 text-soft">دمو باحال بود؟ نسخه‌ی کامل و بی‌پایانش منتظرته 👇</p>
          <a href={GAME_URL} target="_blank" rel="noopener noreferrer" className="pixel-btn text-lg">
            ▶ بازی کامل را شروع کن
          </a>
        </Reveal>
      </div>
    </section>
  );
}
