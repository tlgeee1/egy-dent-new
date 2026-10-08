import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { preamble: string; expiresAt: number } | null = null;
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

  storeCache = { preamble, expiresAt: Date.now() + TTL };
  return storeCache;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.COHERE_API_KEY?.trim();
  const { message, history } = req.body || {};

  if (!apiKey) {
    return res.status(200).json({ reply: "🚨 الكود مش شايف المفتاح COHERE_API_KEY في Vercel! تأكد من إضافة الاسم مظبوط وعمل Redeploy." });
  }

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const { preamble } = await getStoreData();

    // بناء الرسالة البسيطة المباشرة لتفادي أخطاء التنسيق
    let fullPrompt = `${preamble}\n\n`;
    
    if (Array.isArray(history) && history.length > 0) {
      fullPrompt += `[المحادثة السابقة]:\n`;
      for (const h of history.slice(-4)) {
        if (h?.text?.trim()) {
          const role = h.role === "user" ? "العميل" : "المساعد";
          fullPrompt += `${role}: ${h.text.trim()}\n`;
        }
      }
    }
    
    fullPrompt += `\n[سؤال العميل الحقيقي]:\n${message.trim()}\n\nأجب كطبيب أسنان ومساعد ذكي:`;

    // 🚀 الاتصال المباشر والمبسط بـ Cohere API
    const response = await fetch("https://api.cohere.com/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "command-r",
        message: fullPrompt,
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    if (response.ok && data?.text) {
      return res.status(200).json({ reply: data.text.trim() });
    } else {
      // 🚨 طبع الإيرور الحقيقي بدلاً من الرد الافتراضي المزعج
      const errMsg = data?.message || JSON.stringify(data);
      return res.status(200).json({ reply: `🚨 إيرور Cohere: ${errMsg}` });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: `💥 خطأ في السيرفر: ${err.message}` });
  }
}
