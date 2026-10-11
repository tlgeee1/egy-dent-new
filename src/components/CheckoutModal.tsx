import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CheckCircle2, CreditCard, Loader2, MapPin, Smartphone, StickyNote, User, Wallet, X, Zap, AlertCircle } from "lucide-react";
import { useCart, MAX_ORDER_ITEMS } from "@/context/CartContext";
import { useStore, type Order } from "@/context/StoreContext";
import { fmt, paymentMethods } from "@/data/data";
import { cn } from "@/utils/cn";

const payIcons: Record<string, typeof Wallet> = {
  vodafone: Smartphone,
  instapay: Zap,
  orange: Smartphone,
  etisalat: Smartphone,
  card: CreditCard,
  cod: Banknote,
};

// لو رسالة واتساب الكاملة (بعد الترميز) أطول من الحد ده، بنبعت ملخص بدل قايمة الأصناف
// (التفاصيل كلها محفوظة في الطلبات نفسها). الرقم متحفظ عشان الروابط الطويلة جدًا ممكن تفشل.
const WA_URL_BUDGET = 6000;

export default function CheckoutModal() {
  const { checkoutOpen, setCheckoutOpen, lines, clear } = useCart();
  const { products, settings, addOrder } = useStore();

  const items = useMemo(
    () =>
      lines
        .map((l) => ({ ...l, p: products.find((p) => p.id === l.id) }))
        .filter((x): x is { id: number; qty: number; p: NonNullable<typeof x.p> } => Boolean(x.p)),
    [lines, products],
  );
  const total = items.reduce((s, x) => s + x.p.price * x.qty, 0);
  const partsCount = Math.max(1, Math.ceil(items.length / MAX_ORDER_ITEMS));

  const [form, setForm] = useState({ name: "", clinic: "", phone: "", notes: "" });
  const [payment, setPayment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<"form" | "sending" | "success">("form");
  const [waUrl, setWaUrl] = useState("");
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState("");

  // ✅ متغير حماية لمنع إرسال الطلب مرتين متتاليتين
  const [isSubmitting, setIsSubmitting] = useState(false);

  // بيفتكر الأجزاء اللي اتحفظت لو الإرسال فشل في النص، عشان المحاولة التانية متكررش اللي اتحفظ
  const attemptRef = useRef<{ sig: string; base: string; saved: number } | null>(null);

  const close = () => {
    setCheckoutOpen(false);
    setSubmitError("");
    if (stage === "success") {
      setForm({ name: "", clinic: "", phone: "", notes: "" });
      setPayment("");
      setErrors({});
      setOrderIds([]);
      setStage("form");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ حماية إضافية: لو جاري الإرسال بالفعل، ارفض العملية الجديدة
    if (isSubmitting) return;

    const errs: Record<string, string> = {};
    if (form.name.trim().length < 3) errs.name = "اكتب الاسم بالكامل";
    if (form.clinic.trim().length < 3) errs.clinic = "اكتب عنوان العيادة";
    if (!/^01[0-9]{9}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "رقم غير صحيح — مثال: 01001234567";
    if (!payment) errs.payment = "اختار طريقة الدفع";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || items.length === 0) return;

    setSubmitError("");
    setStage("sending");
    setIsSubmitting(true); // ✅ تفعيل وضع الإرسال فوراً لمنع أي نقرات أخرى

    // مرجع واحد للطلب كله — لو الطلب اتقسّم، كل جزء ياخد رقم مرجع + رقم الجزء
    const sig = items.map((x) => `${x.id}:${x.qty}:${x.p.price}`).join("|");
    if (!attemptRef.current || attemptRef.current.sig !== sig) {
      attemptRef.current = { sig, base: `EG-${Date.now().toString(36).toUpperCase()}`, saved: 0 };
    }
    const attempt = attemptRef.current;

    const phone = form.phone.replace(/\s/g, "");
    const paymentName = paymentMethods.find((m) => m.id === payment)?.name ?? payment;
    const orderItems = items.map((x) => ({ id: x.p.id, name: x.p.name, price: x.p.price, qty: x.qty }));

    // تقسيم السلة لأجزاء، كل جزء لحد MAX_ORDER_ITEMS أصناف، وإجماليه بيتحسب لوحده
    const chunks: (typeof orderItems)[] = [];
    for (let i = 0; i < orderItems.length; i += MAX_ORDER_ITEMS) chunks.push(orderItems.slice(i, i + MAX_ORDER_ITEMS));

    const orders: Order[] = chunks.map((chunk, idx) => {
      const split = chunks.length > 1;
      const note = form.notes.trim();
      const splitNote = split ? `[طلب مقسّم ${idx + 1}/${chunks.length} — مرجع ${attempt.base}]` : "";
      return {
        id: split ? `${attempt.base}-${idx + 1}` : attempt.base,
        customer: {
          name: form.name.trim(),
          clinic: form.clinic.trim(),
          phone,
          notes: [splitNote, note].filter(Boolean).join(" ").slice(0, 500), // الرولز بتقبل 500 حرف بالكتير
        },
        payment: paymentName,
        items: chunk,
        total: chunk.reduce((s, i) => s + i.price * i.qty, 0),
        status: "جديد",
        date: Date.now(),
      };
    });
    const ids = orders.map((o) => o.id);

    const buildMsg = (withItems: boolean) =>
      [
        `طلب جديد من موقع إيجي دنت`,
        ids.length > 1 ? `أرقام الطلبات (${ids.length}): ${ids.join(" ، ")}` : `رقم الطلب: ${ids[0]}`,
        `━━━━━━━━━━`,
        `الاسم: ${form.name.trim()}`,
        `العيادة: ${form.clinic.trim()}`,
        `التليفون: ${phone}`,
        form.notes.trim() ? `ملاحظات: ${form.notes.trim()}` : "",
        `━━━━━━━━━━`,
        ...(withItems
          ? orderItems.map((i) => `• ${i.name} × ${i.qty} = ${fmt(i.price * i.qty)} جنيه`)
          : [`عدد الأصناف: ${orderItems.length} (التفاصيل في الطلبات المذكورة فوق)`]),
        `━━━━━━━━━━`,
        `الإجمالي: ${fmt(total)} جنيه`,
        `طريقة الدفع: ${paymentName}`,
      ]
        .filter(Boolean)
        .join("\n");

    const full = encodeURIComponent(buildMsg(true));
    const text = full.length <= WA_URL_BUDGET ? full : encodeURIComponent(buildMsg(false));
    const url = `https://wa.me/${settings.whatsapp}?text=${text}`;

    try {
      for (let i = attempt.saved; i < orders.length; i++) {
        await addOrder(orders[i]);
        attempt.saved = i + 1;
      }
      attemptRef.current = null;
      setWaUrl(url);
      setOrderIds(ids);
      clear();
      setStage("success");

      setTimeout(() => {
        window.open(url, "_blank");
      }, 500);
    } catch (err) {
      console.error("addOrder failed:", err);
      setSubmitError(
        attempt.saved > 0
          ? `اتحفظ ${attempt.saved} من ${orders.length} أجزاء من طلبك، والباقي ماتحفظش. اضغط تأكيد الطلب تاني لاستكمال الباقي، ولو المشكلة مستمرة كلمنا على واتساب مباشرة.`
          : "حصلت مشكلة وطلبك ماتحفظش. حاول تاني، ولو المشكلة مستمرة كلمنا على واتساب مباشرة.",
      );
      setStage("form");
    } finally {
      setIsSubmitting(false); // ✅ إعادة تعيين الحماية بعد انتهاء المحاولة (فشل أو نجاح)
    }
  };

  const inputCls = (hasErr: boolean) =>
    cn(
      "w-full rounded-2xl border bg-ink-950/60 px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-frost-500/70",
      hasErr ? "border-red-400/60" : "border-[var(--line-3)] focus:border-volt-500/60",
    );

  return (
    <AnimatePresence>
      {checkoutOpen && (
        <div className="fixed inset-0 z-[180] grid place-items-center overflow-y-auto p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-ink-950/85 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative my-8 w-full max-w-3xl rounded-[2rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl"
          >
            <button
              onClick={close}
              className="absolute left-4 top-4 z-10 grid size-10 place-items-center rounded-xl border border-[var(--line-3)] bg-ink-950/60 text-frost-300 transition-colors hover:bg-[var(--fill-6)]"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </button>

            {stage === "success" ? (
              <div className="grid place-items-center p-10 py-16 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.1 }}
                  className="grid size-24 place-items-center rounded-full bg-emerald-400/15 text-emerald-400"
                >
                  <CheckCircle2 className="size-14" />
                </motion.div>
                <h3 className="mt-6 font-display text-3xl font-black">تم استلام طلبك!</h3>
                <p className="mt-2 text-sm text-frost-400">
                  {orderIds.length > 1 ? "أرقام الطلبات" : "رقم الطلب"}{" "}
                  <span className="font-display font-black text-volt-300" dir="ltr">{orderIds.join(" , ")}</span> —
                  هنكلمك خلال دقايق لتأكيد الطلب والتوصيل.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl bg-gradient-to-l from-emerald-400 to-emerald-600 px-8 py-3.5 font-display font-black text-[var(--onaccent)] transition-transform hover:scale-105"
                  >
                    إرسال الطلب على واتساب
                  </a>
                  <button
                    onClick={close}
                    className="rounded-2xl border border-[var(--line-3)] px-8 py-3.5 font-bold text-frost-300 transition-colors hover:bg-[var(--fill-4)]"
                  >
                    متابعة التسوق
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="grid lg:grid-cols-[1.15fr_0.85fr]">
                {/* form side */}
                <div className="p-6 md:p-8">
                  <h3 className="font-display text-2xl font-black">بيانات العميل</h3>
                  <p className="mt-1 text-xs text-frost-500">املأ البيانات وهنأكد طلبك على واتساب فوراً</p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-frost-300">
                        <User className="size-3.5 text-volt-400" /> الاسم بالكامل *
                      </label>
                      <input
                        value={form.name}
                        maxLength={100}
                        onChange={(e) => {
                          setForm({ ...form, name: e.target.value });
                          setErrors({ ...errors, name: "" });
                        }}
                        placeholder="د. محمد أحمد"
                        className={inputCls(!!errors.name)}
                      />
                      {errors.name && <p className="mt-1 text-[11px] text-red-400">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-frost-300">
                        <MapPin className="size-3.5 text-volt-400" /> عنوان العيادة *
                      </label>
                      <input
                        value={form.clinic}
                        maxLength={300}
                        onChange={(e) => {
                          setForm({ ...form, clinic: e.target.value });
                          setErrors({ ...errors, clinic: "" });
                        }}
                        placeholder="المنطقة، الشارع، رقم العقار، الدور"
                        className={inputCls(!!errors.clinic)}
                      />
                      {errors.clinic && <p className="mt-1 text-[11px] text-red-400">{errors.clinic}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-frost-300">
                        <Smartphone className="size-3.5 text-volt-400" /> رقم التليفون *
                      </label>
                      <input
                        value={form.phone}
                        onChange={(e) => {
                          setForm({ ...form, phone: e.target.value });
                          setErrors({ ...errors, phone: "" });
                        }}
                        placeholder="01001234567"
                        inputMode="tel"
                        dir="ltr"
                        className={cn(inputCls(!!errors.phone), "text-left")}
                      />
                      {errors.phone && <p className="mt-1 text-[11px] text-red-400">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-frost-300">
                        <StickyNote className="size-3.5 text-volt-400" /> ملاحظات إضافية
                      </label>
                      <textarea
                        value={form.notes}
                        maxLength={500}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="أي تفاصيل عن التوصيل أو الطلب..."
                        rows={2}
                        className={cn(inputCls(false), "resize-none")}
                      />
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-frost-300">
                        <Wallet className="size-3.5 text-volt-400" /> طريقة الدفع *
                      </label>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {paymentMethods.map((m) => {
                          const Icon = payIcons[m.id] ?? Wallet;
                          const active = payment === m.id;
                          return (
                            <button
                              type="button"
                              key={m.id}
                              onClick={() => {
                                setPayment(m.id);
                                setErrors({ ...errors, payment: "" });
                              }}
                              className={cn(
                                "rounded-2xl border p-3 text-right transition-all",
                                active
                                  ? "border-volt-400 bg-volt-500/15 shadow-[0_8px_24px_rgba(34,211,238,0.2)]"
                                  : "border-[var(--line-3)] bg-ink-950/40 hover:border-[var(--line-5)]",
                              )}
                            >
                              <Icon className={cn("size-5", active ? "text-volt-300" : "text-frost-400")} />
                              <p className={cn("mt-2 text-xs font-extrabold", active ? "text-[var(--text-primary)]" : "text-frost-300")}>
                                {m.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-frost-500" dir="ltr">{m.note}</p>
                            </button>
                          );
                        })}
                      </div>
                      {errors.payment && <p className="mt-1.5 text-[11px] text-red-400">{errors.payment}</p>}
                    </div>
                  </div>
                </div>

                {/* summary side */}
                <div className="flex flex-col border-t border-[var(--line-2)] bg-ink-950/40 p-6 md:p-8 lg:border-r lg:border-t-0">
                  <h4 className="font-display text-lg font-black">ملخص الطلب</h4>
                  <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
                    {items.map((x) => (
                      <div key={x.id} className="flex items-center gap-3">
                        <img src={x.p.img} alt={x.p.name} className="size-12 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">{x.p.name}</p>
                          <p className="text-[11px] text-frost-500">× {x.qty}</p>
                        </div>
                        <p className="font-display text-sm font-black text-volt-300">{fmt(x.p.price * x.qty)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2 border-t border-[var(--line-2)] pt-4 text-sm">
                    <div className="flex justify-between text-frost-400">
                      <span>الشحن</span>
                      <span>يُحدد عند التأكيد</span>
                    </div>
                    <div className="flex justify-between border-t border-[var(--line-2)] pt-3 font-display text-xl font-black">
                      <span>الإجمالي</span>
                      <span className="text-[var(--text-primary)]">{fmt(total)} <span className="text-xs text-frost-400">جنيه</span></span>
                    </div>
                  </div>

                  {partsCount > 1 && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-300">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <p>
                        الطلب فيه {items.length} صنف، فهيتسجّل على {partsCount} طلبات (كل طلب لحد {MAX_ORDER_ITEMS} أصناف)
                        برسالة واتساب واحدة، والإجمالي واحد.
                      </p>
                    </div>
                  )}

                  {submitError && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-400/10 p-3 text-xs text-red-300">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <p>{submitError}</p>
                    </div>
                  )}

                  {/* ✅ الزرار يتعطل تلقائياً لو جاري الإرسال لمنع التكرار */}
                  <button
                    type="submit"
                    disabled={stage === "sending" || isSubmitting || items.length === 0}
                    className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 py-4 font-display text-lg font-black text-[var(--onaccent)] shadow-[0_14px_36px_rgba(34,211,238,0.35)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {stage === "sending" || isSubmitting ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        جاري إرسال الطلب...
                      </>
                    ) : (
                      "تأكيد الطلب"
                    )}
                  </button>
                  <p className="mt-3 text-center text-[11px] leading-relaxed text-frost-500">
                    بالضغط على تأكيد الطلب أنت توافق على شروط الاستبدال والاسترجاع
                  </p>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
