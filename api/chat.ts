import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { preamble: string; products: Product[]; expiresAt: number } | null = null;
const TTL = 180_000;

async function getStoreData() {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const catSnap = await getDocs(collection(liteDb, "categories"));
  const categories = catSnap.empty ? DEFAULT_CATEGORIES : catSnap.docs.map((d) => d.data() as Category);
  
  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- [قسم ${catNames[p.cat] ?? "عام"}]: ${p.name} — السعر: ${p.price} جنيه`)
    .join("\n");

  const policyText = Object.values(policyPages)
    .map((page) =>
      `## ${page.title}\n` +
      page.sections.map((s) => [s.heading, s.body, ...(s.bullets ?? [])].filter(Boolean).join(" — ")).join("\n")
    )
    .join("\n\n");

  const preamble = `أنت "مساعد إيجي دنت الذكي"، طبيب أسنان محترف ومستشار مبيعات لمتجر إيجي دنت لمستلزمات طب الأسنان في مصر.
تعليماتك الصارمة:
1. تحدث بالعامية المصرية الراقية، السلسة، والموجزة.
2. أجب عن أي سؤال طبي، خطوات عمل، أو مقارنات بين المواد السنية بشكل علمي دقيق وشامل ومبسط.
3. إذا سألك العميل عن أي منتجات أو أسعار، اعتمد حصرياً على القائمة المرفقة بالأسفل ولا تبتكر أو تؤلف أي سعر نهائياً.
4. إذا سأل عن صنف غير موجود، قل: "الصنف ده مش متاح حالياً، تواصل مع المبيعات على 01151605515 لتأكيد التوافر".
5. رقم المبيعات للتواصل وحجز الأوردرات: واتساب 01151605515.

[دليل المنتجات والأسعار المتاحة في المتجر اليوم]:
${productLines}

[سياسات المتجر وفروعه]:
${policyText}`;

  storeCache = { preamble, products, expiresAt: Date.now() + TTL };
  return storeCache;
}

// محرك طوارئ محلي خفيف
function localAIFallback(query: string, products: Product[]): string {
  const q = query.toLowerCase().trim();
  const searchWords = q.split(" ").filter(w => w.length > 2 && !["عايز","بكام","سعر","لو","سمحت"].includes(w));
  const matched = products.filter(p => searchWords.some(w => p.name.toLowerCase().includes(w)));

  if (matched.length > 0) {
    const list = matched.slice(0, 8).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
    return `أهلاً بك يا دكتور! دي الأصناف والأسعار المتاحة عندنا بناءً على سؤالك:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
  }
  return `أهلاً بك يا دكتور في إيجي دنت! لمزيد من التفاصيل حول الأسعار والخامات، يرجى التواصل مع المبيعات مباشرة على واتساب: 01151605515 🦷`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.COHERE_API_KEY?.trim();
  const { message, history } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  const { preamble, products } = await getStoreData();

  if (!apiKey) {
    return res.status(200).json({ reply: localAIFallback(message, products) });
  }

  try {
    // تنسيق التاريخ وفق نموذج Cohere الرسمي
    const chatHistory: { role: "USER" | "CHATBOT"; message: string }[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h?.text?.trim()) {
          chatHistory.push({
            role: h.role === "user" ? "USER" : "CHATBOT",
            message: h.text.trim(),
          });
        }
      }
    }

    // 🚀 الاتصال بموديل Cohere Command-R الفائق الذكاء والدقة
    const response = await fetch("https://api.cohere.com/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "command-r", // موديل متخصص جداً في RAG واللغات العربية
        preamble: preamble,
        message: message.trim(),
        chat_history: chatHistory,
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    if (response.ok && data?.text) {
      return res.status(200).json({ reply: data.text.trim() });
    } else {
      console.error("Cohere Error:", data?.message || data);
      return res.status(200).json({ reply: localAIFallback(message, products) });
    }
  } catch (err: any) {
    console.error("Server Error:", err.message);
    return res.status(200).json({ reply: localAIFallback(message, products) });
  }
}
