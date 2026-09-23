import { useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { normName, type Category } from "@/data/data";
import { uploadImage } from "@/utils/uploadImage";

type Draft = { name: string; desc: string; img: string };

const field =
  "w-full rounded-2xl border border-[var(--line-3)] bg-ink-950/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-frost-500/70 focus:border-volt-500/60";

/** نافذة إضافة / تعديل فئة */
function CategoryForm({
  initial,
  others,
  onClose,
  onSave,
}: {
  initial: Draft;
  others: Category[];
  onClose: () => void;
  onSave: (d: Draft) => Promise<void>;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      const url = await uploadImage(file);
      setD((prev) => ({ ...prev, img: url }));
    } catch (error) {
      setErr(error instanceof Error ? error.message : "فشل رفع الصورة — حاول تاني");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const name = d.name.trim();
    if (name.length < 2) return setErr("اكتب اسم الفئة");
    // الاسم لازم يكون مميز لأن الاستيراد بيطابق الفئة بالاسم
    if (others.some((c) => normName(c.name) === normName(name))) return setErr("في فئة تانية بنفس الاسم ده");
    setSaving(true);
    try {
      await onSave({ ...d, name });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative my-6 w-full max-w-lg rounded-[2rem] border border-[var(--line-3)] bg-ink-900 p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-black">{initial.name ? "تعديل فئة" : "إضافة فئة جديدة"}</h3>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl border border-[var(--line-3)] text-frost-400 hover:bg-[var(--fill-4)]"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-frost-400">اسم الفئة *</label>
            <input
              value={d.name}
              onChange={(e) => setD({ ...d, name: e.target.value })}
              className={field}
              placeholder="مثال: خيوط جراحية"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-frost-400">وصف قصير (اختياري)</label>
            <input
              value={d.desc}
              onChange={(e) => setD({ ...d, desc: e.target.value })}
              className={field}
              placeholder="جملة قصيرة عن الفئة"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-frost-400">صورة الفئة (الأفضل طولية 4:5)</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <div className="flex items-center gap-4">
              <div className="relative grid h-28 w-[5.6rem] shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--line-3)] bg-ink-950">
                {d.img ? (
                  <img src={d.img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-center text-[10px] text-frost-500">من غير صورة</span>
                )}
                {uploading && (
                  <span className="absolute inset-0 grid place-items-center bg-ink-950/70">
                    <Loader2 className="size-5 animate-spin text-volt-400" />
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line-3)] px-4 py-2 text-xs font-bold text-frost-300 transition-colors hover:border-volt-500/50 hover:text-volt-300 disabled:opacity-50"
                >
                  <Upload className="size-3.5" />
                  {d.img ? "تغيير الصورة" : "رفع صورة"}
                </button>
                {d.img && (
                  <button
                    type="button"
                    onClick={() => setD({ ...d, img: "" })}
                    className="text-[11px] font-bold text-frost-500 hover:text-red-400"
                  >
                    إزالة الصورة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {err && <p className="mt-4 text-xs font-bold text-red-400">{err}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={save}
            disabled={saving || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 px-5 py-3 text-sm font-black text-[var(--onvolt)] disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            حفظ
          </button>
          <button
            onClick={onClose}
            className="rounded-2xl border border-[var(--line-3)] px-5 py-3 text-sm font-bold text-frost-300 hover:bg-[var(--fill-4)]"
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** تبويب "الفئات" في لوحة التحكم — إضافة وتعديل وحذف وترتيب الفئات */
export default function CategoriesAdmin() {
  const { categories, products, addCategory, updateCategory, deleteCategory, moveCategory } = useStore();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 6000);
  };

  const remove = async (c: Category) => {
    if (!confirm(`حذف فئة "${c.name}" نهائياً؟`)) return;
    setBusyId(c.id);
    try {
      const error = await deleteCategory(c.id);
      if (error) flash(error);
    } finally {
      setBusyId(null);
    }
  };

  const move = async (c: Category, dir: -1 | 1) => {
    setBusyId(c.id);
    try {
      await moveCategory(c.id, dir);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-frost-400">
          الفئات اللي بتظهر في الصفحة الرئيسية وفلاتر المنتجات. تقدر تضيف فئة جديدة وتعدّل اسمها وصورتها وترتّبها.
          الأفضل صورة <span className="font-bold text-[var(--text-primary)]">طولية</span> (نسبة 4:5، مثلاً 800×1000) والمنتج في النص.
          عند استيراد منتجات، اكتب اسم الفئة في خانة <span dir="ltr" className="font-bold text-[var(--text-primary)]">cat</span> بنفس الاسم بالظبط.
        </p>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 px-5 py-3 text-sm font-black text-[var(--onvolt)]"
        >
          <Plus className="size-4" />
          إضافة فئة
        </button>
      </div>

      {msg && <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300">{msg}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c, i) => {
          const busy = busyId === c.id;
          const count = products.filter((p) => p.cat === c.id).length;
          return (
            <div key={c.id} className="overflow-hidden rounded-[1.5rem] border border-[var(--line-2)] bg-ink-900">
              <div className="relative aspect-[4/5] bg-ink-950">
                {c.img ? (
                  <img src={c.img} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-xs text-frost-500">من غير صورة</span>
                )}
                {busy && (
                  <span className="absolute inset-0 grid place-items-center bg-ink-950/70">
                    <Loader2 className="size-7 animate-spin text-volt-400" />
                  </span>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="text-sm font-extrabold leading-tight">{c.name}</p>
                <p className="text-[11px] text-frost-500">{count} منتج</p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    disabled={busyId !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--line-3)] px-2 py-2 text-xs font-bold text-frost-300 transition-colors hover:border-volt-500/50 hover:text-volt-300 disabled:opacity-50"
                  >
                    <Pencil className="size-3.5" />
                    تعديل
                  </button>
                  {/* الموقع RTL: أول فئة على اليمين، فالسهم اليمين = تقديم */}
                  <button
                    type="button"
                    onClick={() => move(c, -1)}
                    disabled={busyId !== null || i === 0}
                    aria-label="تقديم"
                    className="grid size-8 place-items-center rounded-xl border border-[var(--line-3)] text-frost-300 transition-colors hover:text-volt-300 disabled:opacity-30"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(c, 1)}
                    disabled={busyId !== null || i === categories.length - 1}
                    aria-label="تأخير"
                    className="grid size-8 place-items-center rounded-xl border border-[var(--line-3)] text-frost-300 transition-colors hover:text-volt-300 disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    disabled={busyId !== null}
                    aria-label="حذف"
                    className="grid size-8 place-items-center rounded-xl border border-[var(--line-3)] text-frost-300 transition-colors hover:border-red-400/50 hover:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {editing && (
          <CategoryForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? { name: "", desc: "", img: "" } : { name: editing.name, desc: editing.desc, img: editing.img }}
            others={editing === "new" ? categories : categories.filter((c) => c.id !== editing.id)}
            onClose={() => setEditing(null)}
            onSave={async (d) => {
              if (editing === "new") await addCategory(d);
              else await updateCategory(editing.id, d);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
