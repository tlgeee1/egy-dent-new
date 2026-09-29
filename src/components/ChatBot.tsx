import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";

type ChatMsg = { role: "user" | "model"; text: string };

function getIntelligentReply(message: string, products: any[]): string {
  const msg = message.trim().toLowerCase();
  
  // ترحيب
  if (msg.includes("السلام") || msg.includes("صباح") || msg.includes("مساء") || msg.includes("هاي")) {
    return "أهلاً بيك في إيجي دنت! 🦷\nأنا هنا عشان أساعدك.\n\n• اسأل عن الأسعار\n• قارن بين المنتجات\n• اعرف عن التوصيل والدفع\n\nاكتب سؤالك...";
  }
  
  // مقارنات ذكية
  if (msg.includes("فرق") || msg.includes("قارن") || msg.includes("مقارنة")) {
    // رابر بيز عادي vs ادشن سيليكون
    if ((msg.includes("رابر") || msg.includes("بيز")) && (msg.includes("عادي") && msg.includes("ادشن") || msg.includes("سيليكون"))) {
      const normal = products.filter(p => p.cat === "rubber-base" && !p.name.includes("ادشن"));
      const addition = products.filter(p => p.cat === "rubber-base-addition" || p.name.includes("ادشن"));
      
      return `الفرق بين رابر بيز عادي وادشن سيليكون:\n\n🔹 رابر بيز عادي:\n• أرخص في السعر (${normal[0]?.price || '490'} - ${normal[normal.length-1]?.price || '1980'} جنيه)\n• سهل الاستخدام\n• وقت عمل أقصر\n• دقة جيدة\n\n🔸 ادشن سيليكون:\n• أغلى (${addition[0]?.price || '1400'} - ${addition[addition.length-1]?.price || '2980'} جنيه)\n• دقة عالية جداً\n• استقرار أبعاد ممتاز\n• نتائج احترافية\n\nالادشن أفضل للحالات الدقيقة والتيجان.`;
    }
    
    // روبي vs شوفو
    if ((msg.includes("روبي") || msg.includes("ruby")) && (msg.includes("شوفو") || msg.includes("shofu"))) {
      const ruby = products.find(p => p.name.includes("روبي"));
      const shofu = products.find(p => p.name.includes("شوفو عادي"));
      
      return `المقارنة بين الروبي والشوفو:\n\n💎 روبي:\n• السعر: ${ruby?.price || '180'} جنيه\n• اقتصادي جداً\n• جودة جيدة للحالات البسيطة\n• كمبوزيت صيني\n\n✨ شوفو:\n• السعر: ${shofu?.price || '950'} جنيه\n• ياباني الصنع\n• جودة ممتازة\n• ثبات لون عالي\n• نتيجة جمالية أفضل\n\nالشوفو أفضل للحالات الأمامية، الروبي كويس للخلفية.`;
    }
    
    // برايم vs ميتا
    if ((msg.includes("برايم") || msg.includes("prime")) && (msg.includes("ميتا") || msg.includes("meta"))) {
      const prime = products.find(p => p.name.includes("برايم"));
      const meta = products.find(p => p.name.includes("ميتا"));
      
      return `الفرق بين البرايم والميتا:\n\n🔹 برايم: ${prime?.price || '200'} جنيه\n• كمبوزيت اقتصادي\n• جودة متوسطة\n• مناسب للحشوات العادية\n\n🔸 ميتا: ${meta?.price || '280'} جنيه\n• جودة أعلى\n• ثبات أفضل\n• نتيجة جمالية أحسن\n\nالميتا أفضل بفارق سعر بسيط.`;
    }
    
    return "عشان أقارنلك بين منتجين، قول أسمائهم بالظبط.\nمثال:\n• ايه الفرق بين الروبي والشوفو؟\n• قارنلي بين رابر بيز عادي وادشن سيليكون";
  }
  
  // أسعار ومنتجات
  if (msg.includes("سعر") || msg.includes("بكام") || msg.includes("ثمن")) {
    // نترايل
    if (msg.includes("نترايل") || msg.includes("نتيرايل")) {
      const gloves = products.filter(p => p.name && p.name.includes("نترايل"));
      
      if (msg.includes("أسود") || msg.includes("اسود")) {
        const black = gloves.find(p => p.name.includes("أسود"));
        return black ? `${black.name}\n💰 السعر: ${black.price} جنيه` : "النترايل الأسود متوفر بـ 170 جنيه للعلبة";
      }
      
      if (msg.includes("أزرق") || msg.includes("ازرق")) {
        const blue = gloves.filter(p => p.name.includes("أزرق") || p.name.includes("ازرق"));
        if (blue.length > 0) {
          const list = blue.map(g => `• ${g.name}: ${g.price} جنيه`).join("\n");
          return `أنواع النترايل الأزرق:\n\n${list}`;
        }
      }
      
      if (gloves.length > 0) {
        const list = gloves.slice(0, 4).map(g => `• ${g.name}: ${g.price} جنيه`).join("\n");
        return `أنواع النترايل المتوفرة:\n\n${list}\n\nعايز نوع معين؟`;
      }
    }
    
    // جوانتي
    if (msg.includes("جوانت") || msg.includes("قفاز")) {
      const gloves = products.filter(p => 
        p.name && (p.name.includes("جوانت") || p.name.includes("نترايل") || p.name.includes("لاتكس"))
      ).slice(0, 5);
      
      if (gloves.length > 0) {
        const list = gloves.map(g => `• ${g.name}: ${g.price} جنيه`).join("\n");
        return `أنواع الجوانتيات:\n\n${list}\n\nعايز تعرف عن نوع معين؟`;
      }
    }
    
    // كمبوزيت
    if (msg.includes("كمبوزيت")) {
      const comp = products.filter(p => p.cat && p.cat.includes("composite")).slice(0, 6);
      if (comp.length > 0) {
        const list = comp.map(c => `• ${c.name}: ${c.price} جنيه`).join("\n");
        return `أنواع الكمبوزيت (من الأرخص للأغلى):\n\n${list}\n\nمحتاج تفاصيل عن نوع معين؟`;
      }
    }
    
    // بحث عام
    const words = msg.replace(/سعر|بكام|ثمن|عايز|محتاج/g, '').trim().split(' ').filter(w => w.length > 2);
    
    for (const word of words) {
      const found = products.find(p => p.name && p.name.toLowerCase().includes(word));
      if (found) {
        return `✅ ${found.name}\n💰 السعر: ${found.price} جنيه${found.oldPrice ? `\n🏷️ كان: ${found.oldPrice} جنيه` : ''}${found.desc ? `\n\nℹ️ ${found.desc}` : ''}`;
      }
    }
    
    return "ممكن تكتب اسم المنتج أوضح؟\nأو شوف كل المنتجات من القائمة الرئيسية.";
  }
  
  // معلومات عامة
  if (msg.includes("توصيل") || msg.includes("شحن")) {
    return "🚚 التوصيل:\n\n• متاح لكل محافظات مصر\n• المدة: 2-5 أيام عمل\n• 📦 شحن مجاني للطلبات فوق 2000 جنيه\n• ⚡ توصيل سريع للقاهرة والجيزة (1-2 يوم)\n\nعايز تعرف سعر الشحن لمنطقتك؟ كلمنا واتساب 👇";
  }
  
  if (msg.includes("فرع") || msg.includes("عنوان") || msg.includes("مكان")) {
    return "📍 فروع إيجي دنت:\n\n🏢 مدينة نصر\n🏢 القصر العيني  \n🏢 6 أكتوبر\n\nللعناوين التفصيلية ومواعيد العمل:\n📱 01151605515 (واتساب)";
  }
  
  if (msg.includes("دفع") || msg.includes("كاش") || msg.includes("فيزا")) {
    return "💳 طرق الدفع المتاحة:\n\n✅ الدفع عند الاستلام (COD)\n✅ فودافون كاش\n✅ انستاباي\n✅ تحويل بنكي\n✅ بطاقات الائتمان (فيزا/ماستركارد)\n\nاختار الأنسب ليك عند الطلب!";
  }
  
  if (msg.includes("ارجاع") || msg.includes("استبدال") || msg.includes("استرجاع")) {
    return "↩️ سياسة الإرجاع والاستبدال:\n\n⏰ خلال 14 يوم من الاستلام\n\n✅ الشروط:\n• المنتج غير مستخدم\n• العبوة الأصلية سليمة ومغلقة\n• فاتورة الشراء موجودة\n• المنتج في حالته الأصلية\n\nلو في مشكلة كلمنا فوراً!";
  }
  
  // شكر
  if (msg.includes("شكر") || msg.includes("متشكر")) {
    return "العفو يا فندم! 😊\nأي خدمة تانية أنا تحت أمرك.\n\nلو محتاج مساعدة كلمنا واتساب 👇";
  }
  
  // بحث في كل المنتجات
  const generalSearch = msg.split(' ').filter(w => w.length > 2);
  for (const word of generalSearch) {
    const matches = products.filter(p => 
      p.name && p.name.toLowerCase().includes(word)
    );
    
    if (matches.length === 1) {
      const p = matches[0];
      return `✅ ${p.name}\n💰 ${p.price} جنيه${p.oldPrice ? `\n🏷️ السعر القديم: ${p.oldPrice} جنيه` : ''}`;
    }
    
    if (matches.length > 1 && matches.length <= 5) {
      const list = matches.map(p => `• ${p.name}: ${p.price} جنيه`).join("\n");
      return `لقيت ${matches.length} منتج مطابق:\n\n${list}\n\nعايز تفاصيل عن أي واحد؟`;
    }
  }
  
  // رد افتراضي
  return "أنا مساعد إيجي دنت الذكي 🤖\n\nممكن أساعدك في:\n\n💰 معرفة الأسعار\n⚖️ المقارنة بين المنتجات\n🚚 معلومات التوصيل\n💳 طرق الدفع\n↩️ سياسة الإرجاع\n\nاسألني أي حاجة أو كلمنا واتساب 👇";
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
      const reply = getIntelligentReply(trimmed, products);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
      setLoading(false);
    }, 500);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="افتح الشات"
        className="fixed bottom-24 right-6 z-[150] grid size-14 place-items-center rounded-full bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-lg transition-transform hover:scale-105 sm:bottom-6"
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-40 right-6 z-[150] w-[92vw] max-w-sm rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl overflow-hidden sm:bottom-24"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/10 to-transparent p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
                <MessageCircle className="size-5 text-white" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-black">مساعد إيجي دنت 🤖</p>
                <p className="text-[11px] text-frost-500">ذكي • سريع • دقيق</p>
              </div>
            </div>

            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-frost-400 mb-3">👋 أهلاً! جرّب تسأل:</p>
                  {[
                    "ايه الفرق بين رابر بيز عادي وادشن سيليكون؟",
                    "قارنلي بين الروبي والشوفو",
                    "بكام النترايل الأسود؟"
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-right px-3 py-2 rounded-lg bg-ink-950/60 hover:bg-volt-500/10 text-xs text-frost-400 hover:text-volt-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3 mt-3">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "text-left" : "text-right"}>
                    <span className={m.role === "user" ? "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-volt-500/15 px-3 py-2 text-sm" : "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-950/70 px-3 py-2 text-sm leading-relaxed"}>
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

            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2 border-t border-[var(--line-2)] p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اسأل عن أي حاجة..."
                maxLength={500}
                disabled={loading}
                className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-sm outline-none focus:border-volt-500/50"
              />
              <button type="submit" disabled={loading || !input.trim()} className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white disabled:opacity-40">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>

            <div className="border-t border-[var(--line-2)] p-3">
              <a href="https://wa.me/201151605515" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-400 to-emerald-600 py-2.5 text-sm font-black text-white hover:scale-[1.02] transition-transform">
                💬 كلمنا واتساب
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
