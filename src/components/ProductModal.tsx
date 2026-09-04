import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Minus, Plus, ShoppingBag, Star, Truck, X, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { catName, fmt } from "@/data/data";

export default function ProductModal() {
  const { quickView: p, setQuickView, add, setOpen } = useCart();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [p]);

  return (
    <AnimatePresence>
      {p && (
        <div className="fixed inset-0 z-[170] grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQuickView(null)}
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl"
          >
            <button
              onClick={() => setQuickView(null)}
              className="absolute left-4 top-4 z-10 grid size-10 place-items-center rounded-xl border border-[var(--line-3)] bg-ink-950/60 text-frost-300 backdrop-blur-md transition-colors hover:bg-[var(--fill-6)]"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </button>

            <div className="grid md:grid-cols-2">
              {/* image */}
              <div className="relative min-h-72">
                <img src={p.img} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-l from-ink-900/70 via-transparent to-transparent md:bg-gradient-to-l" />
                {p.badge && (
                  <span className="absolute right-5 top-5 rounded-full bg-gradient-to-l from-gold-400 to-gold-500 px-3.5 py-1.5 font-display text-xs font-black text-[var(--onaccent)]">
                    {p.badge}
                  </span>
                )}
              </div>

              {/* details */}
              <div className="flex flex-col p-6 md:p-9">
                <span className="text-xs font-bold tracking-wide text-volt-400">{catName(p.cat)}</span>
                <h3 className="mt-2 font-display text-2xl font-black leading-snug md:text-3xl">{p.name}</h3>

                {p.sold > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex gap-0.5" dir="ltr">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            i < Math.round(p.rating)
                              ? "size-4 fill-gold-400 text-gold-400"
                              : "size-4 text-frost-500/40"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs text-frost-400">
                      {p.rating} · اتباع أكتر من {p.sold} مرة
                    </span>
                  </div>
                )}

                <p className="mt-5 text-sm leading-loose text-frost-300 md:text-[15px]">{p.desc}</p>

                <div className="mt-5 flex flex-wrap gap-2.5 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
                    <BadgeCheck className="size-3.5" /> أصلي 100%
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-volt-500/30 bg-volt-500/10 px-3 py-1.5 text-volt-300">
                    <Truck className="size-3.5" /> توصيل خلال 24-48 ساعة
                  </span>
                </div>

                <div className="mt-6 flex items-end gap-3 border-t border-[var(--line-2)] pt-6">
                  <div>
                    {p.oldPrice && p.oldPrice > 0 && (
                      <p className="text-sm text-frost-500 line-through">{fmt(p.oldPrice)} جنيه</p>
                    )}
                    <p className="font-display text-4xl font-black text-[var(--text-primary)]">
                      {fmt(p.price)}
                      <span className="mr-2 text-sm font-bold text-frost-400">جنيه</span>
                    </p>
                  </div>
                </div>

                {/* qty + actions */}
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-2xl border border-[var(--line-3)] p-1.5">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="grid size-9 place-items-center rounded-xl text-frost-300 transition-colors hover:bg-[var(--fill-6)]"
                      aria-label="تقليل"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-9 text-center font-display text-lg font-black tabular-nums">{qty}</span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="grid size-9 place-items-center rounded-xl text-frost-300 transition-colors hover:bg-[var(--fill-6)]"
                      aria-label="زيادة"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      add(p.id, qty);
                      setQuickView(null);
                      setOpen(true);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 py-3.5 font-display font-black text-[var(--onaccent)] shadow-[0_12px_30px_rgba(34,211,238,0.3)] transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <ShoppingBag className="size-5" />
                    أضف للسلة
                  </button>
                </div>
                <button
                  onClick={() => {
                    add(p.id, qty);
                    setQuickView(null);
                    setOpen(true);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold-500/40 bg-gold-500/10 py-3 text-sm font-bold text-gold-300 transition-colors hover:bg-gold-500/20"
                >
                  <Zap className="size-4" />
                  اشتري الآن — توصيل سريع
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
