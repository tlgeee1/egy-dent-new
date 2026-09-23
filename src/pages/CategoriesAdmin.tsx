import { useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { categories } from "@/data/data";
import { uploadImage } from "@/utils/uploadImage";

/** تبويب "الفئات" في لوحة التحكم — رفع صورة لكل فئة من الـ 14 */
export default function CategoriesAdmin() {
  const { settings, updateSettings, products } = useStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<{ id: string; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetId = useRef<string | null>(null);

  const images = settings.categoryImages ?? {};

  const pick = (id: string) => {
    targetId.current = id;
    fileRef.current?.click();
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const id = targetId.current;
    if (!file || !id) return;
    setBusyId(id);
    setErr(null);
    try {
      const url = await uploadImage(file);
      await updateSettings({ categoryImages: { ...images, [id]: url } });
    } catch (error) {
      setErr({ id, msg: error instanceof Error ? error.message : "فشل رفع الصورة — حاول تاني" });
    } finally {
      setBusyId(null);
    }
  };

  // القيمة الفاضية بترجّع الفئة لصورتها الافتراضية
  const reset = async (id: string) => {
    setBusyId(id);
    setErr(null);
    try {
      await updateSettings({ categoryImages: { ...images, [id]: "" } });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-sm text-frost-400">
        دي صور الفئات اللي بتظهر في الصفحة الرئيسية. الأفضل صورة <span className="font-bold text-[var(--text-primary)]">طولية</span> (نسبة 4:5، مثلاً 800×1000)
        والمنتج في النص. أي فئة من غير صورة بتاخد الصورة الافتراضية.
      </p>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => {
          const custom = images[c.id];
          const busy = busyId === c.id;
          const count = products.filter((p) => p.cat === c.id && !p.showcaseOnly).length;
          return (
            <div key={c.id} className="overflow-hidden rounded-[1.5rem] border border-[var(--line-2)] bg-ink-900">
              <div className="relative aspect-[4/5] bg-ink-950">
                <img src={custom || c.img} alt={c.name} className="h-full w-full object-cover" />
                {!custom && (
                  <span className="absolute right-2 top-2 rounded-full bg-ink-950/75 px-2 py-0.5 text-[10px] font-bold text-frost-400">
                    صورة افتراضية
                  </span>
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
                <button
                  type="button"
                  onClick={() => pick(c.id)}
                  disabled={busyId !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-3)] px-3 py-2 text-xs font-bold text-frost-300 transition-colors hover:border-volt-500/50 hover:text-volt-300 disabled:opacity-50"
                >
                  <Upload className="size-3.5" />
                  {custom ? "تغيير الصورة" : "رفع صورة"}
                </button>
                {custom && (
                  <button
                    type="button"
                    onClick={() => reset(c.id)}
                    disabled={busyId !== null}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-bold text-frost-500 transition-colors hover:text-red-400 disabled:opacity-50"
                  >
                    <RotateCcw className="size-3" />
                    رجوع للافتراضية
                  </button>
                )}
                {err?.id === c.id && <p className="text-[11px] text-red-400">{err.msg}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
