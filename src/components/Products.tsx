import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, Plus, Search, Star } from "lucide-react";
import { catName, categories, fmt, type Product } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { useStore } from "@/context/StoreContext";
import { SectionHead, Reveal } from "./ui";
import { cn } from "@/utils/cn";

function ProductCard({ p, index }: { p: Product; index: number }) {
  const { add, setQuickView } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    add(p.id);
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
  };

  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
      transition={{ duration: 0.6, delay: Math.min(index, 11) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => setQuickView(p)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line-2)] bg-ink-900 transition-colors duration-500 hover:border-volt-500/40 hover:shadow-[0_24px_70px_rgba(6,182,212,0.12)]"
    >
      {/* image */}
      <div className="relative h-60 overflow-hidden">
        <img
          src={p.img}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[1.1s] ease-out group-hover:scale-[1.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />

        {p.badge && !p.showcaseOnly && (
          <span className="absolute right-4 top-4 rounded-full bg-gradient-to-l from-gold-400 to-gold-500 px-3 py-1.5 font-display text-xs font-black text-[var(--onaccent)] shadow-lg">
            {p.badge}
          </span>
        )}
        {discount > 0 && !p.badge && !p.showcaseOnly && (
          <span className="absolute right-4 top-4 rounded-full bg-volt-500 px-3 py-1.5 font-display text-xs font-black text-[var(--onaccent)]">
            -{discount}%
          </span>
        )}

        {/* quick view hint */}
        <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-ink-950/70 px-5 py-2.5 text-xs font-bold text-[var(--text-primary)] opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
          <Eye className="size-4 text-volt-300" />
          {p.showcaseOnly ? "عرض الصورة" : "عرض التفاصيل"}
        </span>

        {/* rating — only show once the product actually has sales/reviews behind it */}
        {p.sold > 0 && !p.showcaseOnly && (
          <span className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full border border-[var(--line-3)] bg-ink-950/70 px-3 py-1 text-xs font-bold text-[var(--text-primary)] backdrop-blur-md" dir="ltr">
            <Star className="size-3.5 fill-gold-400 text-gold-400" />
            {p.rating}
            <span className="text-frost-500">({p.sold}+)</span>
          </span>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5">
        <span className="text-[11px] font-bold tracking-wide text-volt-400">{catName(p.cat)}</span>
        <h3 className="mt-1.5 font-display text-lg font-extrabold leading-snug">{p.name}</h3>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          {p.showcaseOnly ? (
            <p className="text-xs leading-relaxed text-frost-400">{p.desc || "قريباً في متجرنا"}</p>
          ) : (
            <>
              <div>
                {p.oldPrice && p.oldPrice > 0 && (
                  <p className="text-xs font-medium text-frost-500 line-through">{fmt(p.oldPrice)} جنيه</p>
                )}
                <p className="font-display text-2xl font-black text-[var(--text-primary)]">
                  {fmt(p.price)}
                  <span className="mr-1.5 text-xs font-bold text-frost-400">جنيه</span>
                </p>
              </div>

              <button
                onClick={handleAdd}
                aria-label={added ? "تمت الإضافة" : "أضف للسلة"}
                className={cn(
                  "relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl transition-all duration-300 active:scale-90",
                  added
                    ? "bg-emerald-400 text-[var(--onaccent)] shadow-[0_10px_28px_rgba(52,211,153,0.4)]"
                    : "bg-gradient-to-br from-volt-400 to-volt-600 text-[var(--onaccent)] shadow-[0_10px_28px_rgba(34,211,238,0.3)] hover:scale-105",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                      <Check className="size-5" strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span key="p" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, rotate: 90 }}>
                      <Plus className="size-5" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

const PAGE_SIZE = 50;

export default function Products() {
  const { products } = useStore();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const filtered = useMemo(() => {
    const byCat = filter === "all" ? products : products.filter((p) => p.cat === filter);
    const query = q.trim().toLowerCase();
    if (!query) return byCat;
    return byCat.filter((p) => p.name.toLowerCase().includes(query));
  }, [filter, products, q]);
  // نرجّع العداد لأول صفحة كل ما الفلتر أو البحث يتغيّر
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, q]);
  // لو المستخدم دوس على فئة من قسم الفئات فوق، نفلتر هنا تلقائي
  useEffect(() => {
    const onCatSelect = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setFilter(id);
    };
    window.addEventListener("set-product-filter", onCatSelect);
    return () => window.removeEventListener("set-product-filter", onCatSelect);
  }, []);
  const list = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section id="products" className="relative bg-ink-900/50 py-24 md:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-l from-transparent via-volt-500/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead
          center
          kicker="الأعلى طلباً"
          title={
            <>
              منتجات مميزة <span className="text-volt-400">بأسعار الجملة</span>
            </>
          }
          desc="مختارات موثوقة من أكبر البراندات العالمية — بضمان الوكيل وتوصيل فوري لحد باب العيادة."
        />

        {/* search */}
        <Reveal delay={0.05} className="mx-auto mt-10 max-w-md">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-frost-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full rounded-2xl border border-[var(--line-3)] bg-ink-900 py-3 pl-4 pr-11 text-sm outline-none transition-colors placeholder:text-frost-500/70 focus:border-volt-500/60"
            />
          </div>
        </Reveal>

        {/* filters */}
        <Reveal delay={0.1} className="mt-6">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {[{ id: "all", name: "كل المنتجات" }, ...categories].map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={cn(
                  "relative rounded-full px-5 py-2.5 text-sm font-bold transition-colors",
                  filter === c.id ? "text-[var(--onaccent)]" : "border border-[var(--line-3)] text-frost-300 hover:border-volt-500/40 hover:text-volt-300",
                )}
              >
                {filter === c.id && (
                  <motion.span
                    layoutId="pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-l from-volt-400 to-volt-600 shadow-[0_8px_24px_rgba(34,211,238,0.35)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{c.name}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* grid */}
        {list.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-dashed border-[var(--line-3)] py-12 text-center text-sm text-frost-500">
            مفيش منتجات مطابقة للبحث
          </p>
        ) : (
          <motion.div layout className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map((p, i) => (
                <ProductCard key={p.id} p={p} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-2xl border border-[var(--line-3)] px-8 py-3.5 text-sm font-bold text-frost-300 transition-colors hover:border-volt-500/40 hover:text-volt-300"
            >
              عرض المزيد ({filtered.length - visibleCount} منتج متبقي)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
