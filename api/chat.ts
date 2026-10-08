import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; expiresAt: number } | null = null;
const TTL = 180_000;

// 🔗 رابط المنصة الرسمي (Soal.Help) — من التوثيق بتاعهم
const API_BASE_URL = process.env.OPENAI_API_URL?.trim() || "https://soal.help/api/v1";

async function buildSystemPrompt(): Promise<string> {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache.prompt;

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
    .map((p) => `## ${p.title}\n` + p.sections.map((s) => [s.heading, s.body, ...(s.bullets ?? [])].filter(Boolean).join(" — ")).join("\n"))
    .join("\n\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي"، طبيب أسنان محترف ومستشار مبيعات لمتجر إيجي دنت لطب الأسنان في مصر.

تعليماتك الصارمة:
1. تحدث بالعامية المصرية الراقية، السلسة، والموجزة.
2. أجب عن أي سؤال طبي، خطوات عمل (كافيتي، عصب، ألجينات، بوند)، أو مقارنات بين المواد السنية بشكل علمي دقيق كأستاذ جامعة.
3. إذا سألك العميل عن أي منتجات أو أسعار، اعتمد حصرياً على القائمة المرفقة أدناه ولا تبتكر أو تؤلف أي سعر نهائياً.
4. إذا سأل عن صنف غير موجود، قل: "الصنف ده مش متاح حالياً، تواصل مع المبيعات على 01151605515 لتأكيد التوافر".
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

[دليل المنتجات والأسعار المتاحة في المتجر اليوم]:
${productLines}

[سياسات المتجر وفروعه]:
${policyText}`;

  storeCache = { prompt, expiresAt: Date.now() + TTL };
  return storeCache.prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "⚠️ المفتاح OPENAI_API_KEY غير موجود في إعدادات Vercel." });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    // 🚀 تهيئة الذاكرة وفق نسق OpenAI القياسي
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h?.text?.trim()) {
          messages.push({
            role: h.role === "user" ? "user" : "assistant",
            content: h.text.trim(),
          });
        }
      }
    }

    messages.push({ role: "user", content: message.trim() });

    // 🚀 الاتصال بسيرفر Soal.Help (متوافق 100% مع OpenAI)
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // أذكى وأرخص موديل لشات بوت المتاجر
        messages: messages,
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const reply = data?.choices?.[0]?.message?.content?.trim();
      return res.status(200).json({
        reply: reply || "أهلاً بك يا دكتور في إيجي دنت! كيف يمكنني مساعدتك؟ 🦷",
      });
    } else {
      console.error("Soal API Error:", data?.error?.message || JSON.stringify(data));
      return res.status(200).json({
        reply: `⚠️ إيرور من المنصة: ${data?.error?.message || "يرجى التأكد من شحن الرصيد"}`
      });
    }
  } catch (err: any) {
    console.error("Server Error:", err.message);
    return res.status(200).json({
      reply: `💥 خطأ في السيرفر: ${err.message}`
    });
  }
}
