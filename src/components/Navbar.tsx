import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Headset, Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useCart } from "@/context/CartContext";
import { ThemeToggle, ToothMark } from "./ui";

const links = [
  { label: "الرئيسية", href: "#hero" },
  { label: "الفئات", href: "#categories" },
  { label: "المنتجات", href: "#products" },
  { label: "العرض الخاص", href: "#offer" },
  { label: "آراء العملاء", href: "#testimonials" },
  { label: "فروعنا", href: "#branches" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const { count, setOpen } = useCart();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.9, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-[100] transition-all duration-500",
          scrolled ? "glass border-b border-[var(--line-1)] py-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)]" : "py-5",
        )}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Logo */}
          <a href="#hero" className="group flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-700 shadow-[0_8px_24px_rgba(34,211,238,0.35)] transition-transform duration-500 group-hover:rotate-12">
              <ToothMark className="size-6 text-white" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-xl font-black">
                إيجي <span className="text-volt-400">دنت</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.3em] text-frost-500" dir="ltr">
                EGY DENT STORE
              </span>
            </span>
          </a>

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-frost-300 transition-colors hover:bg-[var(--fill-4)] hover:text-[var(--text-primary)]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <a
              href="tel:01005551280"
              className="hidden items-center gap-2 rounded-full border border-[var(--line-3)] px-4 py-2 text-sm font-semibold text-frost-300 transition-colors hover:border-volt-500/40 hover:text-volt-300 xl:flex"
              dir="ltr"
            >
              <Headset className="size-4 text-volt-400" />
              0100 555 1280
            </a>

            <ThemeToggle />

            {/* Cart */}
            <button
              onClick={() => setOpen(true)}
              className="relative grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-volt-500 to-volt-700 text-white shadow-[0_8px_24px_rgba(34,211,238,0.35)] transition-transform hover:scale-105 active:scale-95"
              aria-label="سلة التسوق"
            >
              <ShoppingBag className="size-5" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    className="absolute -left-1.5 -top-1.5 grid min-w-6 place-items-center rounded-full border-2 border-ink-950 bg-gold-400 px-1 font-display text-xs font-black text-[var(--onaccent)]"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Mobile burger */}
            <button
              onClick={() => setMenu(true)}
              className="grid size-11 place-items-center rounded-2xl border border-[var(--line-3)] text-frost-300 lg:hidden"
              aria-label="القائمة"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>

        {/* Scroll progress */}
        <motion.div
          style={{ scaleX: progress }}
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-right bg-gradient-to-l from-volt-400 via-volt-600 to-gold-400"
        />
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] lg:hidden"
          >
            <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-xl" onClick={() => setMenu(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="absolute inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col border-l border-[var(--line-2)] bg-ink-900 p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-black">
                  إيجي <span className="text-volt-400">دنت</span>
                </span>
                <button
                  onClick={() => setMenu(false)}
                  className="grid size-10 place-items-center rounded-xl border border-[var(--line-3)] text-frost-300"
                  aria-label="إغلاق"
                >
                  <X className="size-5" />
                </button>
              </div>
              <ul className="mt-10 space-y-1">
                {links.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.05 }}
                  >
                    <a
                      href={l.href}
                      onClick={() => setMenu(false)}
                      className="block rounded-2xl px-4 py-3.5 font-display text-2xl font-bold text-frost-300 transition-colors hover:bg-volt-500/10 hover:text-volt-300"
                    >
                      {l.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
              <a
                href="tel:01005551280"
                className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-volt-500/10 py-4 font-bold text-volt-300"
                dir="ltr"
              >
                <Headset className="size-5" />
                0100 555 1280
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
