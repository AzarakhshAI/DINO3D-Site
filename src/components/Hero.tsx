import { useState } from "react";
import { AUTHOR_HI, GAME_URL } from "../config";
import DinoCanvas from "./DinoCanvas";
import { CountUp, Reveal } from "./ui";

const pad = (n: number) => String(n).padStart(5, "0");

function Stage({ dark }: { dark: boolean }) {
  const [score, setScore] = useState(0);
  return (
    <div className="pixel-box scanlines relative mx-auto h-[min(46vh,500px)] min-h-[290px] w-full max-w-6xl overflow-hidden">
      <DinoCanvas
        mode="auto"
        dark={dark}
        className="absolute inset-0"
        onScore={setScore}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 font-pixel text-[10px] text-soft sm:p-5 sm:text-sm"
        dir="ltr"
      >
        <span className="border-[3px] border-soft px-2.5 py-2 sm:px-3">
          AUTO&nbsp;DEMO
        </span>
        <span className="flex gap-3 sm:gap-5">
          <span>HI {pad(AUTHOR_HI)}</span>
          <span className="text-ink">{pad(score)}</span>
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
        <span className="bg-paper/70 px-3 py-1 text-xs font-bold text-soft backdrop-blur-sm">
          ✦ ماوس را حرکت بده تا دوربین دنبالت بیاید ✦
        </span>
      </div>
    </div>
  );
}

export default function Hero({ dark }: { dark: boolean }) {
  return (
    <section id="top" className="relative overflow-hidden pb-16 pt-28 sm:pt-32">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* drifting pixel clouds */}
      {[
        { top: "12%", d: "48s", w: 90, delay: "-8s" },
        { top: "26%", d: "70s", w: 60, delay: "-40s" },
        { top: "6%", d: "90s", w: 120, delay: "-60s" },
      ].map((c, i) => (
        <div
          key={i}
          className="drift pointer-events-none absolute left-0 opacity-70"
          style={{
            top: c.top,
            animationDuration: c.d,
            animationDelay: c.delay,
          }}
        >
          <div className="relative" style={{ width: c.w, height: c.w / 4 }}>
            <div className="absolute bottom-0 h-1/2 w-full bg-line" />
            <div className="absolute bottom-1/2 left-1/4 h-1/2 w-1/2 bg-line" />
          </div>
        </div>
      ))}

      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <Reveal>
          <span className="pixel-box-sm inline-flex items-center gap-2 px-4 py-2 text-xs font-bold sm:text-sm">
            <span className="blink inline-block h-2.5 w-2.5 bg-accent" />
            نسخه‌ی سه‌بعدی وکسلی · ساخته‌شده توسط حسین محمدی
          </span>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="mt-8 text-5xl font-black leading-[1.25] sm:text-7xl lg:text-8xl">
            بدو، بپر،
            <br />
            <span className="glitch" data-text="زنده بمون!">
              زنده بمون!
            </span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p
            className="mt-4 font-pixel text-[10px] tracking-[0.3em] text-soft sm:text-xs"
            dir="ltr"
          >
            VOXEL DINO 3D <span className="blink">_</span>
          </p>
        </Reveal>

        <Reveal delay={300}>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-9 text-soft sm:text-lg">
            سلام! من <b className="text-ink">حسین محمدی</b> هستم. این بازی
            دایناسور سه‌بعدی منه؛ همون دینوی کلاسیک و دوست‌داشتنی، این بار در
            یک دنیای وکسلی ۳بعدی. همین‌جا دمو رو بازی کن و بعد برو سراغ بازی
            اصلی!
          </p>
        </Reveal>

        <Reveal delay={400}>
          <div className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-6">
            <a
              href={GAME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-btn text-lg"
            >
              <span className="text-xl">▶</span> برو به بازی اصلی
            </a>
            <a href="#demo" className="pixel-btn ghost text-lg">
              دمو زنده ↓
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal delay={500} className="relative mt-14 px-4 sm:px-6">
        <Stage dark={dark} />
      </Reveal>

      <div className="relative mx-auto mt-14 grid max-w-6xl grid-cols-2 gap-5 px-4 sm:px-6 lg:grid-cols-4">
        {[
          { k: "رکورد حسین", v: <CountUp to={AUTHOR_HI} />, pix: true },
          { k: "گرافیک", v: "3D", pix: true },
          { k: "کنترل", v: "1 TAP", pix: true },
          { k: "مرحله‌ها", v: "∞", pix: true },
        ].map((s, i) => (
          <Reveal key={s.k} delay={i * 100}>
            <div className="pixel-box-sm tilt-card px-4 py-5 text-center">
              <div
                className="font-pixel text-lg sm:text-2xl"
                dir="ltr"
              >
                {s.v}
              </div>
              <div className="mt-3 text-xs font-bold text-soft sm:text-sm">
                {s.k}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
