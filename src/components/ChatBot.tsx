import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  X,
  ChevronRight,
  Send,
  ShoppingBag,
  Plus,
  Check,
  PackageSearch,
  Truck,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useStore, type Product } from "@/context/StoreContext";
import { useCart } from "@/context/CartContext";
import { fmt } from "@/data/data";

const FAQS: { q: string; a: string }[] = [
  {
    q: "التوصيل بياخد قد إيه؟",
    a: "التوصيل بيوصل خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام عمل لباقي المحافظات.",
  },
  {
    q: "المنتجات أصلية ومضمونة؟",
    a: "أيوه، كل منتجاتنا أصلية 100% ومستوردة من وكلاء معتمدين، ومضمونة بالكامل.",
  },
  {
    q: "طرق الدفع المتاحة إيه؟",
    a: "متاح الدفع عند الاستلام (كاش)، فودافون كاش، انستاباي، والتحويلات البنكية.",
  },
  {
    q: "الشحن مجاني؟",
    a: "الشحن مجاني للطلبات الكبيرة اللي بتتعدى الحد الأدنى المحدد في المتجر.",
  },
  {
    q: "سياسة الاستبدال والإرجاع؟",
    a: "متاح الاسترجاع والاستبدال خلال 14 يوم من الاستلام طالما المنتج في عبوته الأصلية السليمة.",
  },
];

type ChatMsg = {
  role: "user" | "model";
  text: string;
  items?: Product[];
  actionType?: "tracking" | "categories" | "general";
};

type View = { screen: "menu" } | { screen: "answer"; index: number } | { screen: "ai" };

export default function ChatBot() {
  const { settings, products, orders } = useStore();
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ screen: "menu" });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [addedId, setAddedId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const waLink = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("أهلاً، بتواصل معاكم بخصوص استفسار من المتجر")}`
    : undefined;

  const toggle = () => {
    setOpen((v) => !v);
    if (open) setView({ screen: "menu" });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  const handleAddToCart = (product: Product) => {
    add(product.id, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  // محرك الإجابة والبحث التفاعلي والذكي
  const processQuery = (rawText: string): ChatMsg => {
    const q = rawText.trim().toLowerCase();

    // 1) فحص تتبع الطلب (لو العميل كتب كود الطلب أو كلمة تتبع)
    if (q.includes("eg-") || q.includes("طلب") || q.includes("اوردر") || q.includes("أوردر") || q.includes("تتبع")) {
      const foundOrder = orders.find(
        (o) => o.id.toLowerCase() === q || q.includes(o.id.toLowerCase())
      );

      if (foundOrder) {
        return {
          role: "model",
          text: `📦 بيانات طلبك رقم (${foundOrder.id}):\n\n• العميل: ${foundOrder.customer.name}\n• العيادة: ${foundOrder.customer.clinic}\n• الإجمالي: ${fmt(foundOrder.total)} جنيه\n• حالة الطلب الحالية: 🟢 [ ${foundOrder.status} ]\n\nلو محتاج تعديل أو استعجال كلمنا واتساب فوراً!`,
        };
      } else if (q.includes("eg-")) {
        return {
          role: "model",
          text: "لم نتمكن من العثور على طلب بهذا الكود. يرجى التأكد من كود الطلب المكتوب أو التواصل معنا عبر الواتساب للمساعدة.",
        };
      }
    }

    // 2) المقارنات الطبية التخصصية
    if (q.includes("فرق") || q.includes("قارن") || q.includes("مقارنة") || q.includes("احسن") || q.includes("أحسن") || q.includes("افضل")) {
      if ((q.includes("رابر") || q.includes("بيز")) && (q.includes("ادشن") || q.includes("سيليكون") || q.includes("عادي"))) {
        const rubberProds = products.filter((p) => p.cat.includes("rubber") || p.name.includes("زيتا") || p.name.includes("elite")).slice(0, 3);
        return {
          role: "model",
          text: "الفرق بين الرابر بيز العادي والادشن سيليكون 🦷:\n\n🔹 الرابر بيز العادي (C-Silicone):\n• اقتصادي وسهل الاستخدام، ممتاز للمقاسات المبدئية.\n• لازم يتصب سريعاً.\n\n🔸 الادشن سيليكون (A-Silicone):\n• دقة فائقة ميكرونية وثبات أبعاد يفضل أيام بدون تشوه.\n• مثالي للتيجان والجسور والزرعات.\n\n👇 دي أشهر خامات الطبعات المتوفرة فوراً:",
          items: rubberProds,
        };
      }

      if ((q.includes("روبي") || q.includes("ruby")) && (q.includes("شوفو") || q.includes("shofu"))) {
        const compProds = products.filter((p) => p.name.includes("روبي") || p.name.includes("شوفو")).slice(0, 2);
        return {
          role: "model",
          text: "المقارنة بين روبي وشوفو كمبوزيت 💎:\n\n• روبي (180ج): اقتصادي جداً وممتاز للحشوات الخلفية العادية.\n• شوفو الياباني (950ج): بريميوم تجميلي بتقنية Giomer، لمعان وثبات فائق للأسنان الأمامية.\n\n👇 يمكنك إضافة أيهم للسلة مباشرة:",
          items: compProds,
        };
      }
    }

    // 3) البحث عن الكمبوزيت
    if (q.includes("كمبوزيت") || q.includes("كومبوزيت") || q.includes("حشو")) {
      const comps = products.filter((p) => p.cat.includes("composite") || p.name.includes("فيل") || p.name.includes("شوفو")).slice(0, 4);
      return {
        role: "model",
        text: `متوفر لدينا تشكيلة واسعة من الكمبوزيت من الاقتصادي حتى التجميلي البريميوم (${products.filter(p=>p.cat.includes("composite")).length} صنف). إليك أبرز الخيارات:`,
        items: comps,
      };
    }

    // 4) البحث عن الجوانتيات والماسكات
    if (q.includes("جوانت") || q.includes("نترايل") || q.includes("لاتكس") || q.includes("قفاز") || q.includes("ماسك")) {
      const gloves = products.filter((p) => p.name.includes("نترايل") || p.name.includes("لاتكس") || p.name.includes("ماسك")).slice(0, 4);
      return {
        role: "model",
        text: "متوفر جوانتيات طبية مستوردة وماسكات معتمدة بأعلى درجات الحماية والسماكة:",
        items: gloves,
      };
    }

    // 5) البحث عن الرابر بيز والطبعات
    if (q.includes("رابر") || q.includes("بيز") || q.includes("طبعة") || q.includes("سيليكون") || q.includes("زيتا")) {
      const impressions = products.filter((p) => p.cat.includes("rubber") || p.name.includes("زيتا") || p.name.includes("سيلكسيل") || p.name.includes("elite")).slice(0, 4);
      return {
        role: "model",
        text: "خامات الطبعات وسيليكون الأسنان (عادي وادشن سيليكون):",
        items: impressions,
      };
    }

    // 6) البحث عن الألجينات
    if (q.includes("الجينيت") || q.includes("الجنيت") || q.includes("جينات") || q.includes("كروموبان") || q.includes("هيدروجم")) {
      const alginates = products.filter((p) => p.cat.includes("alginate") || p.name.includes("كروموبان") || p.name.includes("زيتالجين") || p.name.includes("هيدروجم")).slice(0, 4);
      return {
        role: "model",
        text: "أفضل أنواع الألجينات الإيطالية والمستوردة سريعة الخلط وعالية الدقة:",
        items: alginates,
      };
    }

    // 7) البحث بالاسم المباشر لأي منتج
    const searchTerms = q.replace(/سعر|بكام|ثمن|عندكم|عايز|محتاج/g, "").trim().split(" ").filter((w) => w.length > 1);
    for (const term of searchTerms) {
      const matches = products.filter((p) => p.name.toLowerCase().includes(term));
      if (matches.length > 0) {
        return {
          role: "model",
          text: `وجدت لك المنتجات التالية المطابقة لبحثك:`,
          items: matches.slice(0, 4),
        };
      }
    }

    // 8) الاستفسارات العامة (الشحن، الفروع، الدفع)
    if (q.includes("شحن") || q.includes("توصيل") || q.includes("ديليفري")) {
      return {
        role: "model",
        text: "🚚 الشحن والتوصيل:\n\n• متاح الشحن لجميع محافظات مصر.\n• مدة التوصيل: خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام لباقي المحافظات.\n• شحن مجاني للطلبات المؤهلة.",
      };
    }

    if (q.includes("فرع") || q.includes("عنوان") || q.includes("مكان")) {
      return {
        role: "model",
        text: "📍 فروع إيجي دنت:\n\n🏢 فرع مدينة نصر\n🏢 فرع القصر العيني\n🏢 فرع 6 أكتوبر\n\n📱 تواصل معنا: 01151605515",
      };
    }

    if (q.includes("دفع") || q.includes("كاش") || q.includes("فودافون") || q.includes("انستاباي")) {
      return {
        role: "model",
        text: "💳 طرق الدفع:\n\n✅ الدفع عند الاستلام كاش\n✅ فودافون كاش والمحافظ الإلكترونية\n✅ انستاباي InstaPay\n✅ تحويل بنكي",
      };
    }

    // الرد الافتراضي الذكي
    return {
      role: "model",
      text: "أهلاً يا دكتور! 🦷 أنا مساعدك الذكي في متجر إيجي دنت.\n\nتقدر تسألني عن أي خامة أو تكتب اسم المنتج وتضيفه للسلة مباشرة من هنا، أو تتبع طلبك بكتابة رقم الأوردر!",
    };
  };

  const handleSend = (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText) return;

    setMessages((prev) => [...prev, { role: "user", text: queryText }]);
    if (!textToSend) setInput("");

    setTimeout(() => {
      const response = processQuery(queryText);
      setMessages((prev) => [...prev, response]);
    }, 250);
  };

  return (
    <>
      {/* زرار الشات العائم */}
      <button
        onClick={toggle}
        aria-label={open ? "إغلاق الشات" : "افتح المساعد الذكي"}
        className="fixed bottom-24 right-5 z-[150] grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-[0_12px_32px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <X className="size-6" />
            </motion.span>
          ) : (
            <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, rotate: 90 }}>
              <MessageCircle className="size-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* نافذة الشات الذكية التفاعلية */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-40 right-5 z-[150] flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl sm:bottom-24 sm:right-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/15 via-ink-900 to-ink-900 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700 shadow-[0_4px_16px_rgba(34,211,238,0.3)]">
                  <Sparkles className="size-5 text-[var(--onaccent)]" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-sm font-black text-white">مساعد إيجي دنت</p>
                    <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">متصل الآن</span>
                  </div>
                  <p className="text-[11px] text-frost-500">طلب فوري • استفسارات • تتبع</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[22rem] min-h-[17rem] overflow-y-auto p-4">
              {view.screen === "menu" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-volt-500/30 bg-volt-500/10 p-3 text-xs text-frost-200">
                    <p className="font-bold text-volt-300">أهلاً بك يا دكتور! 🦷</p>
                    <p className="mt-1 leading-relaxed text-frost-400">تقدر تسألني عن أي خامة أو تطلب منتجك مباشرة من الشات، أو اختر من الأسئلة الشائعة:</p>
                  </div>

                  <div className="space-y-1.5">
                    {FAQS.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => setView({ screen: "answer", index: i })}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3.5 py-2.5 text-right text-xs font-bold text-frost-300 transition-colors hover:border-volt-500/50 hover:text-volt-300"
                      >
                        {f.q}
                        <ChevronRight className="size-3.5 rotate-180 text-frost-500" />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setView({ screen: "ai" })}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-volt-400 to-volt-600 py-2.5 text-xs font-black text-[var(--onaccent)] shadow-[0_4px_16px_rgba(34,211,238,0.25)] transition-transform hover:scale-[1.02]"
                  >
                    <MessageCircle className="size-4" />
                    ابدأ المحادثة والبحث الذكي
                  </button>
                </div>
              )}

              {view.screen === "answer" && (
                <div className="space-y-3">
                  <button
                    onClick={() => setView({ screen: "menu" })}
                    className="flex items-center gap-1 text-xs font-bold text-frost-400 hover:text-volt-300"
                  >
                    <ChevronRight className="size-3.5" />
                    رجوع للأسئلة
                  </button>
                  <div className="rounded-2xl border border-[var(--line-3)] bg-ink-950/70 p-4">
                    <p className="font-display text-sm font-black text-volt-300">{FAQS[view.index].q}</p>
                    <p className="mt-2 text-xs leading-relaxed text-frost-300">{FAQS[view.index].a}</p>
                  </div>
                  <button
                    onClick={() => setView({ screen: "ai" })}
                    className="w-full rounded-xl border border-[var(--line-3)] py-2 text-xs font-bold text-frost-300 hover:bg-[var(--fill-4)]"
                  >
                    اسأل سؤالاً آخر
                  </button>
                </div>
              )}

              {view.screen === "ai" && (
                <div className="flex h-full flex-col">
                  <div className="mb-3 flex items-center justify-between border-b border-[var(--line-2)] pb-2">
                    <button
                      onClick={() => setView({ screen: "menu" })}
                      className="flex items-center gap-1 text-xs font-bold text-frost-400 hover:text-volt-300"
                    >
                      <ChevronRight className="size-3.5" />
                      رجوع للقائمة
                    </button>
                    <span className="text-[10px] text-frost-500">مساعد إيجي دنت التفاعلي</span>
                  </div>

                  {messages.length === 0 && (
                    <div className="my-auto text-center space-y-2 py-4">
                      <PackageSearch className="size-8 mx-auto text-volt-400/60 animate-pulse" />
                      <p className="text-xs font-bold text-frost-300">اكتب اسم الصنف أو المقارنة اللي بتدور عليها</p>
                      <p className="text-[11px] text-frost-500">مثال: "بكام النترايل الأسود؟" أو "الفرق بين رابر بيز عادي وادشن"</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={m.role === "user" ? "text-left" : "text-right"}>
                        <div
                          className={
                            m.role === "user"
                              ? "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-volt-500/15 px-3.5 py-2.5 text-xs text-frost-100"
                              : "inline-block max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-950/80 p-3 text-xs leading-relaxed text-frost-200 border border-[var(--line-3)]"
                          }
                        >
                          <p>{m.text}</p>

                          {/* كروت المنتجات التفاعلية وزرار الشراء المباشر داخل الشات */}
                          {m.items && m.items.length > 0 && (
                            <div className="mt-3 grid gap-2">
                              {m.items.map((prod) => (
                                <div
                                  key={prod.id}
                                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line-2)] bg-ink-900 p-2 text-right"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={prod.img}
                                      alt={prod.name}
                                      className="size-9 shrink-0 rounded-lg object-cover bg-ink-950"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-[11px] font-bold text-frost-200">{prod.name}</p>
                                      <p className="text-[10px] font-black text-volt-300">{fmt(prod.price)} ج</p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleAddToCart(prod)}
                                    className="flex shrink-0 items-center gap-1 rounded-lg bg-volt-500/20 px-2.5 py-1.5 text-[10px] font-black text-volt-300 hover:bg-volt-500 hover:text-[var(--onaccent)] transition-all"
                                  >
                                    {addedId === prod.id ? (
                                      <>
                                        <Check className="size-3 text-emerald-400" />
                                        تم!
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="size-3" />
                                        أضف
                                      </>
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </div>
              )}
            </div>

            {/* أزرار اختصارات سريعة فوق الإدخال */}
            {view.screen === "ai" && (
              <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-1 no-scrollbar border-t border-[var(--line-2)]/40 bg-ink-950/40">
                {[
                  { label: "🧤 جوانتيات", query: "أنواع الجوانتيات والأسعار" },
                  { label: "🦷 كمبوزيت", query: "أنواع الكمبوزيت المتوفرة" },
                  { label: "🧪 رابر بيز", query: "رابر بيز عادي وادشن" },
                  { label: "🚚 الشحن", query: "تفاصيل الشحن والتوصيل" },
                  { label: "📦 تتبع طلبي", query: "عايز اتابع طلبي" },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip.query)}
                    className="shrink-0 rounded-full border border-[var(--line-3)] bg-ink-900 px-2.5 py-1 text-[10px] font-bold text-frost-300 hover:border-volt-500/50 hover:text-volt-300 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* خانة الإدخال */}
            {view.screen === "ai" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 border-t border-[var(--line-2)] p-3 bg-ink-950/60"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب سؤالك أو اسم الصنف..."
                  className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-900 px-3 py-2 text-xs text-frost-100 outline-none focus:border-volt-500/50 placeholder:text-frost-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="إرسال"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-[var(--onaccent)] disabled:opacity-40 transition-transform active:scale-95"
                >
                  <Send className="size-4" />
                </button>
              </form>
            )}

            {/* زر الواتساب المباشر */}
            {waLink && (
              <div className="border-t border-[var(--line-2)] p-2.5 bg-ink-950/80">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 py-2.5 text-xs font-black text-white shadow-[0_4px_16px_rgba(16,185,129,0.25)] transition-transform hover:scale-[1.01]"
                >
                  <MessageCircle className="size-3.5" />
                  تحدث مع الصيدلي / المبيعات واتساب
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
