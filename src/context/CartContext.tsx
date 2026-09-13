import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/data/data";
import { useStore } from "./StoreContext";

const CART_STORAGE_KEY = "egy-dent-cart";

function loadStoredLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        l && typeof l.id === "number" && typeof l.qty === "number" && l.qty > 0,
    );
  } catch {
    return [];
  }
}

export type CartLine = { id: number; qty: number };
export type Toast = { id: number; product: Product };

type CartCtx = {
  lines: CartLine[];
  count: number;
  total: number;
  add: (id: number, qty?: number) => void;
  remove: (id: number) => void;
  setQty: (id: number, qty: number) => void;
  clear: () => void;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (v: boolean) => void;
  quickView: Product | null;
  setQuickView: (p: Product | null) => void;
  toast: Toast | null;
  dismissToast: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useStore();
  const [lines, setLines] = useState<CartLine[]>(() => loadStoredLines());
  const [isOpen, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // احفظ السلة في localStorage كل ما تتغير، عشان متتصفرش لما المستخدم يعمل ريفرش للصفحة
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // لو الجهاز مانع التخزين (وضع تصفح خاص مثلاً)، متجاهلش الخطأ وسيب السلة تشتغل في الجلسة الحالية بس
    }
  }, [lines]);

  const add = useCallback(
    (id: number, qty = 1) => {
      setLines((prev) => {
        const found = prev.find((l) => l.id === id);
        if (found) return prev.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l));
        return [...prev, { id, qty }];
      });
      const product = products.find((p) => p.id === id);
      if (product) setToast({ id: Date.now(), product });
    },
    [products],
  );

  const remove = useCallback((id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const { count, total } = useMemo(() => {
    let c = 0;
    let t = 0;
    for (const l of lines) {
      const p = products.find((p) => p.id === l.id);
      if (!p) continue;
      c += l.qty;
      t += p.price * l.qty;
    }
    return { count: c, total: t };
  }, [lines, products]);

  const value = useMemo(
    () => ({
      lines,
      count,
      total,
      add,
      remove,
      setQty,
      clear,
      isOpen,
      setOpen,
      checkoutOpen,
      setCheckoutOpen,
      quickView,
      setQuickView,
      toast,
      dismissToast,
    }),
    [lines, count, total, add, remove, setQty, clear, isOpen, checkoutOpen, quickView, toast, dismissToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
