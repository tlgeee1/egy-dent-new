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

    // جلب الموديلات الصالحة والمتاحة في حسابك مباشرة من جوجل
    let modelsToTry: string[] = [];
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        modelsToTry = (listData?.models || [])
          .filter((m: any) => 
            m.supportedGenerationMethods?.includes("generateContent") &&
            !m.name.includes("2.5") && // استبعاد الموديل القديم الملغي
            !m.name.includes("embedding") &&
            !m.name.includes("aqa")
          )
          .map((m: any) => m.name.replace(/^models\//, "")); // تنظيف الاسم لمنع تكرار models/

        // ترتيب: الأحدث فلاش أولاً ثم برو
        modelsToTry.sort((a, b) => {
          const score = (n: string) => {
            if (n.includes("2.0-flash")) return 1;
            if (n.includes("1.5-flash")) return 2;
            if (n.includes("1.5-pro")) return 3;
            if (n.includes("pro")) return 4;
            return 5;
          };
          return score(a) - score(b);
        });
      }
    } catch (e) {
      console.error("ListModels failed:", e);
    }

    // لو فشل جلب القائمة نستخدم القائمة الاحتياطية المعتمدة
    if (modelsToTry.length === 0) {
      modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    }

    const promptWithInstructions = `${systemPrompt}\n\n---\nسؤال الطبيب الحالي:\n${message.trim()}`;

    const contents = [
      ...(Array.isArray(history) ? history.slice(-4) : []).map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      })),
      { role: "user", parts: [{ text: promptWithInstructions }] }
    ];

    let lastError = "";

    // تجربة الموديلات بالاسم الصحيح النظيف
    for (const modelName of modelsToTry) {
      try {
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
        
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

        if (response.ok) {
          const data = await response.json();
          const reply =
            data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim();

          if (reply) {
            return res.status(200).json({ reply });
          }
        } else {
          const errText = await response.text();
          lastError = errText;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    return res.status(200).json({ 
      reply: `⚠️ تعذر استجابة الموديلات المتاحة:\n${lastError.substring(0, 150)}` 
    });
  } catch (err: any) {
    return res.status(200).json({ 
      reply: `💥 خطأ داخلي في الخادم:\n${err.message}` 
    });
  }
}
