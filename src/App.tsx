import { useEffect, useState } from "react";
import Demo from "./components/Demo";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import { About, CTA, Features, Footer, HowTo, Marquee } from "./components/Sections";

const THEME_KEY = "hm-theme";

function initialDark() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    return false;
  }
}

export default function App() {
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar dark={dark} onToggle={() => setDark((d) => !d)} />
      <main>
        <Hero dark={dark} />
        <Marquee />
        <About />
        <Features />
        <Demo dark={dark} />
        <HowTo />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
