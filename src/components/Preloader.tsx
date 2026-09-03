import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ToothMark } from "./ui";

export default function Preloader() {
  const [n, setN] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const dur = 1500;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <motion.div
      exit={{ y: "-100%" }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[200] grid place-items-center bg-ink-950"
    >
      <div className="absolute inset-0 bg-grid opacity-60 mask-fade-y" />
      <div className="absolute left-1/2 top-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt-600/10 blur-[120px]" />

      <div className="relative flex flex-col items-center">
        <div className="relative grid size-28 place-items-center">
          <motion.div
            className="absolute inset-0 rounded-[2rem] border border-volt-500/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 rounded-3xl border border-volt-400/50 border-t-transparent border-l-transparent"
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
          <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-700 shadow-[0_0_40px_rgba(34,211,238,0.4)]">
            <ToothMark className="size-9 text-[var(--onaccent)]" />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8 font-display text-2xl font-black tracking-wide"
        >
          إيجي <span className="text-volt-400">دنت</span>
        </motion.p>
        <p className="mt-1 text-xs font-medium tracking-[0.35em] text-frost-500" dir="ltr">
          EGY DENT STORE
        </p>

        <div className="mt-8 h-px w-52 overflow-hidden rounded-full bg-[var(--fill-6)]">
          <div
            className="h-full bg-gradient-to-l from-volt-300 to-volt-600 transition-[width] duration-100"
            style={{ width: `${n}%` }}
          />
        </div>
        <p className="mt-3 font-display text-sm font-bold tabular-nums text-frost-400" dir="ltr">
          {n}%
        </p>
      </div>
    </motion.div>
  );
}
