import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebase.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

let discoveredModel: string | null = null;

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

  const prompt = `أنت "مساعد إيجي دنت الذكي" — خبير مستلزمات طب الأسنان وصيدلي لمتجر إيجي دنت (EgyDent) في مصر.

تعليمات الإجابة:
1. أنت طبيب وخبير في كل مواد الأسنان (Composites, Bonding 5th & 8th gen, C-Silicone, A-Silicone, Alginate, etc.).
2. لو سألك الدكتور عن طريقة استخدام أي خامة، اشرح الخطوات الطبية السليمة بالترتيب وبشكل واضح ومختصر بالعامية المصرية الراقية.
3. لو سألك عن مقارنة أو ترشيح، قارن علمياً وعملياً ومادياً، ورشح الأصناف المتاحة في المتجر بأسعارها المذكورة تحت.
4. التزم فقط بالمنتجات والأسعار المذكورة أدناه.
5. للتواصل المباشر مع المبيعات: واتساب 01151605515.

قائمة المنتجات والأسعار المتاحة:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر. الشحن متاح لكل مصر.`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}

// دالة فحص الموديل المتاح في حساب جوجل تلقائياً
async function getBestAvailableModel(apiKey: string): Promise<string> {
  if (discoveredModel) return discoveredModel;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const models = (data?.models || []).filter((m: any) =>
        m.supportedGenerationMethods?.includes("generateContent")
      );

      // البحث عن أفضل موديل فلاش متوفر في الحساب
      const preferred = models.find((m: any) => m.name.includes("flash")) ||
                        models.find((m: any) => m.name.includes("gemini")) ||
                        models[0];

      if (preferred) {
        discoveredModel = preferred.name; // مثل "models/gemini-1.5-flash"
        return discoveredModel;
      }
    }
  } catch (e) {
    console.error("ListModels failed:", e);
  }

  return "models/gemini-1.5-flash";
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
    const [systemPrompt, modelPath] = await Promise.all([
      buildSystemPrompt(),
      getBestAvailableModel(cleanKey),
    ]);

    const contents: { role: "user" | "model"; parts: [{ text: string }] }[] = [];
    let expectedRole: "user" | "model" = "user";

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h && typeof h.text === "string" && h.text.trim()) {
          const role = h.role === "user" ? "user" : "model";
          if (role === expectedRole) {
            contents.push({ role, parts: [{ text: h.text.trim() }] });
            expectedRole = expectedRole === "user" ? "model" : "user";
          }
        }
      }
    }

    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents.pop();
    }

    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${cleanKey}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed?.error?.message || errText;
      } catch {}

      return res.status(200).json({ 
        reply: `⚠️ جوجل رد بالخطأ التالي (${modelPath}):\n\n${errorMsg}` 
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
