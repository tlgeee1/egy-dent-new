import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cachedModel: string | null = null;

async function fetchLiveProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    return snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

async function fetchLiveCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(liteDb, "categories"));
    return snap.empty ? DEFAULT_CATEGORIES : snap.docs.map((d) => d.data() as Category);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

async function buildSystemPrompt(): Promise<string> {
  const [products, categories] = await Promise.all([fetchLiveProducts(), fetchLiveCategories()]);
  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name} (${catNames[p.cat] ?? p.cat}): ${p.price} جنيه`)
    .join("\n");

  const policyText = Object.values(policyPages)
    .map((page) =>
      `## ${page.title}\n` +
      page.sections.map((s) => [s.heading, s.body, ...(s.bullets ?? [])].filter(Boolean).join(" — ")).join("\n")
    )
    .join("\n\n");

  return `أنت "مساعد إيجي دنت الذكي" لمتجر مستلزمات طب الأسنان في مصر.
تعليماتك:
1. أنت طبيب وصيدلي خبير في خامات الأسنان، رد بالعامية المصرية الراقية والواضحة.
2. التزم فقط بالمنتجات والأسعار المذكورة أدناه ولا تبتكر أسعاراً من عندك.
3. للتواصل والمبيعات: 01151605515.

المنتجات والأسعار المتاحة:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر.`;
}

// دالة لاكتشاف الموديل الشغال في حسابك تلقائياً
async function getWorkingModel(apiKey: string): Promise<string> {
  if (cachedModel) return cachedModel;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const validModels = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name as string);

      if (validModels.length > 0) {
        // نختار أفضل موديل متاح في حسابك
        const best =
          validModels.find((m) => m.includes("2.0-flash")) ||
          validModels.find((m) => m.includes("flash")) ||
          validModels.find((m) => m.includes("pro")) ||
          validModels[0];

        cachedModel = best;
        return best;
      }
    }
  } catch (e) {
    console.error("Error fetching models:", e);
  }

  // في حالة تعذر القائمة، نستخدم الموديل القياسي
  return "models/gemini-2.0-flash";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "⚠️ مفتاح GEMINI_API_KEY غير موجود في إعدادات السيرفر." });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const [systemPrompt, activeModel] = await Promise.all([
      buildSystemPrompt(),
      getWorkingModel(apiKey),
    ]);

    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/${activeModel}:generateContent?key=${apiKey}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nسؤال العميل: ${message.trim()}` }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 600,
        },
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const reply =
        data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim() ||
        "أهلاً بك يا دكتور! كيف يمكنني مساعدتك اليوم؟";

      return res.status(200).json({ reply });
    } else {
      return res.status(200).json({
        reply: `⚠️ جوجل رفضت الطلب بالموديل (${activeModel}):\n${data?.error?.message || "خطأ غير معروف"}`,
      });
    }
  } catch (err: any) {
    return res.status(200).json({
      reply: `💥 خطأ داخلي: ${err.message}`,
    });
  }
}
