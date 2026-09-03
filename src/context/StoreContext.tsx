import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { DEFAULT_FREE_SHIPPING, DEFAULT_PRODUCTS, DEFAULT_WHATSAPP, type Product } from "@/data/data";
import { db } from "@/lib/firebase";

export type OrderStatus = "جديد" | "مؤكد" | "تم الشحن" | "مكتمل";

export type OrderItem = { id: number; name: string; price: number; qty: number };

export type Order = {
  id: string;
  customer: { name: string; clinic: string; phone: string; notes: string };
  payment: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  date: number;
};

export type Settings = { whatsapp: string; freeShipping: number };

const DEFAULT_SETTINGS: Settings = {
  whatsapp: DEFAULT_WHATSAPP,
  freeShipping: DEFAULT_FREE_SHIPPING,
};

export const ADMIN_PASS = "egy2025";

/* refs (db is guarded before every call) */
const fire = () => db!;
const pCol = () => collection(fire(), "products");
const oCol = () => collection(fire(), "orders");
const pRef = (id: number | string) => doc(fire(), "products", String(id));
const oRef = (id: string) => doc(fire(), "orders", id);
const sRef = () => doc(fire(), "settings", "store");

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

let seeding = false;
async function seedDatabase() {
  if (!db || seeding) return;
  seeding = true;
  try {
    await Promise.all(DEFAULT_PRODUCTS.map((p) => setDoc(pRef(p.id), p)));
    await setDoc(sRef(), DEFAULT_SETTINGS);
  } catch (e) {
    console.error("Firebase seed error:", e);
  }
}

type StoreCtx = {
  products: Product[];
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: number, patch: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  resetProducts: () => void;
  orders: Order[];
  addOrder: (o: Order) => void;
  setOrderStatus: (id: string, s: OrderStatus) => void;
  deleteOrder: (id: string) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  isAdmin: boolean;
  login: (pass: string) => boolean;
  logout: () => void;
  online: boolean;
};

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => load("egydent_products", DEFAULT_PRODUCTS));
  const [orders, setOrders] = useState<Order[]>(() => load("egydent_orders", []));
  const [settings, setSettings] = useState<Settings>(() => load("egydent_settings", DEFAULT_SETTINGS));
  const [isAdmin, setIsAdmin] = useState<boolean>(() => sessionStorage.getItem("egydent_admin") === "1");

  /* ---- live sync with Firestore when configured ---- */
  useEffect(() => {
    if (!db) return;

    const unsubProducts = onSnapshot(
      query(pCol(), orderBy("id", "asc")),
      (snap) => {
        if (snap.empty) {
          void seedDatabase();
          return;
        }
        setProducts(snap.docs.map((d) => d.data() as Product));
      },
      (e) => console.error("products sync:", e),
    );

    const unsubOrders = onSnapshot(
      query(oCol(), orderBy("date", "desc")),
      (snap) => setOrders(snap.docs.map((d) => d.data() as Order)),
      (e) => console.error("orders sync:", e),
    );

    const unsubSettings = onSnapshot(
      sRef(),
      (snap) => {
        if (snap.exists()) setSettings(snap.data() as Settings);
        else void setDoc(sRef(), DEFAULT_SETTINGS);
      },
      (e) => console.error("settings sync:", e),
    );

    return () => {
      unsubProducts();
      unsubOrders();
      unsubSettings();
    };
  }, []);

  /* ---- local cache fallback ---- */
  useEffect(() => save("egydent_products", products), [products]);
  useEffect(() => save("egydent_orders", orders), [orders]);
  useEffect(() => save("egydent_settings", settings), [settings]);

  const value = useMemo<StoreCtx>(
    () => ({
      products,
      orders,
      settings,
      isAdmin,
      online: Boolean(db),
      addProduct: (p) => {
        const np = { ...p, id: Date.now() };
        if (db) void setDoc(pRef(np.id), np);
        else setProducts((prev) => [np, ...prev]);
      },
      updateProduct: (id, patch) => {
        if (db) void updateDoc(pRef(id), patch);
        else setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      },
      deleteProduct: (id) => {
        if (db) void deleteDoc(pRef(id));
        else setProducts((prev) => prev.filter((x) => x.id !== id));
      },
      resetProducts: () => {
        if (db) {
          void (async () => {
            const snap = await getDocs(pCol());
            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
            await Promise.all(DEFAULT_PRODUCTS.map((p) => setDoc(pRef(p.id), p)));
          })();
        } else {
          setProducts(DEFAULT_PRODUCTS);
        }
      },
      addOrder: (o) => {
        if (db) void setDoc(oRef(o.id), o);
        else setOrders((prev) => [o, ...prev]);
      },
      setOrderStatus: (id, s) => {
        if (db) void updateDoc(oRef(id), { status: s });
        else setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: s } : o)));
      },
      deleteOrder: (id) => {
        if (db) void deleteDoc(oRef(id));
        else setOrders((prev) => prev.filter((o) => o.id !== id));
      },
      updateSettings: (patch) => {
        if (db) void setDoc(sRef(), { ...settings, ...patch }, { merge: true });
        else setSettings((prev) => ({ ...prev, ...patch }));
      },
      login: (pass) => {
        if (pass === ADMIN_PASS) {
          setIsAdmin(true);
          sessionStorage.setItem("egydent_admin", "1");
          return true;
        }
        return false;
      },
      logout: () => {
        setIsAdmin(false);
        sessionStorage.removeItem("egydent_admin");
      },
    }),
    [products, orders, settings, isAdmin],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
