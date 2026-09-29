import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";

type ChatMsg = { role: "user" | "model"; text: string };

function getSmartReply(message: string, products: any[]): string {
  const msg = message.trim().toLowerCase();
  
  if (msg.includes("السلام") || msg.includes("مرحبا") || msg.includes("هاي")) {
    return "أهلاً بيك في إيجي دنت! 🦷\n\nممكن أساعدك في:\n• معرفة الأسعار\n• المقارنة بين المنتجات\n• معلومات التوصيل\n\nاسألني أي حاجة!";
  }
  
  if (msg.includes("سعر") || msg.includes("بكام") || msg.includes("ثمن")) {
    if (msg.includes("نترايل") || msg.includes("جوانت")) {
      const results = products.filter(p => 
        p.name && p.name.includes("نترايل")
      ).slice(0, 4);
      
      if (results.length > 0) {
        const list = results.map(p => `• ${p.name}: ${p.price} جنيه`).join("\n");
        return `أنواع النترايل المتوفرة:\n\n${list}\n\nعايز تفاصيل أكتر عن نوع معين؟`;
      }
    }
    
    if (msg.includes("أسود") || msg.includes("اسود")) {
      const results = products.filter(p => 
        p.name && p.name.includes("أسود")
      ).slice(0, 3);
      
      if (results.length > 0) {
        const list = results.map(p => `• ${p.name}: ${p.price} جنيه`).join("\n");
        return `المنتجات السودا:\n\n${list}`;
      }
    }
    
    const words = msg.replace(/سعر|بكام|ثمن/g, '').trim().split(' ').filter(w => w.length > 2);
    
    for (const word of words) {
      const found = products.find(p => 
        p.name && p.name.toLowerCase().includes(word)
      );
      
      if (found) {
        return `${found.name}\n💰 السعر: ${found.price} جنيه${found.oldPrice ? `\n🏷️ السعر قبل الخصم: ${found.oldPrice} جنيه` : ''}${found.desc ? `\n\n${found.desc}` : ''}`;
      }
    }
    
    return "ممكن تكتب اسم المنتج بالظبط؟\nمثلاً: بكام النترايل الأسود؟";
  }
  
  if (msg.includes("فرق") || msg.includes("قارن")) {
    return "عشان أقارنلك بين منتجين، قولي أسمائهم.\nمثال: إيه الفرق بين الروبي والبرايم؟";
  }
  
  if (msg.includes("توصيل") || msg.includes("شحن")) {
    return "🚚 التوصيل:\n\n• لكل محافظات مصر\n• المدة: 2-5 أيام عمل\n• شحن مجاني فوق 2000 جنيه\n• توصيل سريع للقاهرة والجيزة";
  }
  
  if (msg.includes("فرع") || msg.includes("عنوان")) {
    return "📍 فروعنا:\n\n• مدينة نصر\n• القصر العيني\n• 6 أكتوبر\n\nللعناوين التفصيلية كلمنا واتساب 👇";
  }
  
  if (msg.includes("دفع") || msg.includes("فودافون") || msg.includes("كاش")) {
    return "💳 طرق الدفع:\n\n✅ الدفع عند الاستلام\n✅ فودافون كاش\n✅ انستاباي\n✅ تحويل بنكي\n✅ بطاقات الفيزا";
  }
  
  if (msg.includes("ارجاع") || msg.includes("استبدال")) {
    return "↩️ سياسة الإرجاع:\n\n• خلال 14 يوم من الاستلام\n• المنتج غير مستخدم\n• العبوة سليمة\n• فاتورة الشراء موجودة";
  }
  
  const foundProduct = products.find(p => {
    if (!p.name) return false;
    const pName = p.name.toLowerCase();
    return msg.split(' ').some(word => word.length > 2 && pName.includes(word));
  });
  
  if (foundProduct) {
    return `${foundProduct.name}\n💰 ${foundProduct.price} جنيه\n\nعايز تعرف أكتر أو تطلب؟`;
  }
  
  return "أنا مساعد إيجي دنت 🤖\n\nممكن تسأل عن:\n• أسعار المنتجات\n• التوصيل والشحن\n• طرق الدفع\n• سياسة الإرجاع\n\nأو كلمنا مباشرة 👇";
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

    setTimeout(() => {
      const reply = getSmartReply(trimmed, products);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
      setLoading(false);
    }, 600);
  };

  return (
    <>
      {/* ✅ موضع جديد: يمين وأعلى من الواتساب */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="افتح الشات"
        className="fixed bottom-24 right-6 z-[150] grid size-14 place-items-center rounded-full bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-lg transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
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
            className="fixed bottom-40 right-6 z-[150] flex w-[92vw] max-w-sm flex-col rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl overflow-hidden sm:bottom-24"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/10 to-transparent p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
                <MessageCircle className="size-5 text-white" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-black">مساعد إيجي دنت 🤖</p>
                <p className="text-[11px] text-frost-500">اسأل عن أي حاجة!</p>
              </div>
            </div>

            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-frost-400">أهلاً! 👋 جرّب تسأل:</p>
                  <div className="space-y-1 text-xs text-frost-500">
                    <button 
                      onClick={() => sendMessage("بكام النترايل الأسود؟")}
                      className="block w-full text-right hover:text-volt-300 transition-colors"
                    >
                      • بكام النترايل الأسود؟
                    </button>
                    <button 
                      onClick={() => sendMessage("فيه توصيل؟")}
                      className="block w-full text-right hover:text-volt-300 transition-colors"
                    >
                      • فيه توصيل؟
                    </button>
                    <button 
                      onClick={() => sendMessage("طرق الدفع إيه؟")}
                      className="block w-full text-right hover:text-volt-300 transition-colors"
                    >
                      • طرق الدفع إيه؟
                    </button>
                  </div>
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
                placeholder="اسأل عن أي حاجة..."
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
