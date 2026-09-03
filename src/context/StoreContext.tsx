import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove } from "firebase/database";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAIa2DzWIpc1CRXLjiYjVnYv-P0EskDXcg",
  authDomain: "egy-dent-store.firebaseapp.com",
  databaseURL: "https://egy-dent-store-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "egy-dent-store",
  storageBucket: "egy-dent-store.firebasestorage.app",
  messagingSenderId: "829834524174",
  appId: "1:829834524174:web:2362fb9d9d69cb44776e5f",
  measurementId: "G-C0FRN9599K"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// تعريف الأنواع
export interface Product {
  id?: string;
  name: string;
  imageUrl: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface PaymentSettings {
  vodafone: string;
  instapay: string;
  orange: string;
  etisalat: string;
  email: string;
  whatsapp: string;
}

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  paymentSettings: PaymentSettings;
  loading: boolean;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  savePaymentSettings: (settings: PaymentSettings) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    vodafone: "",
    instapay: "",
    orange: "",
    etisalat: "",
    email: "",
    whatsapp: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // تحميل المنتجات من Firebase
    const productsRef = ref(db, "products");
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsArray: Product[] = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<Product, "id">)
        }));
        setProducts(productsArray);
      } else {
        setProducts([]);
      }
      setLoading(false);
    });

    // تحميل إعدادات الدفع
    const settingsRef = ref(db, "settings/payment");
    onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setPaymentSettings(snapshot.val());
      }
    });

    // تحميل السلة من localStorage
    const savedCart = localStorage.getItem("egy-dent-cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        setCart([]);
      }
    }

    return () => unsubscribe();
  }, []);

  // حفظ السلة في localStorage
  useEffect(() => {
    localStorage.setItem("egy-dent-cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => 
      prev.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const addProduct = async (product: Omit<Product, "id">) => {
    const productsRef = ref(db, "products");
    await push(productsRef, product);
  };

  const deleteProduct = async (productId: string) => {
    const productRef = ref(db, `products/${productId}`);
    await remove(productRef);
  };

  const savePaymentSettings = async (settings: PaymentSettings) => {
    const settingsRef = ref(db, "settings/payment");
    await set(settingsRef, settings);
    setPaymentSettings(settings);
  };

  return (
    <StoreContext.Provider value={{
      products,
      cart,
      paymentSettings,
      loading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      addProduct,
      deleteProduct,
      savePaymentSettings
    }}>
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
