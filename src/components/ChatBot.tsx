import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, ChevronRight, Send, Loader2, AlertCircle } from "lucide-react";
import { useStore } from "@/context/StoreContext";

const FAQS: { q: string; a: string }[] = [
  {
    q: "التوصيل بياخد قد إيه؟",
    a: "التوصيل بيوصل خلال 2-4 أيام عمل لمعظم المحافظات، وأسرع من كده للقاهرة والجيزة.",
  },
  {
    q: "المنتجات أصلية؟",
    a: "أيوه، كل منتجاتنا أصلية 100% ومستوردة من وكلاء معتمدين، وبيها ضمان الوكيل.",
  },
  {
    q: "طرق الدفع المتاحة إيه؟",
    a: "الدفع عند الاستلام متاح في كل المحافظات، وكمان تحويل بنكي أو فودافون كاش.",
  },
  {
    q: "الشحن مجاني؟",
    a: "الشحن مجاني للطلبات اللي بتتعدى الحد الأدنى المحدد في المتجر، وغير كده فيه مصاريف شحن بسيطة حسب المحافظة.",
  },
  {
    q: "ممكن أستبدل أو أرجع منتج؟",
    a: "أيوه، تقدر تستبدل أو ترجع المنتج خلال فترة محددة من الاستلام طالما لسه في حالته الأصلية.",
  },
];

type ChatMsg = { role: "user" | "model"; text: string };
type View = { screen: "menu" } | { screen: "answer"; index: number } | { screen: "ai" };

// ✅ Fallback Bot - بيرد لما الـ API يفشل
function getSimpleBotReply(message: string, products: any[]): string {
  const msg = message.trim().toLowerCase();
  
  if (msg.includes("السلام") || msg.includes("مرحبا") || msg.includes("هاي") || msg.includes("هلو")) {
    return "أهلاً وسهلاً! أنا مساعد إيجي دنت 🦷\nإزاي أقدر أساعدك النهاردة؟\n\nممكن تسأل عن:\n• أسعار المنتجات\n• التوصيل والشحن\n• طرق الدفع\n• الإرجاع والاستبدال";
  }
  
  if (msg.includes("سعر") || msg.includes("بكام") || msg.includes("ثمن") || msg.includes("تمن")) {
    // جوانتي
    if (msg.includes("جوانت") || msg.includes("قفاز") || msg.includes("نترايل") || msg.includes("لاتكس")) {
      const gloves = products.filter(p => 
        !p.showcaseOnly && (
          p.name.toLowerCase().includes("جوانت") || 
          p.name.toLowerCase().includes("نترايل") ||
          p.name.toLowerCase().includes("لاتكس")
        )
      );
      
      if (gloves.length > 0) {
        const list = gloves.slice(0, 6).map(g => 
          `• ${g.name}: ${g.price} جنيه`
        ).join("\n");
        return `الجوانتيات المتوفرة:\n\n${list}\n\n${gloves.length > 6 ? `وفيه ${gloves.length - 6} نوع تاني\n\n` : ""}عشان تطلب، اختار المنتج من الكتالوج!`;
      }
    }
    
    // أسود
    if (msg.includes("أسود") || msg.includes("اسود") || msg.includes("black")) {
      const black = products.filter(p => 
        !p.showcaseOnly && p.name.toLowerCase().includes("أسود")
      );
      
      if (black.length > 0) {
        const list = black.slice(0, 4).map(g => 
          `• ${g.name}: ${g.price} جنيه`
        ).join("\n");
        return `المنتجات السودا المتوفرة:\n\n${list}\n\nعايز تطلب؟ اختار من الكتالوج!`;
      }
    }
    
    // بحث عام في اسم المنتج
    const words = msg.split(" ").filter(w => w.length > 2);
    const found = products.find(p => {
      if (p.showcaseOnly) return false;
      const pName = p.name.toLowerCase();
      return words.some(w => pName.includes(w));
    });
    
    if (found) {
      return `${found.name}\n💰 السعر: ${found.price} جنيه\n\n${found.desc ? found.desc + "\n\n" : ""}اضغط على المنتج من الكتالوج عشان تطلب!`;
    }
    
    return "ممكن توضح أكتر إيه المنتج اللي بتدور عليه؟\nأو شوف الكتالوج كامل من القائمة الرئيسية.\n\nلو محتاج مساعدة، كلمنا واتساب: 01151605515";
  }
  
  if (msg.includes("طلب") || msg.includes("اشتري") || msg.includes("عايز") || msg.includes("محتاج")) {
    return "تقدر تطلب من الموقع مباشرة:\n\n1️⃣ اختار المنتج من الكتالوج\n2️⃣ اضغط \"أضف للسلة\"\n3️⃣ أكمل بيانات الطلب\n4️⃣ هنكلمك للتأكيد\n\nأو كلمنا واتساب مباشرة:\n📱 01151605515";
  }
  
  if (msg.includes("توصيل") || msg.includes("شحن") || msg.includes("ديليفري") || msg.includes("delivery")) {
    return "🚚 التوصيل متاح لكل محافظات مصر\n\n📦 الشحن مجاني للطلبات أكثر من 2000 جنيه\n⏱️ التوصيل خلال 2-5 أيام عمل\n🏃 توصيل سريع للقاهرة والجيزة\n\nعايز تعرف سعر الشحن لمنطقتك؟ كلمنا واتساب!";
  }
  
  if (msg.includes("فروع") || msg.includes("عنوان") || msg.includes("مكان") || msg.includes("فين")) {
    return "📍 فروعنا في مصر:\n\n🏢 مدينة نصر\n🏢 القصر العيني\n🏢 6 أكتوبر\n\nللعناوين التفصيلية والمواعيد:\n📱 واتساب: 01151605515";
  }
  
  if (msg.includes("ارجاع") || msg.includes("استبدال") || msg.includes("استرجاع") || msg.includes("return")) {
    return "✅ سياسة الإرجاع والاستبدال:\n\n⏰ خلال 14 يوم من الاستلام\n📋 شروط:\n• المنتج لم يُستخدم\n• العبوة سليمة ومغلقة\n• فاتورة الشراء موجودة\n\n💡 تفاصيل أكتر في صفحة سياسة الإرجاع بالموقع";
  }
  
  if (msg.includes("دفع") || msg.includes("payment") || msg.includes("كاش")) {
    return "💳 طرق الدفع المتاحة:\n\n✅ الدفع عند الاستلام (Cash)\n✅ فودافون كاش\n✅ انستا باي\n✅ تحويل بنكي\n✅ بطاقات الائتمان\n\nاختار الأنسب ليك عند إتمام الطلب!";
  }
  
  if (msg.includes("واتساب") || msg.includes("whatsapp") || msg.includes("رقم") || msg.includes("تليفون")) {
    return "📱 تواصل معانا على واتساب:\n\n01151605515\n\nأو اضغط على زرار \"تكلم مع فريق المبيعات\" تحت 👇";
  }
  
  if (msg.includes("شكرا") || msg.includes("متشكر") || msg.includes("thanks")) {
    return "العفو! 😊\nأي خدمة تاني أنا هنا.\n\nلو محتاج مساعدة، كلمنا واتساب:\n01151605515";
  }
  
  // رد افتراضي
  return "أنا مساعد إيجي دنت الآلي 🤖\n\nممكن أساعدك في:\n• معرفة الأسعار 💰\n• معلومات عن التوصيل 🚚\n• طرق الدفع 💳\n• سياسة الإرجاع ↩️\n• عناوين الفروع 📍\n\nاكتب سؤالك، أو كلم فريقنا واتساب:\n📱 01151605515";
}

export default function ChatBot() {
  const { settings, products } = useStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ screen: "menu" });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false); // ✅ لتتبع فشل الـ API
  const bottomRef = useRef<HTMLDivElement>(null);

  const waLink = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("أهلاً، عندي استفسار من الموقع")}`
    : undefined;

  const toggle = () => {
    setOpen((v) => !v);
    if (open) {
      setView({ screen: "menu" });
      setApiError(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMsg = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setApiError(false);

    try {
      console.log("📤 Sending to API:", trimmed);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 ثانية timeout

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: trimmed, 
          history: messages.slice(-6) // آخر 6 رسائل فقط
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log("📥 API Response:", res.status, res.statusText);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("✅ Response data:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      const reply = data.reply || "معلش، مفيش رد متاح دلوقتي.";
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
      
    } catch (error: any) {
      console.error("❌ Chat error:", error);
      setApiError(true);
      
      // ✅ استخدام Fallback Bot
      const fallbackReply = getSimpleBotReply(trimmed, products);
      setMessages((prev) => [...prev, { 
        role: "model", 
        text: fallbackReply
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* الزرار العائم */}
      <button
        onClick={toggle}
        aria-label={open ? "إغلاق الشات" : "افتح الشات"}
        className="fixed bottom-24 left-5 z-[150] grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-[0_12px_32px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:left-24"
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

      {/* نافذة الشات */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-40 left-5 z-[150] flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl sm:bottom-24 sm:left-24"
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/10 to-transparent p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
                <MessageCircle className="size-5 text-white" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-black">مساعد إيجي دنت</p>
                <p className="text-[11px] text-frost-500">
                  {apiError ? "⚠️ وضع محلي - ردود محدودة" : "🤖 هنرد عليك فورًا"}
                </p>
              </div>
            </div>

            {/* body */}
            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {view.screen === "menu" && (
                <div className="space-y-2">
                  <p className="mb-3 text-xs text-frost-400">أهلاً بيك 👋 اختار سؤالك من تحت، أو اكتب أي سؤال حر:</p>
                  {FAQS.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setView({ screen: "answer", index: i })}
                      className="flex w-full items-center justify-between rounded-2xl border border-[var(--line-3)] bg-ink-950/60 px-4 py-3 text-right text-sm font-bold text-frost-200 transition-colors hover:border-volt-500/50 hover:text-volt-300"
                    >
                      {f.q}
                      <ChevronRight className="size-4 rotate-180 text-frost-500" />
                    </button>
                  ))}
                  <button
                    onClick={() => setView({ screen: "ai" })}
                    className="flex w-full items-center justify-between rounded-2xl border border-volt-500/40 bg-volt-500/10 px-4 py-3 text-right text-sm font-bold text-volt-300 transition-colors hover:bg-volt-500/20"
                  >
                    اسأل سؤال تاني
                    <ChevronRight className="size-4 rotate-180" />
                  </button>
                </div>
              )}

              {view.screen === "answer" && (
                <div>
                  <button
                    onClick={() => setView({ screen: "menu" })}
                    className="mb-3 flex items-center gap-1 text-xs font-bold text-frost-400 hover:text-volt-300"
                  >
                    <ChevronRight className="size-3.5" />
                    رجوع للأسئلة
                  </button>
                  <p className="mb-1 font-display text-sm font-black text-volt-300">{FAQS[view.index].q}</p>
                  <p className="text-sm leading-relaxed text-frost-300">{FAQS[view.index].a}</p>
                </div>
              )}

              {view.screen === "ai" && (
                <div className="flex h-full flex-col">
                  <button
                    onClick={() => setView({ screen: "menu" })}
                    className="mb-3 flex items-center gap-1 text-xs font-bold text-frost-400 hover:text-volt-300"
                  >
                    <ChevronRight className="size-3.5" />
                    رجوع للقائمة
                  </button>

                  {messages.length === 0 && (
                    <div className="mb-3 space-y-2">
                      <p className="text-xs text-frost-400">اكتب سؤالك عن أي منتج أو سعر أو سياسة 👇</p>
                      {apiError && (
                        <div className="flex items-start gap-2 rounded-xl bg-amber-400/10 p-2 text-[11px] text-amber-300">
                          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                          <p>الذكاء الاصطناعي مش متاح حالياً. بنستخدم ردود محفوظة بس.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex-1 space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={m.role === "user" ? "text-left" : "text-right"}>
                        <span
                          className={
                            m.role === "user"
                              ? "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-volt-500/15 px-3 py-2 text-sm text-frost-100"
                              : "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-950/70 px-3 py-2 text-sm leading-relaxed text-frost-200"
                          }
                        >
                          {m.text}
                        </span>
                      </div>
                    ))}
                    {loading && (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-2 rounded-2xl rounded-br-sm bg-ink-950/70 px-3 py-2 text-sm text-frost-400">
                          <Loader2 className="size-3.5 animate-spin" />
                          بيكتب...
                        </span>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>
              )}
            </div>

            {/* input */}
            {view.screen === "ai" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-2 border-t border-[var(--line-2)] p-3"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب سؤالك هنا..."
                  maxLength={500}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-sm text-frost-100 outline-none focus:border-volt-500/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="إرسال"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white transition-opacity disabled:opacity-40"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>
            )}

            {/* footer */}
            {waLink && (
              <div className="border-t border-[var(--line-2)] p-3">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-400 to-emerald-600 py-3 text-sm font-black text-white transition-transform hover:scale-[1.02]"
                >
                  <Send className="size-4" />
                  تكلم مع فريق المبيعات مباشرة
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
