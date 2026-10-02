import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebase.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

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
    .map((p) => `- ${p.name} (${catNames[p.cat] ?? p.cat}): ${p.price} جنيه`)
    .join("\n");

  const policyText = Object.values(policyPages)
    .map((page) => {
      const body = page.sections
        .map((s) => [s.heading, s.body, ...(s.bullets ?? [])].filter(Boolean).join(" — "))
        .join("\n");
      return `## ${page.title}\n${body}`;
    })
    .join("\n\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي" — خبير ومستشار مستلزمات طب الأسنان لمتجر "إيجي دنت" (EgyDent) في مصر.

تعليمات الإجابة:
1. أنت طبيب وصيدلي خبير في كل خامات ومواد الأسنان (Composites, Bonding 5th & 8th gen, C-Silicone, A-Silicone, Alginate, Etching, etc.).
2. لو سألك الدكتور عن طريقة استخدام أي خامة، اشرح الخطوات الطبية السليمة بالترتيب وبشكل واضح ومختصر بالعامية المصرية الراقية.
3. لو سألك عن مقارنة أو ترشيح، قارن علمياً وعملياً ومادياً، ورشح الأصناف المتاحة في المتجر بأسعارها المذكورة تحت.
4. التزم فقط بالمنتجات والأسعار المذكورة أدناه.
5. للتواصل المباشر مع المبيعات أو حجز طلبات: واتساب 01151605515.

قائمة المنتجات والأسعار المتاحة:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر. الشحن متاح لكل مصر.`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return res.status(200).json({ 
      reply: "⚠️ تنبيه: مفتاح GEMINI_API_KEY غير موجود في إعدادات Vercel. يرجى إضافته وعمل Redeploy." 
    });
  }

  const cleanKey = apiKey.trim();
  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    // 1) كشف الموديل المتاح في حسابك تلقائياً
    let selectedModel = "models/gemini-1.5-flash";
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const available = (listData?.models || []).filter((m: any) =>
          m.supportedGenerationMethods?.includes("generateContent")
        );

        if (available.length > 0) {
          // اختيار أفضل موديل متاح
          const preferred =
            available.find((m: any) => m.name.includes("2.0-flash")) ||
            available.find((m: any) => m.name.includes("1.5-flash") && !m.name.includes("8b")) ||
            available.find((m: any) => m.name.includes("1.5-pro")) ||
            available[0];

          selectedModel = preferred.name;
        }
      } else {
        const errJson = await listRes.text();
        return res.status(200).json({
          reply: `⚠️ مفتاح جوجل غير صالح أو به مشكلة في الصلاحيات:\n${errJson.substring(0, 150)}`
        });
      }
    } catch (e: any) {
      console.error("ListModels failed:", e);
    }

    // 2) إعداد المحتوى المتوافق مع 100% من موديلات جوجل
    const promptWithInstructions = `${systemPrompt}\n\n---\nسؤال الطبيب / العميل الحالي:\n${message.trim()}`;

    const contents = [
      ...(Array.isArray(history) ? history.slice(-4) : []).map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      })),
      { role: "user", parts: [{ text: promptWithInstructions }] }
    ];

    // 3) إرسال الطلب للموديل المختار
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${cleanKey}`;
    
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({
        reply: `⚠️ جوجل رفض الإجابة (${selectedModel}):\n${errText.substring(0, 150)}`
      });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim() ||
      "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟";

    return res.status(200).json({ reply });
  } catch (err: any) {
    return res.status(200).json({ 
      reply: `💥 خطأ داخلي في الخادم:\n${err.message}` 
    });
  }
}
