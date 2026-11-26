import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  DinoWorld,
  type GameState,
  type SoundKind,
  type WorldMode,
} from "../game/DinoWorld";

export interface DinoHandle {
  jump: () => void;
  start: () => void;
  setDuck: (on: boolean) => void;
  togglePause: () => void;
}

interface Props {
  mode: WorldMode;
  dark: boolean;
  className?: string;
  onScore?: (s: number) => void;
  onState?: (s: GameState) => void;
  onSound?: (k: SoundKind) => void;
}

const DinoCanvas = forwardRef<DinoHandle, Props>(function DinoCanvas(
  { mode, dark, className, onScore, onState, onSound },
  ref
) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<DinoWorld | null>(null);
  const cbs = useRef({ onScore, onState, onSound });
  const darkRef = useRef(dark);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    cbs.current = { onScore, onState, onSound };
    darkRef.current = dark;
  });

  useImperativeHandle(ref, () => ({
    jump: () => world.current?.jump(),
    start: () => world.current?.start(),
    setDuck: (on: boolean) => world.current?.setDuck(on),
    togglePause: () => world.current?.togglePause(),
  }));

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let w: DinoWorld;
    try {
      w = new DinoWorld(el, {
        mode,
        dark: darkRef.current,
        onScore: (s) => cbs.current.onScore?.(s),
        onState: (s) => cbs.current.onState?.(s),
        onSound: (k) => cbs.current.onSound?.(k),
      });
    } catch {
      setFailed(true);
      return;
    }
    world.current = w;
    const io = new IntersectionObserver(
      ([entry]) => w.setActive(entry.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      w.dispose();
      world.current = null;
    };
  }, [mode]);

  useEffect(() => {
    world.current?.applyTheme(dark);
  }, [dark]);

  return (
    <div ref={host} className={className}>
      {failed && (
        <div className="flex h-full w-full items-center justify-center p-6 text-center font-bold text-soft">
          مرورگر شما از WebGL پشتیبانی نمی‌کند. برای دیدن نسخه‌ی سه‌بعدی
          مرورگر دیگری را امتحان کنید.
        </div>
      )}
    </div>
  );
});

export default DinoCanvas;
