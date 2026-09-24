import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Images, Loader2, Upload, X, XCircle } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import type { Product } from "@/data/data";
import { uploadImage } from "@/utils/uploadImage";

type Row = {
  key: string;
  file: File;
  url: string;
  productId: number | null;
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
};

const field =
  "w-full rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2.5 text-xs outline-none transition-colors focus:border-volt-500/60";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** توحيد النص للمقارنة: أرقام عربية → إنجليزية، وإزالة الامتداد والرموز، و15.40 = 15-40 */
function norm(s: string): string {
  return s
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/(\d)[.\-/](\d)/g, "$1#$2")
    .replace(/[_\-.()%]+/g, " ")
    .replace(/#/g, "-")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

const tokens = (s: string) => norm(s).split(" ").filter(Boolean);

/** المنتج اللي اسم الملف بيطابقه بوضوح — لو أكتر من منتج بيطابق، بنسيبها من غير ربط بدل التخمين */
function matchByName(fileName: string, candidates: Product[]): number | null {
  const ft = tokens(fileName);
  if (ft.length === 0) return null;
  const hits = candidates.filter((p) => {
    const pt = tokens(p.name);
    return ft.every((t) => pt.includes(t));
  });
  if (hits.length === 1) return hits[0].id;
  // لو اسم الملف بيطابق اسم منتج بالظبط (نفس الكلمات) نختاره حتى لو في منتجات أطول
  const exact = hits.filter((p) => tokens(p.name).length === ft.length);
  return exact.length === 1 ? exact[0].id : null;
}

export default function BulkImages({ onClose }: { onClose: () => void }) {
  const { products, categories, updateProduct } = useStore();
  const [catFilter, setCatFilter] = useState("all");
  const [onlyPlaceholder, setOnlyPlaceholder] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<Row[]>([]);
  rowsRef.current = rows;

  useEffect(() => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.url)), []);

  // المنتجات المتاحة للربط (بترتيب الإضافة)
  const targets = useMemo(
    () =>
      products
        .filter((p) => (catFilter === "all" || p.cat === catFilter) && (!onlyPlaceholder || !/^https?:/i.test(p.img)))
        .sort((a, b) => a.id - b.id),
    [products, catFilter, onlyPlaceholder],
  );
  const targetIds = useMemo(() => new Set(targets.map((t) => t.id)), [targets]);

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
    e.target.value = "";
    if (!list.length) return;
    list.sort((a, b) => a.name.localeCompare(b.name, "ar", { numeric: true }));
    setRows((prev) => [
      ...prev,
      ...list.map((file, i) => ({
        key: `${Date.now()}-${prev.length + i}-${file.name}`,
        file,
        url: URL.createObjectURL(file),
        productId: null,
        status: "idle" as const,
      })),
    ]);
  };

  const setProduct = (key: string, productId: number | null) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, productId, status: "idle", error: undefined } : r)));

  const removeRow = (key: string) =>
    setRows((rs) => {
      const gone = rs.find((r) => r.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return rs.filter((r) => r.key !== key);
    });

  const autoByName = () =>
    setRows((rs) => {
      const taken = new Set(rs.filter((r) => r.productId !== null && r.status === "done").map((r) => r.productId));
      return rs.map((r) => {
        if (r.status === "done") return r;
        const free = targets.filter((t) => !taken.has(t.id));
        const id = matchByName(r.file.name, free);
        if (id !== null) taken.add(id);
        return { ...r, productId: id, status: "idle", error: undefined };
      });
    });

  const autoByOrder = () =>
    setRows((rs) => {
      const taken = new Set(rs.filter((r) => r.status === "done").map((r) => r.productId));
      const free = targets.filter((t) => !taken.has(t.id));
      let i = 0;
      return rs.map((r) => {
        if (r.status === "done") return r;
        const p = free[i++];
        return { ...r, productId: p ? p.id : null, status: "idle", error: undefined };
      });
    });

  const clearLinks = () => setRows((rs) => rs.map((r) => (r.status === "done" ? r : { ...r, productId: null, error: undefined })));

  const linked = rows.filter((r) => r.productId !== null);
  const pending = linked.filter((r) => r.status !== "done");
  const doneCount = rows.filter((r) => r.status === "done").length;

  const start = async () => {
    const queue = rowsRef.current.filter((r) => r.productId !== null && r.status !== "done");
    if (!queue.length) return;
    setRunning(true);
    const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const row = queue[next++];
        patch(row.key, { status: "uploading", error: undefined });
        try {
          const product = products.find((p) => p.id === row.productId);
          if (!product) throw new Error("المنتج مش موجود");
          const url = await uploadImage(row.file);
          const { id, ...rest } = product;
          await updateProduct(id, { ...rest, img: url });
          patch(row.key, { status: "done" });
        } catch (err) {
          patch(row.key, { status: "error", error: err instanceof Error ? err.message : "فشل الرفع" });
        }
      }
    };
    // 3 صور في نفس الوقت — أسرع من واحدة واحدة ومن غير ما نضغط على الشبكة
    await Promise.all([worker(), worker(), worker()]);
    setRunning(false);
  };

  const taken = (exceptKey: string) => new Set(rows.filter((r) => r.key !== exceptKey && r.productId !== null).map((r) => r.productId));

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-3 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-md" onClick={() => !running && onClose()} />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative my-4 w-full max-w-3xl rounded-[2rem] border border-[var(--line-3)] bg-ink-900 p-5 shadow-2xl md:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-xl font-black">
            <Images className="size-5 text-volt-400" />
            رفع صور بالجملة
          </h3>
          <button
            onClick={onClose}
            disabled={running}
            aria-label="إغلاق"
            className="grid size-9 place-items-center rounded-xl border border-[var(--line-3)] text-frost-400 hover:bg-[var(--fill-4)] disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-frost-400">
          اختار الفئة، وبعدين كل الصور مرة واحدة، وكل صورة بتتربط بمنتجها. راجع الربط قبل الحفظ.
        </p>

        {/* نطاق المنتجات */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-frost-400">الفئة</label>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} disabled={running} className={field}>
              <option value="all">كل الفئات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2.5 text-xs font-bold text-frost-300">
            <input type="checkbox" checked={onlyPlaceholder} onChange={(e) => setOnlyPlaceholder(e.target.checked)} disabled={running} className="size-4 accent-[#06b6d4]" />
            المنتجات اللي صورتها مؤقتة بس
          </label>
        </div>
        <p className="mt-2 text-[11px] text-frost-500">
          المنتجات المتاحة للربط: <span className="font-black text-volt-300">{targets.length}</span>
        </p>

        {/* اختيار الصور */}
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={running}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-volt-400 to-volt-600 px-4 py-2.5 text-xs font-black text-[var(--onaccent)] disabled:opacity-60"
          >
            <Upload className="size-4" />
            اختيار الصور
          </button>
          {rows.length > 0 && (
            <>
              <button onClick={autoByName} disabled={running} className="rounded-xl border border-[var(--line-3)] px-4 py-2.5 text-xs font-bold text-frost-300 hover:bg-[var(--fill-4)] disabled:opacity-50">
                ربط بالاسم
              </button>
              <button onClick={autoByOrder} disabled={running} className="rounded-xl border border-[var(--line-3)] px-4 py-2.5 text-xs font-bold text-frost-300 hover:bg-[var(--fill-4)] disabled:opacity-50">
                ربط بالترتيب
              </button>
              <button onClick={clearLinks} disabled={running} className="rounded-xl border border-[var(--line-3)] px-4 py-2.5 text-xs font-bold text-frost-500 hover:text-red-400 disabled:opacity-50">
                مسح الربط
              </button>
            </>
          )}
        </div>
        {rows.length > 0 && (
          <p className="mt-3 text-[11px] leading-relaxed text-frost-500">
            <span className="font-bold text-frost-300">ربط بالاسم:</span> لو اسم الملف زي اسم المنتج (مثلاً <span dir="ltr">مقاس 25.jpg</span> أو اسم المنتج كامل). ·{" "}
            <span className="font-bold text-frost-300">ربط بالترتيب:</span> الصور مرتبة بأسماء ملفاتها وتتوزع على المنتجات بترتيبها في القايمة تحت.
          </p>
        )}

        {/* الصفوف */}
        {rows.length > 0 && (
          <div className="mt-4 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
            {rows.map((r) => {
              const usedByOthers = taken(r.key);
              return (
                <div key={r.key} className="flex items-center gap-3 rounded-2xl border border-[var(--line-2)] bg-ink-950/40 p-2.5">
                  <img src={r.url} alt="" loading="lazy" decoding="async" className="size-14 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="truncate text-[11px] text-frost-500" dir="ltr">
                      {r.file.name}
                    </p>
                    <select
                      value={r.productId ?? ""}
                      onChange={(e) => setProduct(r.key, e.target.value ? Number(e.target.value) : null)}
                      disabled={running || r.status === "done"}
                      className={field}
                    >
                      <option value="">— اختار المنتج —</option>
                      {targets
                        .filter((t) => !usedByOthers.has(t.id) || t.id === r.productId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      {r.productId !== null && !targetIds.has(r.productId) && (
                        <option value={r.productId}>{products.find((p) => p.id === r.productId)?.name}</option>
                      )}
                    </select>
                    {r.status === "error" && <p className="text-[11px] font-bold text-red-400">{r.error}</p>}
                  </div>
                  <div className="grid size-8 shrink-0 place-items-center">
                    {r.status === "uploading" && <Loader2 className="size-5 animate-spin text-volt-400" />}
                    {r.status === "done" && <CheckCircle2 className="size-5 text-emerald-400" />}
                    {r.status === "error" && <XCircle className="size-5 text-red-400" />}
                    {(r.status === "idle" || r.status === "error") && !running && (
                      <button onClick={() => removeRow(r.key)} aria-label="إزالة" className={r.status === "error" ? "hidden" : "text-frost-500 hover:text-red-400"}>
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* الحفظ */}
        {rows.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={start}
              disabled={running || pending.length === 0}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 px-6 py-3 text-sm font-black text-[var(--onaccent)] disabled:opacity-50"
            >
              {running && <Loader2 className="size-4 animate-spin" />}
              {running ? "جاري الرفع…" : `رفع وحفظ (${pending.length})`}
            </button>
            <p className="text-[11px] text-frost-500">
              مربوطة: <span className="font-black text-frost-300">{linked.length}</span> من {rows.length}
              {doneCount > 0 && (
                <>
                  {" "}
                  · تم حفظ <span className="font-black text-emerald-400">{doneCount}</span>
                </>
              )}
            </p>
          </div>
        )}
        {rows.length > 0 && linked.length < rows.length && !running && (
          <p className="mt-2 text-[11px] text-amber-400">في {rows.length - linked.length} صورة مش مربوطة بمنتج، ومش هتترفع.</p>
        )}
      </motion.div>
    </div>
  );
}
