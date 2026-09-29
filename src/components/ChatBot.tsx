import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";

type ChatMsg = { role: "user" | "model"; text: string };

// ✅ ردود ذكية محلية (بدون API)
function getSmartReply(message: string, products: any[]): string {
  const msg = message.trim().toLowerCase();
  
  // ترحيب
  if (msg.includes("السلام") || msg.includes("مرحبا") || msg.includes("هاي") || msg.includes("هلو")) {
    return "أهلاً وسهلاً في إيجي دنت! 🦷\nإزاي أقدر أساعدك؟\n\n• اسأل عن الأسعار\n• قارن بين المنتجات\n• اعرف معلومات التوصيل";
  }
  
  // أسعار ومنتجات
  if (msg.includes("سعر") || msg.includes("بكام") || msg.includes("ثمن")) {
    // نترايل / جوانتي
    if (msg.includes("نترايل") || msg.includes("جوانت") || msg.includes("قفاز")) {
      const gloves = products.filter(p => 
        !p.showcaseOnly && (
          p.name.toLowerCase().includes("نترايل") ||
          p.name.toLowerCase().includes("جوانت") ||
          p.name.toLowerCase().includes("لاتكس")
        )
      );
      
      if (gloves.length > 0) {
        const list = gloves.slice(0, 5).map(g => `• ${g.name}: ${g.price} جنيه`).join("\n");
        return `الجوانتيات المتوفرة:\n\n${list}\n\n${gloves.length > 5 ? `وفيه ${gloves.length - 5} نوع تاني` : ""}`;
      }
    }
    
    // أسود
    if (msg.includes("أسود") || msg.includes("اسود")) {
      const black = products.filter(p => !p.showcaseOnly && p.name.toLowerCase().includes("أسود"));
      if (black.length > 0) {
        const list = black.slice(0, 3).map(g => `• ${g.name}: ${g.price} جنيه`).join("\n");
        return `المنتجات السودا:\n\n${list}`;
      }
    }
    
    // كمبوزيت
    if (msg.includes("كمبوزيت")) {
      const comp = products.filter(p => !p.showcaseOnly && p.cat === "composites");
      if (comp.length > 0) {
        const list = comp.slice(0, 5).map(g => `• ${g.name}: ${g.price} جنيه`).join("\n");
        return `أنواع الكمبوزيت:\n\n${list}`;
      }
    }
    
    // بحث عام
    const words = msg.split(" ").filter(w => w.length > 2);
    const found = products.find(p => {
      if (p.showcaseOnly) return false;
      const pName = p.name.toLowerCase();
      return words.some(w => pName.includes(w));
    });
    
    if (found) {
      return `${found.name}\n💰 السعر: ${found.price} جنيه\n\n${found.desc || ""}`;
    }
    
    return "ممكن توضح أكتر إيه المنتج اللي محتاجه؟\nأو شوف الكتالوج من الموقع.";
  }
  
  // مقارنة
  if (msg.includes("فرق") || msg.includes("قارن") || msg.includes("مقارنة")) {
    return "عشان أقارنلك، قولي أسماء المنتجين.\nمثال: إيه الفرق بين الروبي والشوفو؟";
  }
  
  // توصيل
  if (msg.includes("توصيل") || msg.includes("شحن") || msg.includes("ديليفري")) {
    return "🚚 التوصيل لكل مصر خلال 2-5 أيام\n📦 شحن مجاني للطلبات فوق 2000 جنيه\n⚡ توصيل سريع للقاهرة والجيزة";
  }
  
  // فروع
  if (msg.includes("فرع") || msg.includes("عنوان") || msg.includes("مكان")) {
    return "📍 فروعنا:\n\n• مدينة نصر\n• القصر العيني\n• 6 أكتوبر\n\nللتفاصيل: 01151605515";
  }
  
  // دفع
  if (msg.includes("دفع") || msg.includes("كاش")) {
    return "💳 طرق الدفع:\n\n✅ الدفع عند الاستلام\n✅ فودافون كاش\n✅ انستاباي\n✅ تحويل بنكي";
  }
  
  // إرجاع
  if (msg.includes("ارجاع") || msg.includes("استبدال")) {
    return "↩️ الاستبدال خلال 14 يوم\n\nشروط:\n• المنتج غير مستخدم\n• العبوة سليمة\n• فاتورة الشراء موجودة";
  }
  
  // رد افتراضي
  return "أنا مساعد إيجي دنت 🤖\n\nممكن أساعدك في:\n• الأسعار والمنتجات\n• التوصيل والشحن\n• طرق الدفع\n• الإرجاع والاستبدال\n\nأو كلمنا: 01151605515";
}

export default function ChatBot() {
  const { products } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    // رد فوري
    setTimeout(() => {
      const reply = getSmartReply(trimmed, products);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
      setLoading(false);
    }, 800);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="افتح الشات"
        className="fixed bottom-6 left-6 z-[150] grid size-14 place-items-center rounded-full bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-lg transition-transform hover:scale-105"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90 }} animate={{ rotate: 0 }}>
              <X className="size-6" />
            </motion.span>
          ) : (
            <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <MessageCircle className="size-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 z-[150] flex w-[92vw] max-w-sm flex-col rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/10 to-transparent p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
                <MessageCircle className="size-5 text-white" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-black">مساعد إيجي دنت 🤖</p>
                <p className="text-[11px] text-frost-500">اسأل عن المنتجات والأسعار</p>
              </div>
            </div>

            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="text-xs text-frost-400">
                  أهلاً! 👋 اسألني عن أي منتج أو سعر.
                </div>
              )}

              <div className="space-y-3 mt-3">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "text-left" : "text-right"}>
                    <span
                      className={
                        m.role === "user"
                          ? "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-volt-500/15 px-3 py-2 text-sm"
                          : "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-950/70 px-3 py-2 text-sm leading-relaxed"
                      }
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
                {loading && (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-ink-950/70 px-3 py-2 text-sm text-frost-400">
                      <Loader2 className="size-3.5 animate-spin" />
                      بيفكر...
                    </span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

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
                placeholder="اكتب سؤالك..."
                maxLength={300}
                disabled={loading}
                className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-sm outline-none focus:border-volt-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white disabled:opacity-40"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>

            <div className="border-t border-[var(--line-2)] p-3">
              <a
                href="https://wa.me/201151605515"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-400 to-emerald-600 py-2.5 text-sm font-black text-white hover:scale-[1.02] transition-transform"
              >
                💬 كلمنا واتساب
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
