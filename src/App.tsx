import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { StoreProvider } from "@/context/StoreContext";
import { CartProvider, useCart } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import Offer from "@/components/Offer";
import WhyUs from "@/components/WhyUs";
import Testimonials from "@/components/Testimonials";
import Branches from "@/components/Branches";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CheckoutModal from "@/components/CheckoutModal";
import ProductModal from "@/components/ProductModal";
import Admin from "@/pages/Admin";
import { fmt } from "@/data/data";

function Toast() {
  const { toast, dismissToast, setOpen } = useCart();
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(dismissToast, 2600);
    return () => clearTimeout(id);
  }, [toast, dismissToast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.button
          key={toast.id}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          onClick={() => {
            dismissToast();
            setOpen(true);
          }}
          className="glass fixed bottom-6 left-1/2 z-[155] flex w-max max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-400/30 px-5 py-3.5 text-right shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        >
          <CheckCircle2 className="size-6 shrink-0 text-emerald-400" />
          <span>
            <span className="block text-sm font-extrabold">اتضافت للسلة</span>
            <span className="block text-xs text-frost-400">
              {toast.product.name} — {fmt(toast.product.price)} جنيه · اضغط لعرض السلة
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function Store() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 1900);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    document.body.style.overflow = loading ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [loading]);

  return (
    <div className="noise min-h-screen bg-ink-950 font-sans text-[var(--text-primary)] antialiased">
      <AnimatePresence>{loading && <Preloader />}</AnimatePresence>

      <Navbar />
      <main>
        <Hero />
        <Categories />
        <Products />
        <Offer />
        <WhyUs />
        <Testimonials />
        <Branches />
      </main>
      <Footer />
      <CartDrawer />
      <CheckoutModal />
      <ProductModal />
      <Toast />
    </div>
  );
}

function Shell() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHash = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (hash === "#admin") return <Admin />;
  return <Store />;
}

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <CartProvider>
          <Shell />
        </CartProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
