import { useEffect, useState } from "react";
import { AUTHOR_HI, GAME_URL, SOCIALS } from "../config";
import {
  CACTUS_SPRITE,
  CountUp,
  DINO_SPRITE,
  ICONS,
  Reveal,
  Sprite,
} from "./ui";

/* ───────────── Marquee ───────────── */

export function Marquee() {
  const words = ["JUMP", "DUCK", "SURVIVE", `BEAT ${String(AUTHOR_HI).padStart(5, "0")}`, "3D VOXEL", "RUN FOREVER"];
  const row = (
    <div className="flex shrink-0 items-center gap-8 pe-8">
      {words.map((w, i) => (
        <span key={i} className="flex items-center gap-8">
          <span className="font-pixel text-sm sm:text-lg">{w}</span>
          <Sprite rows={i % 2 ? CACTUS_SPRITE : DINO_SPRITE} size={i % 2 ? 22 : 34} />
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-y-4 border-ink bg-ink py-4 text-on-ink">
      <div className="marquee-track">
        {row}
        {row}
        {row}
        {row}
      </div>
    </div>
  );
}

/* ───────────── About ───────────── */

function Bar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 300 + delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="font-pixel text-[9px]" dir="ltr">
          {value}%
        </span>
      </div>
      <div className="h-4 border-[3px] border-ink bg-paper p-[2px]">
        <div
          className="h-full bg-ink transition-[width] duration-1000 ease-out"
          style={{ width: on ? `${value}%` : "0%" }}
        />
      </div>
    </div>
  );
}

export function About() {
  return (
    <section id="about" className="relative py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        {/* character card */}
        <Reveal>
          <div className="pixel-box relative mx-auto max-w-md p-6">
            <div className="absolute -top-4 start-6 bg-accent px-3 py-1 font-pixel text-[9px] text-white" dir="ltr">
              PLAYER 1
            </div>
            <div className="bg-dots flex items-center justify-center border-[3px] border-ink bg-paper py-8">
              <div className="floaty text-ink">
                <Sprite rows={DINO_SPRITE} size={150} />
              </div>
            </div>
            <h3 className="mt-6 text-2xl font-black">حسین محمدی</h3>
            <p className="mt-1 text-sm font-bold text-soft">سازنده‌ی بازی‌های وب · Game Maker</p>
            <div className="mt-6 space-y-4">
              <Bar label="عشق به ساخت بازی" value={100} delay={0} />
              <Bar label="خلاقیت" value={92} delay={150} />
              <Bar label="علاقه به دنیای ۳بعدی" value={96} delay={300} />
              <Bar label="صبر برای رفع باگ" value={78} delay={450} />
            </div>
          </div>
        </Reveal>

        {/* text */}
        <div>
          <Reveal>
            <p className="font-pixel text-[10px] tracking-widest text-accent" dir="ltr">
              ▶ ABOUT ME
            </p>
            <h2 className="mt-4 text-4xl font-black leading-snug sm:text-5xl">
              من <span className="bg-ink px-3 text-on-ink">حسین محمدی</span> هستم
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-8 text-lg leading-9 text-soft">
              عاشق ساختن چیزهایی هستم که مردم باهاشون حال کنن. بازی
              <b className="text-ink"> دایناسور سه‌بعدی </b>
              رو ساختم تا بازی ساده و نوستالژیک دینوی کروم رو به یک تجربه‌ی
              وکسلی و سه‌بعدی تبدیل کنم؛ بازی‌ای که مستقیم توی مرورگر، روی
              موبایل و کامپیوتر اجرا می‌شه و فقط یک لمس برای شروع کافیه.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-5 text-lg leading-9 text-soft">
              هدفم اینه که بازی‌هایی بسازم که سریع لود بشن، روان اجرا بشن و
              اون حس «یه دست دیگه!» رو بدن. رکورد خودم
              <span className="mx-2 font-pixel text-xs text-ink" dir="ltr">
                HI {String(AUTHOR_HI).padStart(5, "0")}
              </span>
              هست؛ بیا بشکنش!
            </p>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Web Game", "3D Voxel", "Pixel Art", "Mobile Friendly", "Game Design"].map((t) => (
                <span
                  key={t}
                  dir="ltr"
                  className="border-[3px] border-ink bg-card px-3 py-1.5 font-pixel text-[9px] transition-colors hover:bg-ink hover:text-on-ink"
                >
                  {t}
                </span>
              ))}
            </div>
            <a
              href={GAME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-btn mt-10"
            >
              ▶ بازی من را ببین
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Features ───────────── */

const FEATURES: { icon: keyof typeof ICONS; title: string; text: string }[] = [
  {
    icon: "cube",
    title: "دنیای وکسلی ۳بعدی",
    text: "دایناسور، کاکتوس‌ها و جاده همه از مکعب ساخته شدن؛ با مه، سایه و عمق واقعی سه‌بعدی.",
  },
  {
    icon: "bolt",
    title: "سرعت فزاینده",
    text: "هر چی جلوتر بری، سرعت بیشتر می‌شه و باید رفلکس‌هات رو تیز نگه داری.",
  },
  {
    icon: "trophy",
    title: "رکورد و امتیاز",
    text: "امتیاز زنده و رکورد ذخیره‌شده (HI). ببین می‌تونی از رکورد من جلو بزنی یا نه.",
  },
  {
    icon: "phone",
    title: "مناسب موبایل",
    text: "با یک لمس بپر و با دکمه‌ی DUCK خم شو. روی موبایل و کامپیوتر روان کار می‌کنه.",
  },
  {
    icon: "speaker",
    title: "صدای ۸ بیتی",
    text: "افکت‌های صوتی رترو برای پرش و برخورد، با دکمه‌ی SOUND ON/OFF.",
  },
  {
    icon: "heart",
    title: "ساخته‌شده با عشق",
    text: "یک پروژه‌ی شخصی از دل علاقه به بازی؛ هر جزئیاتش با دقت طراحی شده.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-pixel text-[10px] tracking-widest text-accent" dir="ltr">
            ▶ FEATURES
          </p>
          <h2 className="mt-4 text-4xl font-black sm:text-5xl">چی توی بازی منتظرته؟</h2>
        </Reveal>
        <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 110}>
              <div className="pixel-box tilt-card group h-full p-7">
                <div className="flex h-16 w-16 items-center justify-center border-[3px] border-ink bg-ink text-on-ink transition-transform group-hover:-rotate-6 group-hover:scale-110">
                  <Sprite rows={ICONS[f.icon]} size={34} />
                </div>
                <h3 className="mt-6 text-xl font-black">{f.title}</h3>
                <p className="mt-3 leading-8 text-soft">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── How to play ───────────── */

export function HowTo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 1100);
    return () => clearInterval(id);
  }, []);
  const items = [
    { keys: ["SPACE", "↑"], title: "پرش", text: "از روی کاکتوس‌ها بپر. هر چی دکمه رو زودتر بزنی، پرش زودتر شروع می‌شه." },
    { keys: ["↓"], title: "خم شدن (DUCK)", text: "وقتی پرنده‌ها میان، خم شو و از زیرشون رد شو." },
    { keys: ["TAP"], title: "لمس صفحه", text: "روی موبایل فقط صفحه رو لمس کن تا بپری؛ دکمه‌ی DUCK پایین صفحه‌ست." },
  ];
  return (
    <section id="how" className="relative border-t-4 border-ink bg-card/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-pixel text-[10px] tracking-widest text-accent" dir="ltr">
            ▶ HOW TO PLAY
          </p>
          <h2 className="mt-4 text-4xl font-black sm:text-5xl">کنترل‌ها خیلی ساده‌ست</h2>
        </Reveal>
        <div className="mt-14 grid gap-7 md:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 120}>
              <div className="pixel-box-sm h-full p-7 text-center">
                <div className="flex min-h-[84px] items-center justify-center gap-3" dir="ltr">
                  {it.keys.map((k) => (
                    <span key={k} className={`keycap ${step === i ? "press" : ""}`}>
                      {k}
                    </span>
                  ))}
                </div>
                <h3 className="mt-6 text-xl font-black">{it.title}</h3>
                <p className="mt-3 leading-8 text-soft">{it.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── CTA ───────────── */

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-ink py-24 text-on-ink sm:py-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--on-ink) 1px, transparent 1px), linear-gradient(90deg, var(--on-ink) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Reveal>
          <div className="floaty mx-auto mb-8 w-fit">
            <Sprite rows={DINO_SPRITE} size={96} />
          </div>
          <p className="font-pixel text-2xl sm:text-5xl" dir="ltr">
            HI <CountUp to={AUTHOR_HI} />
          </p>
          <h2 className="mt-8 text-3xl font-black leading-snug sm:text-5xl">
            می‌تونی رکورد من رو بشکنی؟
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-8 opacity-70">
            بازی کامل منتظرته. بپر، خم شو و ببین تا کجا می‌تونی بدوی.
          </p>
          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-3 border-4 border-on-ink bg-on-ink px-9 py-4 text-xl font-black text-ink no-underline shadow-[7px_7px_0_var(--accent)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[10px_10px_0_var(--accent)] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_var(--accent)]"
          >
            ▶ شروع بازی
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── Footer ───────────── */

export function Footer() {
  const socials = SOCIALS.filter((s) => s.href);
  return (
    <footer className="border-t-4 border-ink bg-paper py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
        <div className="flex items-center gap-3">
          <Sprite rows={DINO_SPRITE} size={26} />
          <span className="text-sm font-bold">
            © {new Date().getFullYear()} حسین محمدی · همه‌ی حقوق محفوظ است
          </span>
        </div>
        {socials.length > 0 && (
          <ul className="flex flex-wrap gap-3" dir="ltr">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-[3px] border-ink px-3 py-1.5 font-pixel text-[9px] text-ink no-underline transition-colors hover:bg-ink hover:text-on-ink"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <span className="text-sm text-soft">ساخته‌شده با ♥ و کلی مکعب</span>
      </div>
    </footer>
  );
}
