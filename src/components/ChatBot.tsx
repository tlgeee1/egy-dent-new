import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";

type ChatMsg = { role: "user" | "model"; text: string };

export default function ChatBot() {
  const { settings } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const waLink = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("أهلاً، عندي استفسار")}`
    : undefined;

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
        body: JSON.stringify({ message: trimmed, history: messages.slice(-8) })
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : "معلش، حصلت مشكلة. جرب تاني أو كلمنا واتساب.";
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "model", text: "معلش، مش قادر أوصل للسيرفر. كلمنا واتساب." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 left-5 z-[150] grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-[0_12px_32px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 sm:bottom-6 sm:left-24"
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-40 left-5 z-[150] flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl sm:bottom-24 sm:left-24"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/10 to-transparent p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
                <MessageCircle className="size-5 text-white" />
              </span>
              <div>
                <p className="font-display text-sm font-black">مساعد إيجي دنت</p>
                <p className="text-[11px] text-frost-500">🤖 بيرد فورًا بالذكاء الاصطناعي</p>
              </div>
            </div>

            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="text-xs text-frost-400">
                  أهلاً بيك 👋 اسألني عن أي منتج أو سعر أو الفرق بين المنتجات، وهرد عليك فورًا!
                </p>
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
                    <span className="inline-flex items-center gap-2 rounded-2xl rounded-br-sm bg-ink-950/70 px-3 py-2 text-sm text-frost-400">
                      <Loader2 className="size-3.5 animate-spin" />
                      بيكتب...
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
                placeholder="اكتب سؤالك هنا..."
                maxLength={500}
                disabled={loading}
                className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-sm text-frost-100 outline-none focus:border-volt-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white disabled:opacity-40"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>

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
