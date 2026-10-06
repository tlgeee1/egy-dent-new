import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

// قائمة أحدث الموديلات الرسمية الفعالة من جوجل
const CANDIDATE_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest"
];

let workingModelCache: string | null = null;

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

  return `أنت "مساعد إيجي دنت الذكي" — مستشار ومساعد متجر مستلزمات طب الأسنان في مصر.
تعليماتك:
1. أنت طبيب وصيدلي خبير في خامات الأسنان، رد بالعامية المصرية الراقية والواضحة والموجزة.
2. التزم فقط بالمنتجات والأسعار المذكورة أدناه ولا تبتكر أسعاراً من عندك.
3. للتواصل والمبيعات وحجز الأوردرات: واتساب 01151605515.

المنتجات والأسعار المتاحة:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر. الشحن متاح لكل مصر.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "⚠️ مفتاح GEMINI_API_KEY غير موجود في Vercel." });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    // نضع الموديل الذي نجح سابقاً في المقدمة لتسريع الرد لأقصى درجة
    const modelsToTry = workingModelCache
      ? [workingModelCache, ...CANDIDATE_MODELS.filter((m) => m !== workingModelCache)]
      : CANDIDATE_MODELS;

    let lastErrorMsg = "";

    // حلقة تجربة الموديلات حتى ينجح واحد منها
    for (const model of modelsToTry) {
      try {
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

        if (response.ok) {
          const data = await response.json();
          const reply =
            data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim();

          if (reply) {
            workingModelCache = model; // حفظ الموديل الشغال في الذاكرة
            return res.status(200).json({ reply });
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          lastErrorMsg = errData?.error?.message || `Error ${response.status}`;
        }
      } catch (err: any) {
        lastErrorMsg = err.message;
      }
    }

    return res.status(200).json({
      reply: `⚠️ تعذر استجابة الموديلات المتاحة:\n${lastErrorMsg}`,
    });

  } catch (err: any) {
    return res.status(200).json({
      reply: `💥 خطأ في السيرفر: ${err.message}`,
    });
  }
}
