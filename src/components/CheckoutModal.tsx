import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CheckCircle2, CreditCard, Loader2, MapPin, Smartphone, StickyNote, User, Wallet, X, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";
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
  const freeShip = total >= settings.freeShipping;

  const [form, setForm] = useState({ name: "", clinic: "", phone: "", notes: "" });
  const [payment, setPayment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<"form" | "sending" | "success">("form");
  const [waUrl, setWaUrl] = useState("");
  const [orderId, setOrderId] = useState("");

  const close = () => {
    setCheckoutOpen(false);
    if (stage === "success") {
      setForm({ name: "", clinic: "", phone: "", notes: "" });
      setPayment("");
      setErrors({});
      setStage("form");
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 3) errs.name = "اكتب الاسم بالكامل";
    if (form.clinic.trim().length < 3) errs.clinic = "اكتب عنوان العيادة";
    if (!/^01[0-9]{9}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "رقم غير صحيح — مثال: 01001234567";
    if (!payment) errs.payment = "اختار طريقة الدفع";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || items.length === 0) return;

    setStage("sending");
    const id = `EG-${Math.floor(1000 + Math.random() * 9000)}`;
    const order: Order = {
      id,
      customer: { ...form },
      payment: paymentMethods.find((m) => m.id === payment)?.name ?? payment,
      items: items.map((x) => ({ id: x.p.id, name: x.p.name, price: x.p.price, qty: x.qty })),
      total,
      status: "جديد",
      date: Date.now(),
    };

    const msg = [
      `طلب جديد من موقع إيجي دنت`,
      `رقم الطلب: ${id}`,
      `━━━━━━━━━━`,
      `الاسم: ${form.name}`,
      `العيادة: ${form.clinic}`,
      `التليفون: ${form.phone}`,
      form.notes ? `ملاحظات: ${form.notes}` : "",
      `━━━━━━━━━━`,
      ...order.items.map((i) => `• ${i.name} × ${i.qty} = ${fmt(i.price * i.qty)} جنيه`),
      `━━━━━━━━━━`,
      `الإجمالي: ${fmt(total)} جنيه${freeShip ? " (شحن مجاني)" : ""}`,
      `طريقة الدفع: ${order.payment}`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`;
    setWaUrl(url);
    setOrderId(id);

    setTimeout(() => {
      addOrder(order);
      clear();
      setStage("success");
      window.open(url, "_blank");
    }, 1100);
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
                  رقم الطلب <span className="font-display font-black text-volt-300" dir="ltr">{orderId}</span> —
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
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                        onChange={(e) => setForm({ ...form, clinic: e.target.value })}
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
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                              onClick={() => setPayment(m.id)}
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
                      <span>المنتجات</span>
                      <span>{fmt(total)} جنيه</span>
                    </div>
                    <div className="flex justify-between text-frost-400">
                      <span>الشحن</span>
                      <span className={freeShip ? "font-bold text-emerald-400" : ""}>
                        {freeShip ? "مجاني" : "يُحدد عند التأكيد"}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[var(--line-2)] pt-3 font-display text-xl font-black">
                      <span>الإجمالي</span>
                      <span className="text-[var(--text-primary)]">{fmt(total)} <span className="text-xs text-frost-400">جنيه</span></span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={stage === "sending"}
                    className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 py-4 font-display text-lg font-black text-[var(--onaccent)] shadow-[0_14px_36px_rgba(34,211,238,0.35)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
                  >
                    {stage === "sending" ? (
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
