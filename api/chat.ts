import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 180_000;

async function fetchLiveProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (snap.empty) return DEFAULT_PRODUCTS;
    return snap.docs.map((d) => d.data() as Product);
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

async function fetchLiveCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(liteDb, "categories"));
    if (snap.empty) return DEFAULT_CATEGORIES;
    return snap.docs.map((d) => d.data() as Category);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

async function buildSystemPrompt(): Promise<string> {
  if (cache && cache.expiresAt > Date.now()) return cache.prompt;

  const [products, categories] = await Promise.all([fetchLiveProducts(), fetchLiveCategories()]);

  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} جنيه`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي"، طبيب أسنان خبير ومندوب مبيعات لمتجر إيجي دنت في مصر.
تعليماتك:
1. أجب عن أي سؤال طبي أو مقارنات بشرح علمي دقيق بالعامية المصرية الراقية.
2. إذا سألك العميل عن أي منتجات، ابحث في القائمة أدناه فقط، واذكر السعر كما هو.
3. يمنع منعاً باتاً تأليف أي سعر أو منتج غير موجود في القائمة أدناه.
4. للتواصل وحجز الأوردرات: واتساب 01151605515.

[قائمة المنتجات والأسعار المتوفرة]:
${productLines}`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "خدمة المساعد الذكي بتتجهز حالياً. تواصل معنا واتساب 01151605515 🦷" });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    // 🚀 تجميع سياق المحادثة بالكامل في رسالة واحدة لتجنب أي تعقيدات من جوجل
    let conversationText = `[التعليمات الدائمة لك]:\n${systemPrompt}\n\n`;
    
    if (Array.isArray(history)) {
      conversationText += `[المحادثة السابقة للرجوع إليها]:\n`;
      for (const h of history.slice(-4)) {
        if (h && typeof h.text === "string" && h.text.trim()) {
          const role = h.role === "user" ? "العميل" : "أنت (المساعد)";
          conversationText += `${role}: ${h.text.trim()}\n`;
        }
      }
    }
    
    conversationText += `\n[رسالة العميل الحالية]:\n${message.trim()}\n\nأجب كطبيب أسنان ومساعد ذكي:`;

    // 🚀 الاتصال المباشر بموديل gemini-pro (المضمون والشغال عندك)
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: conversationText }] }],
        generationConfig: {
          temperature: 0.4, // ذكاء متوازن جداً
          maxOutputTokens: 600,
        },
      }),
    });

    const data = await response.json();

    if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const reply = data.candidates[0].content.parts[0].text.trim();
      return res.status(200).json({ reply });
    } else {
      console.error("Gemini Response Error:", data);
      const errMsg = data?.error?.message?.toLowerCase() || "";
      
      // معالجة لو الباقة المجانية خلصت
      if (errMsg.includes("quota") || response.status === 429) {
         return res.status(200).json({ reply: "عذراً يا دكتور، السيرفر عليه ضغط حالياً. يرجى المحاولة بعد قليل 🦷" });
      }
      
      return res.status(200).json({ reply: `⚠️ جوجل رفضت الطلب: ${data?.error?.message}` });
    }

  } catch (err: any) {
    console.error("Fetch Error:", err.message);
    return res.status(200).json({ reply: "حدث خطأ في الاتصال، من فضلك حاول تاني أو تواصل معنا واتساب 01151605515 🦷" });
  }
}
