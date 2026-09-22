import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove } from "firebase/database";

// إعدادات Firebase - بيانات مشروعك الحقيقية
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

interface Product {
  id?: string;
  name: string;
  imageUrl?: string;
  price?: number;
  category?: string;
}

interface PaymentSettings {
  vodafone: string;
  instapay: string;
  orange: string;
  etisalat: string;
  email: string;
  whatsapp: string;
}

// ترتيب الفئات كما هي في قائمة الأسعار
const CATEGORY_ORDER = [
  "أنواع الجوانتي",
  "رابر بيز عادي",
  "رابر بيز ادشن سيليكون",
  "كمبوزيت",
  "الجينيت",
  "انسترومنت بكستاني"
];

const UNCATEGORIZED = "أخرى";

// كتالوج الأصناف والأسعار الجاهز (من قائمة المستخدم) لاستيراده بزرار واحد
const DEFAULT_CATALOG: { name: string; category: string; price: number }[] = [
  // أنواع الجوانتي
  { name: "لاتكس ابيض ماليزي", category: "أنواع الجوانتي", price: 165 },
  { name: "نتيرايل ازرق فيت برو", category: "أنواع الجوانتي", price: 160 },
  { name: "نترايل ازرق سوبر كير", category: "أنواع الجوانتي", price: 160 },
  { name: "نترايل اسود فيت برو", category: "أنواع الجوانتي", price: 170 },
  { name: "ماسك مصري", category: "أنواع الجوانتي", price: 50 },
  { name: "ماسك صيني", category: "أنواع الجوانتي", price: 65 },
  { name: "ماسك صيني ابيك ازرق", category: "أنواع الجوانتي", price: 120 },
  { name: "ماسك صيني ابيك اسود", category: "أنواع الجوانتي", price: 140 },
  // رابر بيز عادي
  { name: "زيتا بلس كبير", category: "رابر بيز عادي", price: 1980 },
  { name: "سيلكسيل كبير", category: "رابر بيز عادي", price: 1900 },
  { name: "زيتا بلس صغير", category: "رابر بيز عادي", price: 800 },
  { name: "لايت زرماخ برتقالي", category: "رابر بيز عادي", price: 550 },
  { name: "كتاليست زرماخ", category: "رابر بيز عادي", price: 520 },
  { name: "لايت سيلكسيل", category: "رابر بيز عادي", price: 520 },
  { name: "كتاليست", category: "رابر بيز عادي", price: 490 },
  // رابر بيز ادشن سيليكون
  { name: "كيت elite HD", category: "رابر بيز ادشن سيليكون", price: 2980 },
  { name: "كيت كروموبان", category: "رابر بيز ادشن سيليكون", price: 2800 },
  { name: "كيت هندي", category: "رابر بيز ادشن سيليكون", price: 2500 },
  { name: "كيت هان", category: "رابر بيز ادشن سيليكون", price: 1650 },
  { name: "لايت ادشن زرماخ", category: "رابر بيز ادشن سيليكون", price: 650 },
  { name: "كيت ادشن صغير كروموبان", category: "رابر بيز ادشن سيليكون", price: 1400 },
  // كمبوزيت
  { name: "روبي", category: "كمبوزيت", price: 180 },
  { name: "برايم", category: "كمبوزيت", price: 200 },
  { name: "ميتا", category: "كمبوزيت", price: 280 },
  { name: "شارم", category: "كمبوزيت", price: 285 },
  { name: "هندي", category: "كمبوزيت", price: 350 },
  { name: "برازيلي", category: "كمبوزيت", price: 350 },
  { name: "نوفا", category: "كمبوزيت", price: 500 },
  { name: "دي فيل", category: "كمبوزيت", price: 500 },
  { name: "افوكلار تيكونوم", category: "كمبوزيت", price: 550 },
  { name: "كير", category: "كمبوزيت", price: 600 },
  { name: "بروميدكا", category: "كمبوزيت", price: 670 },
  { name: "كيفكس", category: "كمبوزيت", price: 650 },
  { name: "زركون فيل", category: "كمبوزيت", price: 650 },
  { name: "زد فيل", category: "كمبوزيت", price: 800 },
  { name: "ايتينا", category: "كمبوزيت", price: 800 },
  { name: "شوفو عادي", category: "كمبوزيت", price: 950 },
  { name: "شوفو LS", category: "كمبوزيت", price: 1200 },
  { name: "شوفو A1", category: "كمبوزيت", price: 1500 },
  { name: "دنت سبلاي", category: "كمبوزيت", price: 1250 },
  { name: "جي سي", category: "كمبوزيت", price: 1650 },
  { name: "تكوياما", category: "كمبوزيت", price: 950 },
  { name: "تكوياما اومنيكروما", category: "كمبوزيت", price: 1600 },
  { name: "سوبرا فوكو", category: "كمبوزيت", price: 800 },
  { name: "بولو فيل فوكو", category: "كمبوزيت", price: 980 },
  { name: "اكسترا فيل", category: "كمبوزيت", price: 1750 },
  { name: "جراندو فوكو", category: "كمبوزيت", price: 2050 },
  // الجينيت
  { name: "صيني", category: "الجينيت", price: 170 },
  { name: "كروموبان", category: "الجينيت", price: 250 },
  { name: "IQ", category: "الجينيت", price: 260 },
  { name: "زيتالجين", category: "الجينيت", price: 270 },
  { name: "تروبيكال جين", category: "الجينيت", price: 425 },
  { name: "كيفيكس", category: "الجينيت", price: 460 },
  { name: "هيدروجم فايف", category: "الجينيت", price: 485 },
  // انسترومنت بكستاني
  { name: "بروب", category: "انسترومنت بكستاني", price: 30 },
  { name: "برودنتال بروب", category: "انسترومنت بكستاني", price: 30 },
  { name: "تويزر عادي", category: "انسترومنت بكستاني", price: 50 },
  { name: "تويزر لوك", category: "انسترومنت بكستاني", price: 60 },
  { name: "اكسكافيتور", category: "انسترومنت بكستاني", price: 30 },
  { name: "مقص", category: "انسترومنت بكستاني", price: 50 },
  { name: "كوندنسر", category: "انسترومنت بكستاني", price: 30 },
  { name: "سمنت اسباتولا", category: "انسترومنت بكستاني", price: 30 },
  { name: "املجم كارير", category: "انسترومنت بكستاني", price: 100 },
  { name: "واكس نايف", category: "انسترومنت بكستاني", price: 30 },
  { name: "واكس كارفر", category: "انسترومنت بكستاني", price: 30 },
  { name: "يد مشرط", category: "انسترومنت بكستاني", price: 40 },
  { name: "يد مرايا", category: "انسترومنت بكستاني", price: 20 },
  { name: "مرايا", category: "انسترومنت بكستاني", price: 15 },
  { name: "اناتوميكال كارفر", category: "انسترومنت بكستاني", price: 30 },
  { name: "اناتوميكال برنشر", category: "انسترومنت بكستاني", price: 30 },
  { name: "بول برنشر", category: "انسترومنت بكستاني", price: 30 },
  { name: "بلاستك فيلينج", category: "انسترومنت بكستاني", price: 30 },
  { name: "كارفر", category: "انسترومنت بكستاني", price: 30 },
  { name: "تيشو فورسبس", category: "انسترومنت بكستاني", price: 85 },
  { name: "رافع لثه", category: "انسترومنت بكستاني", price: 100 },
  { name: "بون فايل", category: "انسترومنت بكستاني", price: 100 },
  { name: "بون كيوريت", category: "انسترومنت بكستاني", price: 100 },
  { name: "كيوريت", category: "انسترومنت بكستاني", price: 30 },
  { name: "اسكلر", category: "انسترومنت بكستاني", price: 30 },
  { name: "متركس هولدر", category: "انسترومنت بكستاني", price: 85 },
  { name: "متركس هولدر عقرب", category: "انسترومنت بكستاني", price: 100 },
  { name: "نيدل هولدر", category: "انسترومنت بكستاني", price: 120 }
];

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    vodafone: "",
    instapay: "",
    orange: "",
    etisalat: "",
    email: "",
    whatsapp: ""
  });
  const [newProduct, setNewProduct] = useState({ name: "", imageUrl: "", price: "", category: "" });

  useEffect(() => {
    // تحميل المنتجات من Firebase
    const productsRef = ref(db, "products");
    const unsubscribe = onValue(
      productsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const productsArray = Object.entries(data).map(([id, value]) => ({
            id,
            ...(value as Omit<Product, "id">)
          }));
          setProducts(productsArray);
        } else {
          setProducts([]);
        }
        setLoading(false);
      },
      (error) => {
        // لو فيه خطأ في الاتصال أو صلاحيات فايربيز هيظهر هنا في الكونسول
        console.error("خطأ في تحميل المنتجات:", error);
        setLoading(false);
      }
    );

    // تحميل إعدادات الدفع
    const settingsRef = ref(db, "settings/payment");
    onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setPaymentSettings(snapshot.val());
      }
    });

    return () => unsubscribe();
  }, []);

  // إضافة منتج
  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;
    try {
      const productsRef = ref(db, "products");
      await push(productsRef, {
        name: newProduct.name,
        imageUrl: newProduct.imageUrl || "",
        price: newProduct.price ? Number(newProduct.price) : 0,
        category: newProduct.category || UNCATEGORIZED
      });
      setNewProduct({ name: "", imageUrl: "", price: "", category: "" });
      setShowAddModal(false);
      alert("تمت إضافة المنتج بنجاح!");
    } catch (error) {
      console.error("خطأ في إضافة المنتج:", error);
      alert("حدث خطأ أثناء إضافة المنتج.");
    }
  };

  // حذف منتج
  const deleteProduct = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      const productRef = ref(db, `products/${id}`);
      await remove(productRef);
      alert("تم حذف المنتج بنجاح!");
    } catch (error) {
      console.error("خطأ في حذف المنتج:", error);
      alert("حدث خطأ أثناء حذف المنتج.");
    }
  };

  // استيراد كل أصناف قائمة الأسعار الجاهزة دفعة واحدة (بيتجاهل أي صنف موجود بنفس الاسم بالفعل)
  const bulkImportCatalog = async () => {
    const existingNames = new Set(products.map((p) => p.name.trim()));
    const toAdd = DEFAULT_CATALOG.filter((item) => !existingNames.has(item.name.trim()));

    if (toAdd.length === 0) {
      alert("كل الأصناف دي مضافة بالفعل.");
      return;
    }

    if (!confirm(`هيتم إضافة ${toAdd.length} صنف جديد من القائمة الجاهزة. تكمل؟`)) return;

    setImporting(true);
    try {
      const productsRef = ref(db, "products");
      for (const item of toAdd) {
        await push(productsRef, {
          name: item.name,
          imageUrl: "",
          price: item.price,
          category: item.category
        });
      }
      alert(`تم استيراد ${toAdd.length} صنف بنجاح!`);
    } catch (error) {
      console.error("خطأ في الاستيراد:", error);
      alert("حدث خطأ أثناء الاستيراد. راجع الكونسول لمعرفة التفاصيل.");
    } finally {
      setImporting(false);
    }
  };

  // حفظ إعدادات الدفع
  const savePaymentSettings = async () => {
    try {
      const settingsRef = ref(db, "settings/payment");
      await set(settingsRef, paymentSettings);
      alert("تم حفظ إعدادات الدفع بنجاح!");
      setShowPaymentSettings(false);
    } catch (error) {
      console.error("خطأ في حفظ الإعدادات:", error);
      alert("حدث خطأ أثناء حفظ الإعدادات.");
    }
  };

  // فتح نافذة الدفع
  const openPaymentModal = (product: Product) => {
    setSelectedProduct(product);
    setShowPaymentModal(true);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // تجميع المنتجات حسب الفئة، مع الحفاظ على ترتيب الفئات المعروف ثم أي فئات إضافية
  const groupedProducts = (() => {
    const groups = new Map<string, Product[]>();
    for (const p of filteredProducts) {
      const cat = p.category || UNCATEGORIZED;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    const orderedKeys = [
      ...CATEGORY_ORDER.filter((c) => groups.has(c)),
      ...Array.from(groups.keys()).filter((c) => !CATEGORY_ORDER.includes(c))
    ];
    return orderedKeys.map((cat) => ({ category: cat, items: groups.get(cat)! }));
  })();

  const allCategories = Array.from(new Set([...CATEGORY_ORDER, ...products.map((p) => p.category || UNCATEGORIZED)]));

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-line-1 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="h-8 w-8">
                <rect width="64" height="64" rx="16" fill="#06b6d4" />
                <path
                  fill="#04060d"
                  d="M32 12c-8.8 0-15 6.2-15 14 0 4.2 1.6 7.6 3 10.4 1.2 2.4 2 4.8 2.4 7.8.3 2.4 2 4.4 4.2 4.4 1.9 0 3.4-1.4 3.8-3.3l1.6-6.6 1.6 6.6c.4 1.9 1.9 3.3 3.8 3.3 2.2 0 3.9-2 4.2-4.4.4-3 1.2-5.4 2.4-7.8 1.4-2.8 3-6.2 3-10.4 0-7.8-6.2-14-15-14Z"
                />
              </svg>
              <span className="text-xl font-bold text-volt-500">إيجي دنت</span>
            </div>
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className="rounded-lg border border-line-3 px-4 py-2 text-sm font-medium text-frost-300 hover:bg-fill-3 hover:text-white transition-colors"
            >
              {showAdmin ? "عرض المتجر" : "لوحة التحكم"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-volt-500"></div>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-8">
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md mx-auto block rounded-xl border border-line-3 bg-ink-900 px-4 py-3 text-white placeholder:text-frost-500 focus:border-volt-500 focus:outline-none"
              />
            </div>

            {/* Products Grid grouped by category */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-frost-400 text-lg">لا توجد منتجات حالياً</p>
              </div>
            ) : (
              <div className="space-y-12">
                {groupedProducts.map(({ category, items }) => (
                  <section key={category}>
                    <h2 className="text-xl font-bold text-volt-500 mb-4 border-b border-line-2 pb-2">
                      {category}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {items.map((product) => (
                        <div
                          key={product.id}
                          className="group relative rounded-2xl border border-line-2 bg-ink-900 overflow-hidden hover:border-volt-500/50 transition-colors"
                        >
                          <div className="aspect-square overflow-hidden bg-ink-800 flex items-center justify-center">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <span className="text-4xl font-bold text-frost-600">
                                {product.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-semibold text-white mb-1">{product.name}</h3>
                            {typeof product.price === "number" && product.price > 0 && (
                              <p className="text-volt-400 font-bold mb-3">{product.price} ج.م</p>
                            )}
                            <button
                              onClick={() => openPaymentModal(product)}
                              className="w-full rounded-lg bg-volt-600 py-2.5 text-sm font-bold text-ink-950 hover:bg-volt-500 transition-colors"
                            >
                              اطلب الآن
                            </button>
                          </div>
                          {showAdmin && (
                            <button
                              onClick={() => deleteProduct(product.id!)}
                              className="absolute top-2 right-2 rounded-lg bg-red-500 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* Admin Panel */}
            {showAdmin && (
              <div className="mt-12 border-t border-line-2 pt-8">
                <h2 className="text-2xl font-bold text-white mb-6">لوحة التحكم</h2>

                {/* Admin Actions */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="rounded-lg bg-volt-600 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-volt-500 transition-colors"
                  >
                    إضافة منتج
                  </button>
                  <button
                    onClick={bulkImportCatalog}
                    disabled={importing}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    {importing ? "جاري الاستيراد..." : "استيراد قائمة الأصناف الجاهزة"}
                  </button>
                  <button
                    onClick={() => setShowPaymentSettings(true)}
                    className="rounded-lg border border-line-3 px-4 py-2 text-sm font-medium text-frost-300 hover:bg-fill-3 transition-colors"
                  >
                    إعدادات الدفع
                  </button>
                </div>

                {/* Products List */}
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-xl border border-line-2 bg-ink-900 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-ink-800 flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-frost-600 font-bold">{product.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-white block">{product.name}</span>
                          <span className="text-xs text-frost-400">
                            {product.category || UNCATEGORIZED}
                            {typeof product.price === "number" && product.price > 0 && ` · ${product.price} ج.م`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteProduct(product.id!)}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl bg-ink-900 p-6 border border-line-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">إضافة منتج جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="text-frost-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={addProduct} className="space-y-4">
              <div>
                <label className="block text-sm text-frost-300 mb-1">اسم المنتج</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-frost-300 mb-1">الفئة</label>
                <input
                  type="text"
                  list="category-options"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  placeholder="مثال: كمبوزيت"
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
                <datalist id="category-options">
                  {allCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-frost-300 mb-1">السعر (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-frost-300 mb-1">رابط الصورة (اختياري)</label>
                <input
                  type="text"
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-volt-600 py-3 font-bold text-ink-950 hover:bg-volt-500 transition-colors"
              >
                إضافة المنتج
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Settings Modal */}
      {showPaymentSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-ink-900 p-6 border border-line-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">إعدادات طرق الدفع</h3>
              <button onClick={() => setShowPaymentSettings(false)} className="text-frost-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-frost-300 mb-1">رقم فودافون كاش</label>
                <input
                  type="text"
                  value={paymentSettings.vodafone}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, vodafone: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-frost-300 mb-1">رقم انستا باي</label>
                <input
                  type="text"
                  value={paymentSettings.instapay}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, instapay: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-frost-300 mb-1">رقم اورنج كاش</label>
                <input
                  type="text"
                  value={paymentSettings.orange}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, orange: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-frost-300 mb-1">رقم اتصالات كاش</label>
                <input
                  type="text"
                  value={paymentSettings.etisalat}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, etisalat: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-frost-300 mb-1">بريد إلكتروني</label>
                <input
                  type="email"
                  value={paymentSettings.email}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, email: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-frost-300 mb-1">رقم واتساب</label>
                <input
                  type="text"
                  value={paymentSettings.whatsapp}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, whatsapp: e.target.value })}
                  className="w-full rounded-lg border border-line-3 bg-ink-950 px-4 py-2.5 text-white focus:border-volt-500 focus:outline-none"
                />
              </div>
              <button
                onClick={savePaymentSettings}
                className="w-full rounded-lg bg-volt-600 py-3 font-bold text-ink-950 hover:bg-volt-500 transition-colors"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl bg-ink-900 p-6 border border-line-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">طرق الدفع</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-frost-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="mb-6">
              <h4 className="text-sm text-frost-400 mb-1">المنتج المطلوب:</h4>
              <p className="text-white font-semibold">{selectedProduct.name}</p>
              {typeof selectedProduct.price === "number" && selectedProduct.price > 0 && (
                <p className="text-volt-400 font-bold mt-1">{selectedProduct.price} ج.م</p>
              )}
            </div>
            <div className="space-y-3">
              {paymentSettings.vodafone && (
                <div className="rounded-lg border border-line-3 p-3">
                  <p className="text-sm font-medium text-frost-300">فودافون كاش</p>
                  <p className="text-lg font-bold text-white mt-1" dir="ltr">
                    {paymentSettings.vodafone}
                  </p>
                </div>
              )}
              {paymentSettings.instapay && (
                <div className="rounded-lg border border-line-3 p-3">
                  <p className="text-sm font-medium text-frost-300">انستا باي</p>
                  <p className="text-lg font-bold text-white mt-1" dir="ltr">
                    {paymentSettings.instapay}
                  </p>
                </div>
              )}
              {paymentSettings.orange && (
                <div className="rounded-lg border border-line-3 p-3">
                  <p className="text-sm font-medium text-frost-300">اورنج كاش</p>
                  <p className="text-lg font-bold text-white mt-1" dir="ltr">
                    {paymentSettings.orange}
                  </p>
                </div>
              )}
              {paymentSettings.etisalat && (
                <div className="rounded-lg border border-line-3 p-3">
                  <p className="text-sm font-medium text-frost-300">اتصالات كاش</p>
                  <p className="text-lg font-bold text-white mt-1" dir="ltr">
                    {paymentSettings.etisalat}
                  </p>
                </div>
              )}
              {paymentSettings.whatsapp && (
                <div className="rounded-lg border border-line-3 p-3">
                  <p className="text-sm font-medium text-frost-300">للتواصل عبر واتساب</p>
                  <p className="text-lg font-bold text-white mt-1" dir="ltr">
                    {paymentSettings.whatsapp}
                  </p>
                </div>
              )}
              {paymentSettings.email && (
                <div className="rounded-lg border border-line-3 p-3">
                  <p className="text-sm font-medium text-frost-300">البريد الإلكتروني</p>
                  <p className="text-lg font-bold text-white mt-1" dir="ltr">
                    {paymentSettings.email}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-frost-400 mt-6 text-center">
              بعد تحويل المبلغ، يرجى التواصل معنا لتأكيد الطلب
            </p>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-4 rounded-lg bg-volt-600 py-3 font-bold text-ink-950 hover:bg-volt-500 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
