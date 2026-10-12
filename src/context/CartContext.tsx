import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/data/data";
import { useStore } from "./StoreContext";

const CART_STORAGE_KEY = "egy-dent-cart";

/** أقصى عدد أصناف مختلفة في الطلب الواحد المحفوظ (حد Firestore Rules). صفحة الدفع بتقسّم السلة على أجزاء بالحجم ده */
export const MAX_ORDER_ITEMS = 6;
/** أقصى عدد أصناف مختلفة في السلة كلها (بتتقسّم تلقائيًا على أكتر من طلب وقت التأكيد) */
export const MAX_CART_ITEMS = 50;
/** أقصى كمية للصنف الواحد (نفس حد الرولز) */
export const MAX_ITEM_QTY = 1000;

export type CartLine = { id: number; qty: number };
export type Toast = { id: number; product: Product };

function loadStoredLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // تنظيف السلة القديمة: كميات صحيحة فقط، بدون تكرار، وبحد أقصى MAX_CART_ITEMS صنف
    const seen = new Set<number>();
    const clean: CartLine[] = [];
    for (const l of parsed) {
      if (!l || typeof l.id !== "number" || typeof l.qty !== "number") continue;
      const qty = Math.min(Math.floor(l.qty), MAX_ITEM_QTY);
      if (!(qty >= 1) || seen.has(l.id)) continue;
      seen.add(l.id);
      clean.push({ id: l.id, qty });
    }
    return clean.slice(0, MAX_CART_ITEMS);
  } catch {
    return [];
  }
}

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
      const amount = Math.max(1, Math.floor(qty));
      const exists = lines.some((l) => l.id === id);

      // صنف جديد بعد ما السلة وصلت للحد الأقصى = ممنوع مع رسالة واضحة
      if (!exists && lines.length >= MAX_CART_ITEMS) {
        alert(
          `الحد الأقصى ${MAX_CART_ITEMS} صنف مختلف في السلة الواحدة.\nكمّل الطلب الحالي الأول، وبعدين اعمل طلب جديد بباقي الأصناف.`,
        );
        return;
      }

      setLines((prev) => {
        const found = prev.find((l) => l.id === id);
        if (found) {
          return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(l.qty + amount, MAX_ITEM_QTY) } : l));
        }
        return [...prev, { id, qty: Math.min(amount, MAX_ITEM_QTY) }];
      });

      const product = products.find((p) => p.id === id);
      if (product) setToast({ id: Date.now(), product });
    },
    [products, lines],
  );

  const remove = useCallback((id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    const q = Math.floor(qty);
    if (!Number.isFinite(q)) return;
    setLines((prev) =>
      q <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(q, MAX_ITEM_QTY) } : l)),
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
