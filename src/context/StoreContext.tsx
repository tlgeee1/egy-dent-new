import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
} from "firebase/auth";
import { auth, db, firebaseReady } from "@/lib/firebase";
import { DEFAULT_PRODUCTS, DEFAULT_WHATSAPP, DEFAULT_FREE_SHIPPING, type Product } from "@/data/data";

/* ---------------- Types ---------------- */
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

export type Settings = {
  whatsapp: string;
  freeShipping: number;
};

interface StoreDoc {
  products: Product[];
  orders: Order[];
  settings: Settings;
}

interface StoreContextType {
  products: Product[];
  orders: Order[];
  settings: Settings;
  loading: boolean;
  online: boolean;
  isAdmin: boolean;
  authChecking: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: number, product: Omit<Product, "id">) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  importProducts: (products: Omit<Product, "id">[]) => Promise<void>;
  resetProducts: () => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  setOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
}

const STORE_COLLECTION = "store";
const STORE_DOC_ID = "main";

const defaultDoc: StoreDoc = {
  products: DEFAULT_PRODUCTS,
  orders: [],
  settings: { whatsapp: DEFAULT_WHATSAPP, freeShipping: DEFAULT_FREE_SHIPPING },
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreDoc>(defaultDoc);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    if (!auth) {
      setAuthChecking(false);
      return;
    }
    // بيتابع حالة الدخول الحقيقية من Firebase — مش باسورد محفوظ محليًا
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseReady || !db) {
      setLoading(false);
      setOnline(false);
      return;
    }

    const ref = doc(db, STORE_COLLECTION, STORE_DOC_ID);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data() as Partial<StoreDoc>;
          setData({
            products: remote.products ?? DEFAULT_PRODUCTS,
            orders: remote.orders ?? [],
            settings: remote.settings ?? defaultDoc.settings,
          });
        } else {
          // أول مرة — ابدأ بالبيانات الافتراضية وسجّلها على Firestore
          setDoc(ref, defaultDoc).catch(() => {
            /* ignore */
          });
          setData(defaultDoc);
        }
        setOnline(true);
        setLoading(false);
      },
      () => {
        setOnline(false);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const persist = async (next: StoreDoc) => {
    setData(next);
    if (firebaseReady && db) {
      const ref = doc(db, STORE_COLLECTION, STORE_DOC_ID);
      try {
        await setDoc(ref, next, { merge: true });
      } catch (err) {
        console.error("فشل حفظ البيانات على قاعدة البيانات:", err);
        alert("حصل خطأ أثناء حفظ البيانات على قاعدة البيانات — التعديل هيفضل شكله ظاهر بس هيختفي لو عملت Refresh. حاول تاني.");
      }
    }
  };

  /** يرجّع null لو الدخول نجح، أو رسالة خطأ بالعربي لو فشل */
  const login = async (email: string, password: string): Promise<string | null> => {
    if (!auth) return "الاتصال بقاعدة البيانات مش شغال دلوقتي — حاول تاني بعد شوية";
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return null;
    } catch (err) {
      const code = (err as AuthError).code;
      if (code === "auth/invalid-email") return "الإيميل غير صحيح";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/wrong-password") {
        return "الإيميل أو كلمة المرور غير صحيحة";
      }
      if (code === "auth/too-many-requests") return "محاولات كتير غلط — حاول تاني بعد شوية";
      return "حصل خطأ أثناء تسجيل الدخول";
    }
  };

  const logout = () => {
    if (auth) signOut(auth);
  };

  const nextProductId = (products: Product[]) => (products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1);

  const addProduct = async (product: Omit<Product, "id">) => {
    const newProduct: Product = { ...product, id: nextProductId(data.products) };
    await persist({ ...data, products: [...data.products, newProduct] });
  };

  const updateProduct = async (id: number, product: Omit<Product, "id">) => {
    await persist({
      ...data,
      products: data.products.map((p) => (p.id === id ? { ...product, id } : p)),
    });
  };

  const deleteProduct = async (id: number) => {
    await persist({ ...data, products: data.products.filter((p) => p.id !== id) });
  };

  const importProducts = async (products: Omit<Product, "id">[]) => {
    let nextId = nextProductId(data.products);
    const added = products.map((p) => ({ ...p, id: nextId++ }));
    await persist({ ...data, products: [...data.products, ...added] });
  };

  const resetProducts = async () => {
    await persist({ ...data, products: DEFAULT_PRODUCTS });
  };

  const addOrder = async (order: Order) => {
    await persist({ ...data, orders: [order, ...data.orders] });
  };

  const setOrderStatus = async (id: string, status: OrderStatus) => {
    await persist({
      ...data,
      orders: data.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    });
  };

  const deleteOrder = async (id: string) => {
    await persist({ ...data, orders: data.orders.filter((o) => o.id !== id) });
  };

  const updateSettings = async (settings: Partial<Settings>) => {
    await persist({ ...data, settings: { ...data.settings, ...settings } });
  };

  return (
    <StoreContext.Provider
      value={{
        products: data.products,
        orders: data.orders,
        settings: data.settings,
        loading,
        online,
        isAdmin,
        authChecking,
        login,
        logout,
        addProduct,
        updateProduct,
        deleteProduct,
        importProducts,
        resetProducts,
        addOrder,
        setOrderStatus,
        deleteOrder,
        updateSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
