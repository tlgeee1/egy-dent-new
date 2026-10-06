import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, ChevronRight, Send, Loader2, Sparkles } from "lucide-react";
import { useStore } from "@/context/StoreContext";

const FAQS = [
  { q: "التوصيل بياخد قد إيه؟", a: "التوصيل بيوصل خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام عمل لباقي المحافظات." },
  { q: "المنتجات أصلية ومضمونة؟", a: "أيوه، كل منتجاتنا أصلية 100% ومستوردة من وكلاء معتمدين، ومضمونة بالكامل." },
  { q: "طرق الدفع المتاحة إيه؟", a: "متاح الدفع عند الاستلام (كاش)، فودافون كاش، انستاباي، والتحويلات البنكية." },
  { q: "الشحن مجاني؟", a: "الشحن مجاني للطلبات الكبيرة اللي بتتعدى الحد الأدنى المحدد في المتجر." },
  { q: "سياسة الاستبدال والإرجاع؟", a: "متاح الاسترجاع والاستبدال خلال 14 يوم من الاستلام طالما المنتج في عبوته الأصلية السليمة." },
];

type ChatMsg = { role: "user" | "model"; text: string };
type View = { screen: "menu" } | { screen: "answer"; index: number } | { screen: "ai" };

export default function ChatBot() {
  const { settings, orders = [] } = useStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ screen: "menu" });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const waLink = settings?.whatsapp
    ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("أهلاً، بتواصل معاكم بخصوص استفسار من المتجر")}`
    : undefined;

  const toggle = () => {
    setOpen((v) => !v);
    if (open) setView({ screen: "menu" });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, view]);

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const newMessages: ChatMsg[] = [...messages, { role: "user", text: queryText }];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    const qLower = queryText.toLowerCase();
    if (qLower.includes("eg-")) {
      const foundOrder = orders?.find((o) => o?.id?.toLowerCase() === qLower || qLower.includes(o?.id?.toLowerCase()));
      if (foundOrder) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: `📦 بيانات طلبك رقم (${foundOrder.id}):\n• العميل: ${foundOrder.customer?.name || "عميلنا العزيز"}\n• الإجمالي: ${foundOrder.total} ج\n• الحالة: [ ${foundOrder.status} ]`,
          },
        ]);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          history: newMessages.slice(-6),
        }),
      });

      const data = await res.json();
      
      if (res.ok && data.reply) {
        // ✅ التعديل هنا: إضافة ( || "" ) لضمان أن النص سيكون string ولن يعترض TypeScript
        setMessages((prev) => [...prev, { role: "model", text: data.reply || "عذراً، لم أفهم الرد." }]);
      } else {
        setMessages((prev) => [...prev, { role: "model", text: "عذراً يا دكتور، يرجى المحاولة بعد لحظات 🦷" }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "حدث خطأ في الاتصال، يرجى التأكد من اتصالك بالإنترنت." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={toggle} aria-label={open ? "إغلاق" : "افتح"} className="fixed bottom-24 right-5 z-[150] grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6">
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}><X className="size-6" /></motion.span>
          ) : (
            <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, rotate: 90 }}><MessageCircle className="size-6" /></motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ type: "spring", stiffness: 350, damping: 30 }} className="fixed bottom-40 right-5 z-[150] flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line-3)] bg-[var(--bg-elevated,#090d16)] shadow-2xl sm:bottom-24 sm:right-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/15 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700"><Sparkles className="size-5 text-white" /></span>
                <div>
                  <div className="flex items-center gap-1.5"><p className="font-display text-sm font-black text-[var(--text-primary)]">مساعد إيجي دنت</p><span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">AI Live</span></div>
                  <p className="text-[11px] text-[var(--text-secondary,#94a3b8)]">مدعوم بالذكاء الاصطناعي الطبي</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[22rem] min-h-[17rem] overflow-y-auto p-4">
              {view.screen === "menu" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-volt-500/30 bg-volt-500/10 p-3 text-xs text-[var(--text-primary)]">
                    <p className="font-bold text-volt-400">أهلاً بك يا دكتور! 🦷</p>
                    <p className="mt-1 leading-relaxed text-[var(--text-secondary,#94a3b8)]">اسألني أي سؤال عن الخامات أو الأسعار:</p>
                  </div>
                  <div className="space-y-1.5">
                    {FAQS.map((f, i) => (
                      <button key={i} onClick={() => setView({ screen: "answer", index: i })} className="flex w-full items-center justify-between rounded-xl border border-[var(--line-3)] bg-[var(--fill-2,#0f172a)] px-3.5 py-2.5 text-right text-xs font-bold text-[var(--text-primary)] hover:border-volt-500/50 hover:text-volt-400">
                        {f.q}<ChevronRight className="size-3.5 rotate-180 text-[var(--text-secondary,#64748b)]" />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setView({ screen: "ai" })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-volt-500 to-volt-700 py-3 text-xs font-black text-white hover:scale-[1.02]">
                    <MessageCircle className="size-4 text-white" />اسأل الذكاء الاصطناعي الآن
                  </button>
                </div>
              )}

              {view.screen === "answer" && (
                <div className="space-y-3">
                  <button onClick={() => setView({ screen: "menu" })} className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary,#94a3b8)] hover:text-volt-400"><ChevronRight className="size-3.5" />رجوع للأسئلة</button>
                  <div className="rounded-2xl border border-[var(--line-3)] bg-[var(--fill-2,#0f172a)] p-4">
                    <p className="font-display text-sm font-black text-volt-400">{FAQS[view.index].q}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-primary)]">{FAQS[view.index].a}</p>
                  </div>
                </div>
              )}

              {view.screen === "ai" && (
                <div className="flex h-full flex-col">
                  <div className="mb-3 flex items-center justify-between border-b border-[var(--line-2)] pb-2">
                    <button onClick={() => setView({ screen: "menu" })} className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary,#94a3b8)] hover:text-volt-400"><ChevronRight className="size-3.5" />رجوع للقائمة</button>
                  </div>
                  <div className="space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={m.role === "user" ? "text-left" : "text-right"}>
                        <div className={m.role === "user" ? "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-volt-500/20 border border-volt-500/40 px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-medium" : "inline-block max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[var(--fill-2,#0f172a)] p-3 text-xs leading-relaxed text-[var(--text-primary)] border border-[var(--line-3)] shadow-sm"}><p>{m.text}</p></div>
                      </div>
                    ))}
                    {loading && (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-2 rounded-2xl bg-[var(--fill-2,#0f172a)] px-3 py-2 text-xs text-[var(--text-primary)] border border-[var(--line-3)]">
                          <Loader2 className="size-3.5 animate-spin text-volt-400" /> جاري التفكير...
                        </span>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Input & Quick Chips */}
            {view.screen === "ai" && (
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 border-t border-[var(--line-2)] p-3 bg-[var(--fill-1,transparent)]">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك الطبي أو اسم الصنف..." disabled={loading} className="flex-1 rounded-xl border border-[var(--line-3)] bg-[var(--fill-2,#0f172a)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-volt-500/50 disabled:opacity-50" />
                <button type="submit" disabled={loading || !input.trim()} className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white disabled:opacity-40 active:scale-95"><Send className="size-4" /></button>
              </form>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
