import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";

type ChatMsg = { role: "user" | "model"; text: string };

function getSmartReply(message: string, products: any[]): string {
  const msg = message.trim().toLowerCase();
  
  // ترحيب
  if (msg.includes("السلام") || msg.includes("صباح") || msg.includes("مساء") || msg.includes("هاي") || msg.includes("هلو")) {
    return "أهلاً بيك! 🦷\nأنا مساعد إيجي دنت، اسألني عن:\n• أسعار المنتجات\n• المقارنة بين الأنواع\n• التوصيل والدفع";
  }
  
  // عندكم إيه / المنتجات / الكتالوج
  if (msg.includes("عندكم") || msg.includes("عندك") || msg.includes("منتجات") || msg.includes("كتالوج") || msg === "ايه" || msg === "إيه") {
    const categories = [...new Set(products.map(p => p.cat))].filter(Boolean);
    
    if (msg.includes("كمبوزيت")) {
      const comps = products.filter(p => p.cat && p.cat.includes("composite"));
      if (comps.length > 0) {
        const list = comps.map(c => `• ${c.name}: ${c.price} جنيه`).join("\n");
        return `أنواع الكمبوزيت عندنا (${comps.length} نوع):\n\n${list}\n\nعايز تفاصيل عن نوع معين؟`;
      }
    }
    
    if (msg.includes("جوانت") || msg.includes("نترايل")) {
      const gloves = products.filter(p => p.name && (p.name.includes("جوانت") || p.name.includes("نترايل") || p.name.includes("لاتكس")));
      if (gloves.length > 0) {
        const list = gloves.map(g => `• ${g.name}: ${g.price} جنيه`).join("\n");
        return `أنواع الجوانتيات (${gloves.length} نوع):\n\n${list}`;
      }
    }
    
    // كل المنتجات
    const mainCats = {
      'جوانتيات': products.filter(p => p.name && (p.name.includes('جوانت') || p.name.includes('نترايل') || p.name.includes('لاتكس'))).length,
      'كمبوزيت': products.filter(p => p.cat && p.cat.includes('composite')).length,
      'رابر بيز': products.filter(p => p.cat && p.cat.includes('rubber')).length,
      'ألجينات': products.filter(p => p.cat && p.cat.includes('alginate')).length,
      'أدوات': products.filter(p => p.cat && p.cat.includes('instrument')).length
    };
    
    let catList = '';
    Object.entries(mainCats).forEach(([name, count]) => {
      if (count > 0) catList += `• ${name} (${count} منتج)\n`;
    });
    
    return `عندنا ${products.length} منتج في الفئات دي:\n\n${catList}\nعايز تشوف أي فئة؟`;
  }
  
  // كمبوزيت
  if (msg.includes("كمبوزيت")) {
    const comps = products.filter(p => p.cat && p.cat.includes("composite"));
    
    if (msg.includes("أنواع") || msg.includes("انواع") || msg === "كمبوزيت") {
      if (comps.length > 0) {
        const sorted = comps.sort((a, b) => a.price - b.price);
        const list = sorted.map(c => `• ${c.name}: ${c.price} ج`).join("\n");
        return `عندنا ${comps.length} نوع كمبوزيت:\n\n${list}\n\nمن الأرخص للأغلى 📊`;
      }
    }
    
    if (msg.includes("سعر") || msg.includes("بكام")) {
      const found = comps.find(c => 
        msg.split(' ').some(word => c.name.toLowerCase().includes(word))
      );
      return found ? `${found.name}\n💰 ${found.price} جنيه` : `عندنا ${comps.length} نوع كمبوزيت. عايز أعرضهم كلهم؟`;
    }
  }
  
  // مقارنات
  if (msg.includes("فرق") || msg.includes("قارن")) {
    if (msg.includes("رابر") && msg.includes("عادي") && (msg.includes("ادشن") || msg.includes("سيليكون"))) {
      return `الفرق بين رابر بيز عادي وادشن سيليكون:\n\n🔵 عادي:\n• السعر: 490-1980 ج\n• سهل الاستخدام\n• دقة جيدة\n• للحالات العادية\n\n🔶 ادشن سيليكون:\n• السعر: 1400-2980 ج\n• دقة عالية جداً\n• استقرار أبعاد ممتاز\n• للتيجان والجسور\n\nالادشن أفضل للحالات الدقيقة 👨‍⚕️`;
    }
    
    if ((msg.includes("روبي") || msg.includes("ruby")) && (msg.includes("شوفو") || msg.includes("shofu"))) {
      return `المقارنة:\n\n💎 روبي: 180 ج\n• اقتصادي\n• جودة جيدة\n• للحشوات العادية\n\n✨ شوفو: 950 ج\n• ياباني\n• جودة ممتازة\n• ثبات لون عالي\n• للحالات الأمامية\n\nالفرق يستاهل للحالات الجمالية 🦷`;
    }
    
    return "قولي اسم المنتجين اللي عايز تقارن بينهم\nمثال: قارن بين الروبي والشوفو";
  }
  
  // أسعار
  if (msg.includes("سعر") || msg.includes("بكام") || msg.includes("ثمن")) {
    // نترايل
    if (msg.includes("نترايل")) {
      if (msg.includes("أسود") || msg.includes("اسود")) {
        const black = products.find(p => p.name && p.name.includes("نترايل") && p.name.includes("أسود"));
        return black ? `${black.name}\n💰 ${black.price} جنيه` : "النترايل الأسود: 170 جنيه";
      }
      
      const nits = products.filter(p => p.name && p.name.includes("نترايل"));
      if (nits.length > 0) {
        const list = nits.map(n => `• ${n.name}: ${n.price} ج`).join("\n");
        return `أنواع النترايل:\n\n${list}`;
      }
    }
    
    // بحث عام في اسم المنتج
    const words = msg.split(' ').filter(w => w.length > 2);
    for (const word of words) {
      const found = products.find(p => p.name && p.name.toLowerCase().includes(word));
      if (found) {
        return `✅ ${found.name}\n💰 ${found.price} جنيه${found.oldPrice ? `\n🏷️ كان: ${found.oldPrice} ج` : ''}`;
      }
    }
  }
  
  // توصيل
  if (msg.includes("توصيل") || msg.includes("شحن")) {
    return "🚚 التوصيل:\n• كل محافظات مصر\n• 2-5 أيام عمل\n• مجاني فوق 2000 ج\n• سريع للقاهرة (1-2 يوم)";
  }
  
  // دفع
  if (msg.includes("دفع") || msg.includes("كاش") || msg.includes("فيزا")) {
    return "💳 طرق الدفع:\n✅ عند الاستلام\n✅ فودافون كاش\n✅ انستاباي\n✅ تحويل بنكي\n✅ بطاقات ائتمان";
  }
  
  // فروع
  if (msg.includes("فرع") || msg.includes("عنوان")) {
    return "📍 فروعنا:\n• مدينة نصر\n• القصر العيني\n• 6 أكتوبر\n\n📱 01151605515";
  }
  
  // شكر
  if (msg.includes("شكر") || msg.includes("تمام")) {
    return "العفو يا فندم! 😊\nأي خدمة تانية؟";
  }
  
  // بحث عام
  const searchWords = msg.split(' ').filter(w => w.length > 2);
  for (const word of searchWords) {
    const matches = products.filter(p => p.name && p.name.toLowerCase().includes(word));
    
    if (matches.length === 1) {
      return `✅ ${matches[0].name}\n💰 ${matches[0].price} جنيه`;
    }
    
    if (matches.length > 1 && matches.length <= 6) {
      const list = matches.map(m => `• ${m.name}: ${m.price} ج`).join("\n");
      return `لقيت ${matches.length} منتج:\n\n${list}`;
    }
  }
  
  // رد افتراضي
  return "ممكن توضح أكتر؟\n\nجرّب:\n• عندكم كمبوزيت؟\n• بكام النترايل الأسود؟\n• قارن بين الروبي والشوفو";
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

    setMessages(prev => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const reply = getSmartReply(trimmed, products);
      setMessages(prev => [...prev, { role: "model", text: reply }]);
      setLoading(false);
    }, 400);
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-24 right-6 z-[150] grid size-14 place-items-center rounded-full bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-lg hover:scale-105 transition-transform sm:bottom-6">
        <AnimatePresence mode="wait">
          {open ? <motion.span key="x" initial={{rotate:-90}} animate={{rotate:0}}><X className="size-6"/></motion.span> : <motion.span key="c" initial={{scale:0}} animate={{scale:1}}><MessageCircle className="size-6"/></motion.span>}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className="fixed bottom-40 right-6 z-[150] w-[92vw] max-w-sm rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl overflow-hidden sm:bottom-24">
            <div className="flex items-center gap-3 border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/10 p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
                <MessageCircle className="size-5 text-white"/>
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-black">مساعد إيجي دنت 🤖</p>
                <p className="text-[11px] text-frost-500">ذكي وسريع</p>
              </div>
            </div>

            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-frost-400 mb-2">👋 جرّب:</p>
                  {["عندكم كمبوزيت؟", "قارن بين الروبي والشوفو", "بكام النترايل الأسود؟"].map((q,i) => (
                    <button key={i} onClick={()=>sendMessage(q)} className="block w-full text-right px-3 py-2 rounded-lg bg-ink-950/60 hover:bg-volt-500/10 text-xs text-frost-400 hover:text-volt-300 transition">
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3 mt-3">
                {messages.map((m,i) => (
                  <div key={i} className={m.role==="user"?"text-left":"text-right"}>
                    <span className={m.role==="user"?"inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-volt-500/15 px-3 py-2 text-sm":"inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-950/70 px-3 py-2 text-sm leading-relaxed"}>
                      {m.text}
                    </span>
                  </div>
                ))}
                {loading && (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-ink-950/70 px-3 py-2 text-sm text-frost-400">
                      <Loader2 className="size-3.5 animate-spin"/>بيفكر...
                    </span>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>
            </div>

            <form onSubmit={(e)=>{e.preventDefault();sendMessage(input);}} className="flex gap-2 border-t border-[var(--line-2)] p-3">
              <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="اكتب سؤالك..." maxLength={300} disabled={loading} className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-sm outline-none focus:border-volt-500/50"/>
              <button type="submit" disabled={loading||!input.trim()} className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white disabled:opacity-40">
                {loading?<Loader2 className="size-4 animate-spin"/>:<Send className="size-4"/>}
              </button>
            </form>

            <div className="border-t border-[var(--line-2)] p-3">
              <a href="https://wa.me/201151605515" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-400 to-emerald-600 py-2.5 text-sm font-black text-white hover:scale-[1.02] transition">
                💬 واتساب
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
