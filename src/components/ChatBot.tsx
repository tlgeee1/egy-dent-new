import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, ChevronRight, Send, Loader2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";

/**
 * ⚠️ عدّل الأسئلة والإجابات دي بما يناسب سياستكم الفعلية
 * (مدة الشحن، سياسة الاستبدال، طرق الدفع المتاحة فعليًا...)
 * دول بس اختصارات سريعة — البوت نفسه بيرد بذكاء على أي سؤال حر من تحت.
 */
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

export default function ChatBot() {
  const { settings } = useStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ screen: "menu" });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const waLink = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("أهلاً، عندي استفسار من الموقع")}`
    : undefined;

  const toggle = () => {
    setOpen((v) => !v);
    if (open) setView({ screen: "menu" });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: messages }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : "معلش، حصلت مشكلة مؤقتة. جرب تاني أو كلّم فريقنا على واتساب.";
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "معلش، مش قادر أوصل للسيرفر دلوقتي. جرب تاني أو كلّم فريقنا على واتساب." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* الزرار العائم — لو متعارض مع زرار الواتساب الموجود، غيّر bottom/left هنا */}
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
              <div>
                <p className="font-display text-sm font-black">مساعد إيجي دنت</p>
                <p className="text-[11px] text-frost-500">هنرد عليك فورًا</p>
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
                    <p className="mb-2 text-xs text-frost-400">اكتب سؤالك عن أي منتج أو سعر أو سياسة، وهرد عليك فورًا 👇</p>
                  )}

                  <div className="flex-1 space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={m.role === "user" ? "text-left" : "text-right"}>
                        <span
                          className={
                            m.role === "user"
                              ? "inline-block max-w-[85%] rounded-2xl rounded-bl-sm bg-volt-500/15 px-3 py-2 text-sm text-frost-100"
                              : "inline-block max-w-[85%] rounded-2xl rounded-br-sm bg-ink-950/70 px-3 py-2 text-sm text-frost-200"
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

            {/* input — يظهر بس في وضع الأسئلة الحرة */}
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
                  className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-sm text-frost-100 outline-none focus:border-volt-500/50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="إرسال"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white disabled:opacity-40"
                >
                  <Send className="size-4" />
                </button>
              </form>
            )}

            {/* footer — CTA لواتساب دايمًا ظاهر */}
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
