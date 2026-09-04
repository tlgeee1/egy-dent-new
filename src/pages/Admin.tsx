import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  BadgeCheck,
  Download,
  Eye,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Package,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { useStore, type Order, type OrderStatus } from "@/context/StoreContext";
import { catName, categories, fmt, IMAGE_CHOICES, normalizeImportedProduct, relTime, type Product } from "@/data/data";
import { ThemeToggle, ToothMark } from "@/components/ui";
import { cn } from "@/utils/cn";

type Tab = "overview" | "products" | "orders" | "settings";

const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "products", label: "المنتجات", icon: Package },
  { id: "orders", label: "الطلبات", icon: ShoppingBag },
  { id: "settings", label: "الإعدادات", icon: SettingsIcon },
];

const statusStyle: Record<OrderStatus, string> = {
  جديد: "border-gold-500/40 bg-gold-500/10 text-gold-300",
  مؤكد: "border-volt-500/40 bg-volt-500/10 text-volt-300",
  "تم الشحن": "border-indigo-400/40 bg-indigo-400/10 text-indigo-300",
  مكتمل: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
};

/* ---------------- Login ---------------- */
function Login() {
  const { login } = useStore();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const error = await login(email, pass);
    setBusy(false);
    if (error) {
      setErr(error);
      setShake((s) => s + 1);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 p-4">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 mask-fade-y" />
      <motion.form
        key={shake}
        onSubmit={submit}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, x: shake ? [0, -8, 8, -6, 6, 0] : 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm rounded-[2rem] border border-[var(--line-3)] bg-ink-900 p-8 text-center shadow-2xl"
      >
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-700 shadow-[0_12px_32px_rgba(34,211,238,0.35)]">
          <ToothMark className="size-9 text-[var(--onaccent)]" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-black">لوحة تحكم إيجي دنت</h1>
        <p className="mt-1 text-xs text-frost-500">منطقة خاصة بإدارة المتجر</p>

        <div className="relative mt-6">
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErr(null);
            }}
            placeholder="الإيميل"
            dir="ltr"
            className={cn(
              "w-full rounded-2xl border bg-ink-950/70 py-3.5 px-4 text-sm outline-none transition-colors placeholder:text-frost-500/70",
              err ? "border-red-400/60" : "border-[var(--line-3)] focus:border-volt-500/60",
            )}
          />
        </div>
        <div className="relative mt-3">
          <Lock className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-frost-500" />
          <input
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setErr(null);
            }}
            placeholder="كلمة المرور"
            className={cn(
              "w-full rounded-2xl border bg-ink-950/70 py-3.5 pl-4 pr-11 text-sm outline-none transition-colors placeholder:text-frost-500/70",
              err ? "border-red-400/60" : "border-[var(--line-3)] focus:border-volt-500/60",
            )}
          />
        </div>
        {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
        <button
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 py-3.5 font-display font-black text-[var(--onaccent)] transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          دخول
        </button>
        <a href="#" className="mt-4 inline-block text-xs font-bold text-frost-400 transition-colors hover:text-volt-300">
          العودة للمتجر
        </a>
      </motion.form>
    </div>
  );
}

/* ---------------- Product form modal ---------------- */
type Draft = Omit<Product, "id">;

const emptyDraft: Draft = {
  name: "",
  cat: "equipment",
  price: 0,
  oldPrice: undefined,
  rating: 4.8,
  sold: 0,
  img: IMAGE_CHOICES[0],
  badge: "",
  desc: "",
};

function ProductForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Draft;
  onClose: () => void;
  onSave: (d: Draft) => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // يسمح برفع نفس الملف تاني لو احتاج
    if (!file) return;
    if (!storage) {
      setErr("رفع الصور مش متاح دلوقتي — تأكد إن Firebase مربوط صح");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErr("اختار ملف صورة صحيح (jpg, png, webp...)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("حجم الصورة كبير أوي — أقصى حد 5 ميجا");
      return;
    }
    setUploading(true);
    setErr("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const path = `products/${Date.now()}-${safeName}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setD((prev) => ({ ...prev, img: url }));
    } catch {
      setErr("فشل رفع الصورة — حاول تاني");
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    if (d.name.trim().length < 3) return setErr("اكتب اسم المنتج");
    if (!d.price || d.price <= 0) return setErr("اكتب سعر صحيح");
    onSave({ ...d, badge: d.badge?.trim() ? d.badge : undefined, oldPrice: d.oldPrice && d.oldPrice > 0 ? d.oldPrice : undefined });
  };

  const field = "w-full rounded-2xl border border-[var(--line-3)] bg-ink-950/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-frost-500/70 focus:border-volt-500/60";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative my-6 w-full max-w-2xl rounded-[2rem] border border-[var(--line-3)] bg-ink-900 p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-black">{initial.name ? "تعديل منتج" : "إضافة منتج جديد"}</h3>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-[var(--line-3)] text-frost-400 hover:bg-[var(--fill-4)]">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-frost-400">اسم المنتج *</label>
            <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={field} placeholder="مثال: توربين سرعة فائقة" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-frost-400">الفئة</label>
            <select value={d.cat} onChange={(e) => setD({ ...d, cat: e.target.value })} className={cn(field, "appearance-none")}>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-ink-900">{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-frost-400">شارة مميزة (اختياري)</label>
            <input value={d.badge ?? ""} onChange={(e) => setD({ ...d, badge: e.target.value })} className={field} placeholder="جديد / الأكثر مبيعاً" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-frost-400">السعر (جنيه) *</label>
            <input type="number" min={0} value={d.price || ""} onChange={(e) => setD({ ...d, price: Number(e.target.value) })} className={field} placeholder="4500" dir="ltr" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-frost-400">السعر قبل الخصم</label>
            <input type="number" min={0} value={d.oldPrice ?? ""} onChange={(e) => setD({ ...d, oldPrice: e.target.value ? Number(e.target.value) : undefined })} className={field} placeholder="6000" dir="ltr" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-frost-400">الوصف</label>
            <textarea value={d.desc ?? ""} onChange={(e) => setD({ ...d, desc: e.target.value })} rows={2} className={cn(field, "resize-none")} placeholder="مواصفات المنتج..." />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-frost-400">صورة المنتج</label>
            <div className="flex items-center gap-4">
              <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-[var(--line-3)] bg-ink-950/60">
                {d.img ? (
                  <img src={d.img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="size-6 text-frost-500" />
                )}
                {uploading && (
                  <span className="absolute inset-0 grid place-items-center bg-ink-950/70">
                    <Loader2 className="size-6 animate-spin text-volt-400" />
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line-3)] px-4 py-2.5 text-xs font-bold text-frost-300 transition-colors hover:border-volt-500/50 hover:text-volt-300 disabled:opacity-60"
                >
                  <Upload className="size-4" />
                  {uploading ? "جارِ الرفع..." : "ارفع صورة من جهازك"}
                </button>
                <p className="text-[11px] text-frost-500">JPG أو PNG أو WEBP — لحد 5 ميجا</p>
              </div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-bold text-frost-400 hover:text-volt-300">أو اختار صورة جاهزة بدل الرفع</summary>
              <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-9">
                {IMAGE_CHOICES.map((img) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setD({ ...d, img })}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-xl border-2 transition-all",
                      d.img === img ? "border-volt-400 ring-2 ring-volt-400/30" : "border-[var(--line-3)] opacity-60 hover:opacity-100",
                    )}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    {d.img === img && (
                      <span className="absolute inset-0 grid place-items-center bg-ink-950/40">
                        <BadgeCheck className="size-5 text-volt-300" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>

        {err && <p className="mt-4 text-xs text-red-400">{err}</p>}

        <div className="mt-6 flex gap-3">
          <button onClick={save} disabled={uploading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 py-3.5 font-display font-black text-[var(--onaccent)] transition-transform hover:scale-[1.02] disabled:opacity-60">
            <Save className="size-4" />
            حفظ المنتج
          </button>
          <button onClick={onClose} className="rounded-2xl border border-[var(--line-3)] px-6 py-3.5 text-sm font-bold text-frost-300 hover:bg-[var(--fill-4)]">
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------- Main dashboard ---------------- */
export default function Admin() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState<Draft | "new" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [wa, setWa] = useState(store.settings.whatsapp);
  const [ship, setShip] = useState(String(store.settings.freeShipping));
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const revenue = useMemo(() => store.orders.reduce((s, o) => s + o.total, 0), [store.orders]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return store.products;
    return store.products.filter(
      (p) => p.name.toLowerCase().includes(q) || catName(p.cat).toLowerCase().includes(q),
    );
  }, [store.products, search]);

  const exportProducts = () => {
    const blob = new Blob([JSON.stringify(store.products, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `egydent-products-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProductsFromFile = (file: File) => {
    setImporting(true);
    setImportMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = JSON.parse(String(reader.result));
        const list = Array.isArray(raw) ? raw : [raw];
        const normalized = list
          .map((item) => normalizeImportedProduct(item as Record<string, unknown>))
          .filter((p): p is Omit<Product, "id"> => p !== null);
        if (normalized.length === 0) {
          setImportMsg("الملف ده مفيهوش منتجات صالحة للاستيراد");
        } else {
          await store.importProducts(normalized);
          setImportMsg(`تم استيراد ${normalized.length} منتج بنجاح`);
        }
      } catch {
        setImportMsg("تعذّر قراءة الملف — تأكد إنه JSON صحيح");
      } finally {
        setImporting(false);
        setTimeout(() => setImportMsg(null), 4000);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  if (store.authChecking) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950">
        <Loader2 className="size-8 animate-spin text-volt-400" />
      </div>
    );
  }

  if (!store.isAdmin) return <Login />;

  const stats = [
    { label: "عدد المنتجات", value: String(store.products.length), icon: Package, tone: "text-volt-300 bg-volt-500/10" },
    { label: "إجمالي الطلبات", value: String(store.orders.length), icon: ShoppingBag, tone: "text-gold-300 bg-gold-500/10" },
    { label: "قيمة الطلبات", value: `${fmt(revenue)} ج`, icon: Wallet, tone: "text-emerald-300 bg-emerald-400/10" },
    {
      label: "طلبات جديدة",
      value: String(store.orders.filter((o) => o.status === "جديد").length),
      icon: Loader2,
      tone: "text-indigo-300 bg-indigo-400/10",
    },
  ];

  return (
    <div className="noise min-h-screen bg-ink-950 font-sans text-[var(--text-primary)]">
      {/* header */}
      <header className="glass sticky top-0 z-40 border-b border-[var(--line-2)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
              <ToothMark className="size-5 text-[var(--onaccent)]" />
            </span>
            <div>
              <h1 className="font-display text-lg font-black leading-none">لوحة التحكم</h1>
              <p className={cn("mt-1 flex items-center gap-1.5 text-[10px] font-bold", store.online ? "text-emerald-400" : "text-frost-500")}>
                <span className={cn("size-1.5 rounded-full", store.online ? "bg-emerald-400 animate-pulse-dot" : "bg-frost-500")} />
                {store.online ? "متصل بقاعدة البيانات — مزامنة لايف" : "وضع محلي — بانتظار ربط Firebase"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <a href="#" className="flex items-center gap-2 rounded-xl border border-[var(--line-3)] px-4 py-2.5 text-xs font-bold text-frost-300 transition-colors hover:border-volt-500/40 hover:text-volt-300">
              <Eye className="size-4" />
              <span className="hidden sm:inline">عرض المتجر</span>
            </a>
            <button onClick={store.logout} className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-xs font-bold text-red-300 transition-colors hover:bg-red-400/20">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
        {/* tabs */}
        <div className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-5 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                tab === t.id ? "bg-volt-500 text-[var(--onaccent)] shadow-[0_8px_22px_rgba(34,211,238,0.35)]" : "text-frost-400 hover:bg-[var(--fill-4)] hover:text-[var(--text-primary)]",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
              {t.id === "orders" && store.orders.length > 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", tab === t.id ? "bg-ink-950/20" : "bg-gold-500/20 text-gold-300")}>
                  {store.orders.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* ============ OVERVIEW ============ */}
        {tab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-[1.5rem] border border-[var(--line-2)] bg-ink-900 p-5">
                  <span className={cn("grid size-11 place-items-center rounded-xl", s.tone)}>
                    <s.icon className="size-5" />
                  </span>
                  <p className="mt-4 font-display text-2xl font-black md:text-3xl">{s.value}</p>
                  <p className="mt-1 text-xs text-frost-500">{s.label}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-10 font-display text-xl font-black">أحدث الطلبات</h3>
            {store.orders.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-[var(--line-3)] p-8 text-center text-sm text-frost-500">
                لسه مفيش طلبات — أول ما عميل يطلب من المتجر هيظهر هنا فوراً
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {store.orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line-2)] bg-ink-900 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-volt-500/10 font-display text-xs font-black text-volt-300" dir="ltr">
                        {o.customer.name.slice(0, 2)}
                      </span>
                      <div>
                        <p className="text-sm font-extrabold">{o.customer.name}</p>
                        <p className="text-[11px] text-frost-500">
                          {o.id} · {relTime(o.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-base font-black text-[var(--text-primary)]">{fmt(o.total)} ج</span>
                      <span className={cn("rounded-full border px-3 py-1 text-[11px] font-bold", statusStyle[o.status])}>{o.status}</span>
                    </div>
                  </div>
                ))}
                {store.orders.length > 5 && (
                  <button onClick={() => setTab("orders")} className="w-full rounded-2xl border border-[var(--line-3)] py-3 text-sm font-bold text-frost-300 hover:bg-[var(--fill-4)]">
                    عرض كل الطلبات ({store.orders.length})
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ============ PRODUCTS ============ */}
        {tab === "products" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-frost-400">
                عندك <span className="font-black text-[var(--text-primary)]">{store.products.length}</span> منتج في المتجر
                {search && (
                  <span>
                    {" "}
                    — <span className="font-black text-volt-300">{filteredProducts.length}</span> نتيجة بحث
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <input
                  type="file"
                  accept="application/json"
                  ref={fileRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importProductsFromFile(file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line-3)] px-4 py-2.5 text-xs font-bold text-frost-300 hover:bg-[var(--fill-4)] disabled:opacity-60"
                >
                  {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  استيراد
                </button>
                <button
                  onClick={exportProducts}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line-3)] px-4 py-2.5 text-xs font-bold text-frost-300 hover:bg-[var(--fill-4)]"
                >
                  <Download className="size-4" />
                  تصدير
                </button>
                <button
                  onClick={() => {
                    if (confirm("هترجع المنتجات الافتراضية — أي تعديل هيتمسح. متأكد؟")) store.resetProducts();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line-3)] px-4 py-2.5 text-xs font-bold text-frost-300 hover:bg-[var(--fill-4)]"
                >
                  <RotateCcw className="size-4" />
                  استعادة الافتراضي
                </button>
                <button
                  onClick={() => {
                    setEditing("new");
                    setEditingId(null);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-volt-400 to-volt-600 px-5 py-2.5 text-xs font-black text-[var(--onaccent)] transition-transform hover:scale-105"
                >
                  <Plus className="size-4" />
                  منتج جديد
                </button>
              </div>
            </div>

            {importMsg && (
              <p className="mt-3 rounded-xl border border-volt-500/30 bg-volt-500/10 px-4 py-2.5 text-xs font-bold text-volt-300">
                {importMsg}
              </p>
            )}

            <div className="relative mt-5 max-w-sm">
              <Search className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-frost-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الفئة..."
                className="w-full rounded-2xl border border-[var(--line-3)] bg-ink-950/60 py-3 pl-4 pr-11 text-sm outline-none transition-colors placeholder:text-frost-500/70 focus:border-volt-500/60"
              />
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--line-2)]">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead>
                  <tr className="border-b border-[var(--line-2)] bg-ink-900 text-xs text-frost-500">
                    <th className="px-4 py-3.5 font-bold">المنتج</th>
                    <th className="px-4 py-3.5 font-bold">الفئة</th>
                    <th className="px-4 py-3.5 font-bold">السعر</th>
                    <th className="px-4 py-3.5 font-bold">قبل الخصم</th>
                    <th className="px-4 py-3.5 font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-frost-500">
                        مفيش منتجات مطابقة للبحث
                      </td>
                    </tr>
                  )}
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--line-7)] transition-colors last:border-0 hover:bg-[var(--fill-1)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={p.img} alt="" className="size-11 rounded-xl object-cover" />
                          <span className="font-bold">{p.name}</span>
                          {p.badge && <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold text-gold-300">{p.badge}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-frost-400">{catName(p.cat)}</td>
                      <td className="px-4 py-3 font-display font-black text-volt-300">{fmt(p.price)} ج</td>
                      <td className="px-4 py-3 text-frost-500">{p.oldPrice ? `${fmt(p.oldPrice)} ج` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(p.id);
                              const { id, ...draft } = p;
                              setEditing(draft);
                            }}
                            className="grid size-9 place-items-center rounded-xl border border-[var(--line-3)] text-frost-300 transition-colors hover:border-volt-500/50 hover:text-volt-300"
                            aria-label="تعديل"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`حذف "${p.name}" نهائياً؟`)) store.deleteProduct(p.id);
                            }}
                            className="grid size-9 place-items-center rounded-xl border border-[var(--line-3)] text-frost-300 transition-colors hover:border-red-400/50 hover:text-red-400"
                            aria-label="حذف"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ============ ORDERS ============ */}
        {tab === "orders" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {store.orders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--line-3)] p-12 text-center text-sm text-frost-500">
                مفيش طلبات لسه — جرّب اطلب حاجة من المتجر وهتلاقيها هنا
              </p>
            ) : (
              <div className="space-y-4">
                {store.orders.map((o: Order) => (
                  <div key={o.id} className="overflow-hidden rounded-[1.5rem] border border-[var(--line-2)] bg-ink-900">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-2)] p-4">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-black text-volt-300" dir="ltr">{o.id}</span>
                        <span className="text-[11px] text-frost-500">{relTime(o.date)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <select
                          value={o.status}
                          onChange={(e) => store.setOrderStatus(o.id, e.target.value as OrderStatus)}
                          className={cn("appearance-none rounded-full border bg-transparent px-4 py-1.5 text-[11px] font-bold outline-none", statusStyle[o.status])}
                        >
                          {(["جديد", "مؤكد", "تم الشحن", "مكتمل"] as OrderStatus[]).map((s) => (
                            <option key={s} value={s} className="bg-ink-900 text-[var(--text-primary)]">{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            if (confirm("حذف الطلب ده نهائياً؟")) store.deleteOrder(o.id);
                          }}
                          className="grid size-9 place-items-center rounded-xl border border-[var(--line-3)] text-frost-400 hover:border-red-400/50 hover:text-red-400"
                          aria-label="حذف الطلب"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      <div className="space-y-2 text-sm">
                        <p className="font-extrabold text-[var(--text-primary)]">{o.customer.name}</p>
                        <p className="flex items-center gap-2 text-frost-400">
                          <Phone className="size-3.5 text-volt-400" />
                          <a href={`https://wa.me/2${o.customer.phone.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-volt-300" dir="ltr">
                            {o.customer.phone}
                          </a>
                        </p>
                        <p className="text-frost-400">{o.customer.clinic}</p>
                        {o.customer.notes && <p className="rounded-xl bg-[var(--fill-3)] p-2.5 text-xs text-frost-500">ملاحظات: {o.customer.notes}</p>}
                        <p className="inline-flex rounded-full border border-[var(--line-3)] px-3 py-1 text-[11px] font-bold text-frost-300">{o.payment}</p>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {o.items.map((i) => (
                          <div key={i.id} className="flex justify-between text-frost-300">
                            <span>
                              {i.name} <span className="text-frost-500">× {i.qty}</span>
                            </span>
                            <span className="font-bold">{fmt(i.price * i.qty)} ج</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-[var(--line-2)] pt-2 font-display text-base font-black text-[var(--text-primary)]">
                          <span>الإجمالي</span>
                          <span>{fmt(o.total)} ج</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ============ SETTINGS ============ */}
        {tab === "settings" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl">
            <div className="rounded-[1.5rem] border border-[var(--line-2)] bg-ink-900 p-6">
              <h3 className="font-display text-lg font-black">إعدادات المتجر</h3>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-frost-400">رقم واتساب استقبال الطلبات (بالكود الدولي)</label>
                  <input
                    value={wa}
                    onChange={(e) => setWa(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-2xl border border-[var(--line-3)] bg-ink-950/60 px-4 py-3 text-left text-sm outline-none focus:border-volt-500/60"
                    placeholder="201001234567"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-frost-400">حد الشحن المجاني (جنيه)</label>
                  <input
                    type="number"
                    min={0}
                    value={ship}
                    onChange={(e) => setShip(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-2xl border border-[var(--line-3)] bg-ink-950/60 px-4 py-3 text-left text-sm outline-none focus:border-volt-500/60"
                  />
                </div>
                <button
                  onClick={() => {
                    store.updateSettings({ whatsapp: wa.trim() || store.settings.whatsapp, freeShipping: Number(ship) || store.settings.freeShipping });
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 py-3.5 font-display font-black text-[var(--onaccent)] transition-transform hover:scale-[1.02]"
                >
                  {saved ? (
                    <>
                      <BadgeCheck className="size-5" />
                      تم الحفظ!
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      حفظ الإعدادات
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* product form modal */}
      <AnimatePresence>
        {editing && (
          <ProductForm
            initial={editing === "new" ? emptyDraft : editing}
            onClose={() => setEditing(null)}
            onSave={(d) => {
              if (editingId !== null) store.updateProduct(editingId, d);
              else store.addProduct(d);
              setEditing(null);
              setEditingId(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
