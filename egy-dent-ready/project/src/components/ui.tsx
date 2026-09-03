import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/utils/cn";

/* ---------- Brand mark ---------- */
export function ToothMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M32 12c-8.8 0-15 6.2-15 14 0 4.2 1.6 7.6 3 10.4 1.2 2.4 2 4.8 2.4 7.8.3 2.4 2 4.4 4.2 4.4 1.9 0 3.4-1.4 3.8-3.3l1.6-6.6 1.6 6.6c.4 1.9 1.9 3.3 3.8 3.3 2.2 0 3.9-2 4.2-4.4.4-3 1.2-5.4 2.4-7.8 1.4-2.8 3-6.2 3-10.4 0-7.8-6.2-14-15-14Z"
      />
    </svg>
  );
}

/* ---------- Section heading ---------- */
export function SectionHead({
  kicker,
  title,
  desc,
  center,
  className,
}: {
  kicker: string;
  title: ReactNode;
  desc?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn("max-w-3xl", center && "mx-auto text-center", className)}
    >
      <span className="inline-flex items-center gap-2.5 rounded-full border border-volt-500/25 bg-volt-500/5 px-4 py-1.5 text-[13px] font-semibold text-volt-300">
        <span className="size-1.5 rounded-full bg-volt-400 animate-pulse-dot" />
        {kicker}
      </span>
      <h2 className="mt-5 font-display text-4xl font-black leading-[1.15] tracking-tight md:text-5xl lg:text-6xl">
        {title}
      </h2>
      {desc && <p className="mt-5 text-base leading-relaxed text-frost-400 md:text-lg">{desc}</p>}
    </motion.div>
  );
}

/* ---------- Count up on view ---------- */
export function CountUp({ to, suffix = "", className }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const dur = 1600;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return (
    <span ref={ref} className={className} dir="ltr">
      {val.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/* ---------- Reveal wrapper ---------- */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 36,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
