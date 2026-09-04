import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
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

/**
 * بنية جديدة: كل منتج وكل طلب مستند مستقل في collection خاص بيه،
 * بدل ما الكل كان محشور في مستند واحد (store/main).
 * ده بيمنع تعارض التعديلات لما أكتر من أدمن يشتغل في نفس الوقت،
 * وبيبعد عن حد الـ 1MB للمستند الواحد لما المنتجات تزيد لـ 400+.
 */
const PRODUCTS_COLLECTION = "products";
const ORDERS_COLLECTION = "orders";
const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOC_ID = "main";

// مسار البيانات القديمة (قبل إعادة الهيكلة) — بيتقرا مرة واحدة بس عشان النقل التلقائي
const LEGACY_COLLECTION = "store";
const LEGACY_DOC_ID = "main";

const defaultSettings: Settings = { whatsapp: DEFAULT_WHATSAPP, freeShipping: DEFAULT_FREE_SHIPPING };

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [migrated, setMigrated] = useState(false);

  /* ---------------- Auth ---------------- */
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

  /* ---------------- Live sync: products ---------------- */
  useEffect(() => {
    if (!firebaseReady || !db) {
      setLoading(false);
      setOnline(false);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db, PRODUCTS_COLLECTION),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Product).sort((a, b) => a.id - b.id);
        setProducts(list);
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

  /* ---------------- Live sync: orders ---------------- */
  useEffect(() => {
    if (!firebaseReady || !db) return;
    const unsubscribe = onSnapshot(collection(db, ORDERS_COLLECTION), (snap) => {
      const list = snap.docs.map((d) => d.data() as Order).sort((a, b) => b.date - a.date);
      setOrders(list);
    });
    return () => unsubscribe();
  }, []);

  /* ---------------- Live sync: settings ---------------- */
  useEffect(() => {
    if (!firebaseReady || !db) return;
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) setSettings(snap.data() as Settings);
    });
    return () => unsubscribe();
  }, []);

  /**
   * نقل تلقائي لمرة واحدة: لو لسه فيه بيانات قديمة في store/main
   * ومفيش حاجة اتنقلت للبنية الجديدة لسه، انقلها. بيشتغل بس لما الأدمن
   * يكون مسجل دخول لأن الكتابة محتاجة صلاحية أدمن حسب قواعد الأمان.
   */
  useEffect(() => {
    const database = db;
    if (!isAdmin || migrated || !database) return;
    (async () => {
      try {
        const legacyRef = doc(database, LEGACY_COLLECTION, LEGACY_DOC_ID);
        const legacySnap = await getDoc(legacyRef);
        if (!legacySnap.exists()) {
          setMigrated(true);
          return;
        }
        const existingProducts = await getDocs(collection(database, PRODUCTS_COLLECTION));
        if (!existingProducts.empty) {
          // البنية الجديدة عندها بيانات أصلاً — متعملش نقل تاني
          setMigrated(true);
          return;
        }

        const legacy = legacySnap.data() as {
          products?: Product[];
          orders?: Order[];
          settings?: Settings;
        };

        const batch = writeBatch(database);
        (legacy.products ?? []).forEach((p) => {
          batch.set(doc(database, PRODUCTS_COLLECTION, String(p.id)), p);
        });
        (legacy.orders ?? []).forEach((o) => {
          batch.set(doc(database, ORDERS_COLLECTION, o.id), o);
        });
        if (legacy.settings) {
          batch.set(doc(database, SETTINGS_COLLECTION, SETTINGS_DOC_ID), legacy.settings);
        }
        await batch.commit();
        console.info(
          `تم نقل ${legacy.products?.length ?? 0} منتج و${legacy.orders?.length ?? 0} طلب للبنية الجديدة بنجاح.`,
        );
        setMigrated(true);
      } catch (err) {
        console.error("فشل النقل التلقائي للبيانات القديمة:", err);
      }
    })();
  }, [isAdmin, migrated]);

  /* ---------------- Auth actions ---------------- */

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

  /* ---------------- Products ---------------- */

  const reportError = (context: string, err: unknown) => {
    console.error(context, err);
    alert("حصل خطأ أثناء حفظ البيانات على قاعدة البيانات — حاول تاني.");
  };

  const nextProductId = () => (products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1);

  const addProduct = async (product: Omit<Product, "id">) => {
    const database = db;
    if (!database) return;
    const newProduct: Product = { ...product, id: nextProductId() };
    try {
      await setDoc(doc(database, PRODUCTS_COLLECTION, String(newProduct.id)), newProduct);
    } catch (err) {
      reportError("فشل إضافة المنتج:", err);
    }
  };

  const updateProduct = async (id: number, product: Omit<Product, "id">) => {
    const database = db;
    if (!database) return;
    try {
      await setDoc(doc(database, PRODUCTS_COLLECTION, String(id)), { ...product, id });
    } catch (err) {
      reportError("فشل تعديل المنتج:", err);
    }
  };

  const deleteProduct = async (id: number) => {
    const database = db;
    if (!database) return;
    try {
      await deleteDoc(doc(database, PRODUCTS_COLLECTION, String(id)));
    } catch (err) {
      reportError("فشل حذف المنتج:", err);
    }
  };

  const importProducts = async (newProducts: Omit<Product, "id">[]) => {
    const database = db;
    if (!database) return;
    try {
      let nextId = nextProductId();
      // Firestore بيسمح بـ 500 عملية كحد أقصى في الـ batch الواحدة
      for (let i = 0; i < newProducts.length; i += 450) {
        const chunk = newProducts.slice(i, i + 450);
        const batch = writeBatch(database);
        chunk.forEach((p) => {
          const full: Product = { ...p, id: nextId++ };
          batch.set(doc(database, PRODUCTS_COLLECTION, String(full.id)), full);
        });
        await batch.commit();
      }
    } catch (err) {
      reportError("فشل استيراد المنتجات:", err);
    }
  };

  const resetProducts = async () => {
    const database = db;
    if (!database) return;
    try {
      const existing = await getDocs(collection(database, PRODUCTS_COLLECTION));
      const deleteBatch = writeBatch(database);
      existing.docs.forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();

      const addBatch = writeBatch(database);
      DEFAULT_PRODUCTS.forEach((p) => {
        addBatch.set(doc(database, PRODUCTS_COLLECTION, String(p.id)), p);
      });
      await addBatch.commit();
    } catch (err) {
      reportError("فشل إعادة تعيين المنتجات:", err);
    }
  };

  /* ---------------- Orders ---------------- */

  const addOrder = async (order: Order) => {
    const database = db;
    if (!database) return;
    try {
      await setDoc(doc(database, ORDERS_COLLECTION, order.id), order);
    } catch (err) {
      reportError("فشل حفظ الطلب:", err);
    }
  };

  const setOrderStatus = async (id: string, status: OrderStatus) => {
    const database = db;
    if (!database) return;
    try {
      const existing = orders.find((o) => o.id === id);
      if (!existing) return;
      await setDoc(doc(database, ORDERS_COLLECTION, id), { ...existing, status });
    } catch (err) {
      reportError("فشل تحديث حالة الطلب:", err);
    }
  };

  const deleteOrder = async (id: string) => {
    const database = db;
    if (!database) return;
    try {
      await deleteDoc(doc(database, ORDERS_COLLECTION, id));
    } catch (err) {
      reportError("فشل حذف الطلب:", err);
    }
  };

  /* ---------------- Settings ---------------- */

  const updateSettings = async (partial: Partial<Settings>) => {
    const database = db;
    if (!database) return;
    try {
      await setDoc(doc(database, SETTINGS_COLLECTION, SETTINGS_DOC_ID), { ...settings, ...partial }, { merge: true });
    } catch (err) {
      reportError("فشل حفظ الإعدادات:", err);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        orders,
        settings,
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
