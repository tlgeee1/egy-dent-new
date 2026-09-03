import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowDown, BadgePercent, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Marquee from "./Marquee";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 1.75 } },
};
const item = {
  hidden: { opacity: 0, y: 44 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Hero() {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 120, damping: 18 });

  return (
    <section id="hero" className="relative overflow-hidden pt-32 md:pt-40">
      {/* ambience */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-70 mask-fade-y" />
      <div className="pointer-events-none absolute -top-40 right-[-10%] size-[560px] rounded-full bg-volt-600/[0.13] blur-[130px]" />
      <div className="pointer-events-none absolute bottom-0 left-[-12%] size-[520px] rounded-full bg-[#1d4ed8]/10 blur-[130px]" />
      <p
        className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[19vw] font-black leading-none text-stroke opacity-40"
        dir="ltr"
      >
        EGY DENT
      </p>

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-14 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24">
          {/* Copy */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10 text-center lg:text-right">
            <motion.div variants={item} className="inline-flex items-center gap-2.5 rounded-full border border-volt-500/25 bg-volt-500/[0.07] px-4 py-2 text-sm font-semibold text-volt-300">
              <Sparkles className="size-4" />
              المورد المعتمد لأكثر من 950 عيادة ومعمل في مصر
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-6 font-display text-[2.65rem] font-black leading-[1.12] tracking-tight md:text-6xl lg:text-[4.35rem]"
            >
              كل مستلزمات
              <span className="relative mx-3 inline-block text-transparent [-webkit-text-stroke:0] bg-gradient-to-l from-volt-300 via-volt-500 to-volt-600 bg-clip-text">
                طب الأسنان
                <svg viewBox="0 0 320 14" className="absolute -bottom-2 right-0 w-full text-volt-500/60" aria-hidden>
                  <path d="M4 10 C 90 2, 230 2, 316 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
                </svg>
              </span>
              <br />
              في مكان واحد
            </motion.h1>

            <motion.p variants={item} className="mx-auto mt-6 max-w-xl text-base leading-loose text-frost-400 md:text-lg lg:mx-0">
              من الزراعة والتقويم للأجهزة والمستهلكات — منتجات أصلية 100% بأسعار الجملة،
              توصيل خلال 24 ساعة داخل القاهرة ولكل محافظات مصر.
            </motion.p>

            <motion.div variants={item} className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="#products"
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 px-9 py-4 text-center font-display text-lg font-extrabold text-ink-950 shadow-[0_16px_40px_rgba(34,211,238,0.35)] transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
              >
                <span className="relative z-10">تسوّق المنتجات</span>
                <span className="absolute inset-y-0 w-1/3 bg-white/40 blur-md animate-shine" />
              </a>
              <a
                href="#offer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold-500/40 bg-gold-500/[0.07] px-9 py-4 font-display text-lg font-bold text-gold-400 transition-colors hover:bg-gold-500/15 sm:w-auto"
              >
                <BadgePercent className="size-5" />
                عرض خصم 20%
              </a>
            </motion.div>

            {/* mini stats */}
            <motion.dl variants={item} className="mt-12 flex items-center justify-center gap-8 sm:gap-12 lg:justify-start">
              {[
                ["+2,500", "منتج أصلي"],
                ["+950", "عيادة تثق بينا"],
                ["24h", "توصيل سريع"],
              ].map(([v, l], i) => (
                <div key={l} className={i > 0 ? "border-r border-white/10 pr-8 sm:pr-12" : ""}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl font-black text-white md:text-3xl" dir="ltr">
                    {v}
                  </dd>
                  <dd className="mt-1 text-xs text-frost-500 md:text-sm">{l}</dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 mx-auto w-full max-w-[540px] [perspective:1200px]"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              mx.set((e.clientX - r.left) / r.width);
              my.set((e.clientY - r.top) / r.height);
            }}
            onMouseLeave={() => {
              mx.set(0.5);
              my.set(0.5);
            }}
          >
            <motion.div style={{ rotateX: rx, rotateY: ry }} className="relative will-change-transform">
              <div className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-volt-500/25 via-transparent to-[#1d4ed8]/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
                <img src="images/hero.png" alt="أجهزة ومستلزمات طب الأسنان" className="aspect-[5/4.4] w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent" />
              </div>

              {/* floating chips */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.7, duration: 0.7 }}
                className="absolute -right-3 top-8 md:-right-8"
              >
                <div className="glass animate-float rounded-2xl border border-volt-400/30 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-volt-500/15 text-volt-300">
                      <Truck className="size-4.5" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-extrabold">توصيل 24 ساعة</p>
                      <p className="text-[11px] text-frost-500">داخل القاهرة الكبرى</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.9, duration: 0.7 }}
                className="absolute -left-3 top-1/3 md:-left-10"
              >
                <div className="glass animate-float-late rounded-2xl border border-gold-500/30 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-gold-500/15 text-gold-400">
                      <BadgePercent className="size-4.5" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-extrabold text-gold-300">خصم 20%</p>
                      <p className="text-[11px] text-frost-500">لفترة محدودة</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.1, duration: 0.7 }}
                className="absolute -bottom-5 right-8"
              >
                <div className="glass animate-float rounded-2xl border border-white/15 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
                      <ShieldCheck className="size-4.5" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-extrabold">أصلي 100%</p>
                      <p className="text-[11px] text-frost-500">ضمان حقيقي وفاتورة</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* scroll hint */}
      <motion.a
        href="#categories"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.4 }}
        className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-frost-500 transition-colors hover:text-volt-300 lg:flex"
      >
        <span className="text-[11px] font-semibold tracking-widest">اسكرول لتحت</span>
        <ArrowDown className="size-4 animate-bounce" />
      </motion.a>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 1 }}>
        <Marquee
          items={["زراعة أسنان", "تقويم شفاف", "أجهزة عيادات", "حشوات تجميلية", "أدوات جراحة", "تعقيم وتطهير", "مستهلكات يومية", "أشعة وتصوير"]}
        />
      </motion.div>
    </section>
  );
}
