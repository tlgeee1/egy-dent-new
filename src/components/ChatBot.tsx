import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

type ChatMsg = { role: "user" | "model"; text: string };

// ✅ إضافة تعريف Tawk_API لـ TypeScript
declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void;
      minimize?: () => void;
      hideWidget?: () => void;
      showWidget?: () => void;
    };
  }
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-6)
        })
      });

      const data = await res.json();
      const reply = data.reply || "معلش، حصلت مشكلة. حاول تاني.";
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "مش قادر أتواصل دلوقتي. جرب تاني أو كلمنا واتساب: 01151605515" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ تحميل Tawk.to في الخلفية
  useEffect(() => {
    if (document.getElementById("tawk-script")) return;
    
    const script = document.createElement("script");
    script.id = "tawk-script";
    script.async = true;
    script.src = "https://embed.tawk.to/6abc160a926103343dfe96f3/1k3nbc6vi";
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }
    
    // إخفاء widget Tawk الافتراضي
    const style = document.createElement("style");
    style.textContent = "#tawk-bubble-container { display: none !important; }";
    document.head.appendChild(style);
  }, []);

  const openTawk = () => {
    if (window.Tawk_API?.maximize) {
      window.Tawk_API.maximize();
    }
  };

  return (
    <>
      {/* زرار الشات */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="افتح الشات"
        className="fixed bottom-6 left-6 z-[150] grid size-14 place-items-center rounded-full bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-[0_12px_32px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 active:scale-95"
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

      {/* نافذة الشات */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 z-[150] flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/10 to-transparent p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
                <MessageCircle className="size-5 text-white" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-black">مساعد إيجي دنت 🤖</p>
                <p className="text-[11px] text-frost-500">اسأل عن المنتجات والأسعار</p>
              </div>
            </div>

            {/* Messages */}
            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="mb-3 text-xs text-frost-400">
                  أهلاً! 👋 اسألني عن أي منتج أو سعر، أو قارن بين منتجين.
                </div>
              )}

              <div className="space-y-3">
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
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-ink-950/70 px-3 py-2 text-sm text-frost-400">
                      <Loader2 className="size-3.5 animate-spin" />
                      بيفكر...
                    </span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input */}
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
                maxLength={500}
                disabled={loading}
                className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-sm outline-none focus:border-volt-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="إرسال"
                className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white disabled:opacity-40"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>

            {/* زرار التواصل مع موظف */}
            <div className="border-t border-[var(--line-2)] p-3">
              <button
                onClick={openTawk}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-400 to-emerald-600 py-2.5 text-sm font-black text-white transition-transform hover:scale-[1.02]"
              >
                💬 تكلم مع موظف مباشرة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
