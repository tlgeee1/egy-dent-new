import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ClipboardList, Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useStore } from "@/context/StoreContext";
import { fmt } from "@/data/data";

export default function CartDrawer() {
  const { lines, total, count, isOpen, setOpen, setQty, remove, setCheckoutOpen } = useCart();
  const { products, settings } = useStore();

  const FREE = settings.freeShipping;
  const progress = Math.min(1, total / FREE);
  const remaining = Math.max(0, FREE - total);

  const quickWhatsapp = () => {
    const items = lines
      .map((l) => {
        const p = products.find((p) => p.id === l.id)!;
        return `• ${p.name} × ${l.qty} = ${fmt(p.price * l.qty)} جنيه`;
      })
      .join("\n");
    const msg = `أهلاً إيجي دنت،\nعايز أطلب المنتجات دي:\n${items}\n━━━━━━━━━━\nالإجمالي: ${fmt(total)} جنيه${total >= FREE ? "\n(الطلب مستحق للشحن المجاني)" : ""}`;
    window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col border-r border-white/[0.08] bg-ink-900 shadow-2xl"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
              <h3 className="flex items-center gap-2.5 font-display text-xl font-black">
                <ShoppingBag className="size-5 text-volt-400" />
                سلة التسوق
                {count > 0 && (
                  <span className="rounded-full bg-volt-500/15 px-2.5 py-0.5 text-xs font-bold text-volt-300">
                    {count} منتج
                  </span>
                )}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-xl border border-white/10 text-frost-300 transition-colors hover:bg-white/5"
                aria-label="إغلاق السلة"
              >
                <X className="size-5" />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <span className="mx-auto grid size-24 place-items-center rounded-full border border-dashed border-white/15 text-frost-500">
                    <ShoppingBag className="size-10" />
                  </span>
                  <p className="mt-6 font-display text-xl font-extrabold">السلة فاضية لسه</p>
                  <p className="mt-2 text-sm text-frost-500">زوّد منتجات وهتظهر هنا فوراً</p>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 px-7 py-3.5 font-display font-extrabold text-ink-950 transition-transform hover:scale-105"
                  >
                    ابدأ التسوق
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* free shipping bar */}
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-frost-300">
                    <Truck className="size-4 text-volt-400" />
                    {remaining > 0 ? (
                      <>
                        فاضل <span className="text-gold-400">{fmt(remaining)} جنيه</span> وتوصلك الشحنة مجاناً
                      </>
                    ) : (
                      <span className="text-emerald-400">مبروك! الشحن علينا — رسوم الشحن صفر</span>
                    )}
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 22 }}
                      className="h-full rounded-full bg-gradient-to-l from-volt-400 to-emerald-400"
                    />
                  </div>
                </div>

                {/* items */}
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => {
                      const p = products.find((p) => p.id === l.id);
                      if (!p) return null;
                      return (
                        <motion.div
                          key={l.id}
                          layout
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -60, transition: { duration: 0.25 } }}
                          className="flex gap-3.5 rounded-2xl border border-white/[0.07] bg-ink-800/60 p-3"
                        >
                          <img src={p.img} alt={p.name} className="size-20 shrink-0 rounded-xl object-cover" />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="truncate font-display text-sm font-extrabold">{p.name}</h4>
                              <button
                                onClick={() => remove(l.id)}
                                className="text-frost-500 transition-colors hover:text-red-400"
                                aria-label="حذف"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            <p className="mt-0.5 text-xs text-frost-500">{fmt(p.price)} جنيه</p>
                            <div className="mt-auto flex items-center justify-between pt-2">
                              <div className="flex items-center gap-1 rounded-xl border border-white/10 p-1">
                                <button
                                  onClick={() => setQty(l.id, l.qty - 1)}
                                  className="grid size-7 place-items-center rounded-lg text-frost-300 transition-colors hover:bg-white/10"
                                  aria-label="تقليل الكمية"
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <span className="w-7 text-center font-display text-sm font-black tabular-nums">{l.qty}</span>
                                <button
                                  onClick={() => setQty(l.id, l.qty + 1)}
                                  className="grid size-7 place-items-center rounded-lg text-frost-300 transition-colors hover:bg-white/10"
                                  aria-label="زيادة الكمية"
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>
                              <p className="font-display text-base font-black text-volt-300">{fmt(p.price * l.qty)}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* footer */}
                <div className="border-t border-white/[0.07] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-frost-400">الإجمالي</span>
                    <span className="font-display text-2xl font-black text-white">
                      {fmt(total)} <span className="text-sm font-bold text-frost-400">جنيه</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-frost-500">
                    {total >= FREE ? "شامل الشحن المجاني" : "رسوم الشحن تتحدد عند تأكيد الطلب"}
                  </p>
                  <button
                    onClick={() => {
                      setOpen(false);
                      setCheckoutOpen(true);
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 py-4 font-display text-lg font-black text-ink-950 shadow-[0_14px_36px_rgba(34,211,238,0.35)] transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <ClipboardList className="size-5" />
                    إتمام الطلب
                  </button>
                  <button
                    onClick={quickWhatsapp}
                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 py-3.5 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-400/20"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                      <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.48.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.05 21.79h-.01a9.82 9.82 0 0 1-5-1.37l-.36-.22-3.73.98 1-3.63-.24-.37a9.8 9.8 0 0 1-1.5-5.23c0-5.42 4.42-9.83 9.85-9.83a9.79 9.79 0 0 1 9.83 9.83c0 5.42-4.42 9.84-9.84 9.84Zm8.37-18.2A11.8 11.8 0 0 0 12.04 0C5.5 0 .16 5.33.16 11.87c0 2.1.55 4.14 1.59 5.94L.06 24l6.33-1.66a11.9 11.9 0 0 0 5.66 1.44c6.54 0 11.87-5.33 11.87-11.87 0-3.17-1.23-6.15-3.5-8.31Z" />
                    </svg>
                    طلب سريع عبر واتساب
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
