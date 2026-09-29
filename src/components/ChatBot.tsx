import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

type ChatMsg = { role: "user" | "model"; text: string };

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
      
      if (data.error) {
        throw new Error(data.error);
      }

      const reply = data.reply || "معلش، مش قادر أرد دلوقتي. جرب تاني.";
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "عذراً، حصلت مشكلة. جرب تاني أو كلمنا واتساب: 01151605515" }
      ]);
    } finally {
      setLoading(false);
    }
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
                <p className="text-[11px] text-frost-500">اسأل عن المنتجات والمقارنات</p>
              </div>
            </div>

            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-frost-400">أهلاً! 👋 جرّب تسأل:</p>
                  <div className="space-y-1.5 text-xs">
                    <button 
                      onClick={() => sendMessage("ايه الفرق بين رابر بيز عادي وادشن سيليكون؟")}
                      className="block w-full text-right px-3 py-2 rounded-lg bg-ink-950/60 hover:bg-volt-500/10 text-frost-400 hover:text-volt-300 transition-colors"
                    >
                      ايه الفرق بين رابر بيز عادي وادشن سيليكون؟
                    </button>
                    <button 
                      onClick={() => sendMessage("بكام النترايل الأسود؟")}
                      className="block w-full text-right px-3 py-2 rounded-lg bg-ink-950/60 hover:bg-volt-500/10 text-frost-400 hover:text-volt-300 transition-colors"
                    >
                      بكام النترايل الأسود؟
                    </button>
                    <button 
                      onClick={() => sendMessage("قارنلي بين الكمبوزيت الروبي والشوفو")}
                      className="block w-full text-right px-3 py-2 rounded-lg bg-ink-950/60 hover:bg-volt-500/10 text-frost-400 hover:text-volt-300 transition-colors"
                    >
                      قارنلي بين الروبي والشوفو
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
                maxLength={500}
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
