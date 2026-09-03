import { useEffect, useRef, useState } from "react";
import { BadgePercent, Flame } from "lucide-react";
import { Reveal } from "./ui";

const DUR = 2 * 24 * 3600 + 14 * 3600 + 32 * 60; // 2d 14h 32m

function useCountdown() {
  const target = useRef(Date.now() + DUR * 1000);
  const [left, setLeft] = useState(DUR);
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.floor((target.current - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, []);
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return [
    { v: d, l: "يوم" },
    { v: h, l: "ساعة" },
    { v: m, l: "دقيقة" },
    { v: s, l: "ثانية" },
  ];
}

export default function Offer() {
  const units = useCountdown();

  return (
    <section id="offer" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-volt-500/20">
            {/* bg */}
            <div className="absolute inset-0 bg-gradient-to-bl from-volt-700 via-[#0b3b52] to-ink-900" />
            <div className="absolute inset-0 bg-grid opacity-40" />
            <div className="absolute -top-24 left-1/4 size-96 rounded-full bg-volt-400/20 blur-[110px]" />
            <span
              className="pointer-events-none absolute -bottom-16 left-4 select-none font-display text-[11rem] font-black leading-none text-white/[0.05] md:text-[17rem]"
              dir="ltr"
            >
              20%
            </span>

            <div className="relative grid items-center gap-10 p-8 md:p-14 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="text-center lg:text-right">
                <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-500/10 px-4 py-2 text-sm font-extrabold text-gold-300">
                  <Flame className="size-4" />
                  عرض محدود — ينتهي قريباً
                </span>
                <h2 className="mt-6 font-display text-4xl font-black leading-tight md:text-6xl">
                  خصم <span className="text-gold-400">20%</span> على
                  <br />
                  جميع المنتجات
                </h2>
                <p className="mx-auto mt-4 max-w-md leading-loose text-white/70 lg:mx-0">
                  استخدم الكود <span className="rounded-lg bg-white/10 px-2.5 py-1 font-display font-black tracking-widest text-gold-300" dir="ltr">EGY20</span> عند
                  الطلب — على الأجهزة والمستهلكات وكل حاجة.
                </p>
                <a
                  href="#products"
                  className="mt-8 inline-flex items-center gap-2.5 rounded-2xl bg-white px-9 py-4 font-display text-lg font-black text-ink-950 shadow-[0_16px_44px_rgba(255,255,255,0.25)] transition-transform hover:scale-[1.04] active:scale-95"
                >
                  <BadgePercent className="size-5" />
                  اطلب بالخصم دلوقتي
                </a>
              </div>

              {/* countdown */}
              <div className="grid grid-cols-4 gap-3 md:gap-4" dir="ltr">
                {units.map((u) => (
                  <div
                    key={u.l}
                    className="rounded-3xl border border-white/15 bg-white/[0.07] px-2 py-6 text-center backdrop-blur-md md:py-8"
                  >
                    <p className="font-display text-4xl font-black tabular-nums text-white md:text-5xl">
                      {String(u.v).padStart(2, "0")}
                    </p>
                    <p className="mt-2 text-xs font-bold text-volt-200 md:text-sm">{u.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
