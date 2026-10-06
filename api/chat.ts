import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let promptCache: { prompt: string; expiresAt: number } | null = null;
const TTL = 180_000;

async function buildSystemPrompt(): Promise<string> {
  if (promptCache && promptCache.expiresAt > Date.now()) return promptCache.prompt;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} جنيه`)
    .join("\n");

  const prompt = `[تعليمات لك كمساعد ذكي لمتجر إيجي دنت]:
1. أنت طبيب أسنان ومندوب مبيعات، ترد بالعامية المصرية بوضوح واختصار.
2. إذا كان السؤال طبياً (مثل عمل كافيتي أو حشو)، اشرح الخطوات الطبية بدقة ولا تذكر أسعار.
3. إذا كان السؤال عن المنتجات، ابحث في القائمة أدناه فقط. يمنع ذكر أي سعر من خارجها.
4. إذا لم تجد المنتج، قل: "الصنف غير متوفر، تواصل مع المبيعات على 01151605515".
5. أجب مباشرة على سؤال العميل التالي.

[قائمة المنتجات والأسعار]:
${productLines}

-----------------
[سؤال العميل الآن]:\n`;

  promptCache = { prompt, expiresAt: Date.now() + TTL };
  return promptCache.prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "مفتاح API غير موجود." });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    // تجهيز الذاكرة
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-4)) {
        if (h?.text?.trim()) {
          contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
        }
      }
    }
    
    // دمج التعليمات مع رسالة العميل عشان جوجل متعملش إيرور
    const finalMessage = `${systemPrompt}${message.trim()}`;
    contents.push({ role: "user", parts: [{ text: finalMessage }] });

    // 🚀 استخدام الموديل الشامل (gemini-pro) اللي بيشتغل على أي مفتاح
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { 
          temperature: 0.3, // توازن بين الذكاء والدقة
          maxOutputTokens: 600 
        },
      })
    });

    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      // 🚨 هنا هنطبع رسالة خطأ جوجل بالتفصيل عشان نعرف المشكلة فين بالظبط!
      const errorMsg = data?.error?.message || "خطأ غير معروف من جوجل";
      console.error("Google API Error:", errorMsg);
      return res.status(200).json({ 
        reply: `⚠️ جوجل رفضت الطلب والسبب: ${errorMsg}` 
      });
    }
  } catch (err: any) {
    console.error("Chat Error:", err.message);
    return res.status(200).json({ reply: `حدث خطأ تقني: ${err.message}` });
  }
}
