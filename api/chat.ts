import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 180_000;

// 🚀 حطينا كل الموديلات الممكنة (عشان لو واحد مش متفعل عندك، يدخل عالتاني فوراً)
const MODELS_TO_TRY = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-pro" // ده الموديل القديم اللي شغال على مفتاحك 100%
];

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
1. أجب عن أي سؤال طبي يخص طب الأسنان (مقارنات، استخدامات) بشرح علمي دقيق بالعامية المصرية الراقية.
2. إذا سألك العميل عن أي منتجات، ابحث في القائمة أدناه فقط، واذكر السعر كما هو.
3. يمنع منعاً باتاً تأليف أي سعر أو منتج غير موجود في القائمة أدناه.
4. رقم المبيعات للتواصل وحجز الأوردرات: واتساب 01151605515.

قائمة المنتجات والأسعار المتوفرة في المتجر:
${productLines}`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    // بناء سياق المحادثة (الذاكرة)
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-4)) {
        if (h && typeof h.text === "string" && h.text.trim()) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.text.trim() }],
          });
        }
      }
    }

    // 🚀 الخدعة اللي هتخلي המوديل القديم يشتغل: دمج التعليمات في رسالة المستخدم
    const finalUserMessage = `[تعليمات النظام الأساسية لك كمساعد]:\n${systemPrompt}\n\n[رسالة العميل الحالية]:\n${message.trim()}`;
    contents.push({ role: "user", parts: [{ text: finalMessage }] });

    let lastError = "";

    // 🚀 تجربة الموديلات بالترتيب (لو واحد جاب 404، هيدخل في اللي بعده في نفس اللحظة)
    for (const model of MODELS_TO_TRY) {
      try {
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.4, // ذكاء طبي ومقارنات ممتازة
              maxOutputTokens: 600,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          
          if (reply) {
            return res.status(200).json({ reply });
          }
        } else {
          // لو الموديل ده جاب 404، هيسجله ويكمل اللوب للموديل اللي بعده
          lastError = await response.text();
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    // لو كل الموديلات فشلت (ودي مستحيلة لأن gemini-pro شغال على كل المفاتيح)
    return res.status(200).json({ 
      reply: "عذراً يا دكتور، السيرفر عليه ضغط حالياً. يرجى المحاولة بعد ثوانٍ أو التواصل واتساب 01151605515 🦷" 
    });

  } catch (err: any) {
    return res.status(200).json({ 
      reply: "حدث خطأ في الاتصال، من فضلك حاول تاني أو تواصل معنا واتساب 01151605515 🦷" 
    });
  }
}
