import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebase.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 45_000;

async function fetchLiveProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (snap.empty) return DEFAULT_PRODUCTS;
    return snap.docs.map((d) => d.data() as Product);
  } catch (err) {
    console.error("فشل قراءة المنتجات:", err);
    return DEFAULT_PRODUCTS;
  }
}

async function fetchLiveCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(liteDb, "categories"));
    if (snap.empty) return DEFAULT_CATEGORIES;
    return snap.docs.map((d) => d.data() as Category);
  } catch (err) {
    console.error("فشل قراءة الفئات:", err);
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

  const prompt = `إنت "مساعد إيجي دنت" — شات بوت خدمة عملاء لموقع إيجي دنت، متجر بيع مستلزمات طب الأسنان بالجملة في مصر.

تعليمات:
- رد بالعامية المصرية بشكل ودود ومختصر.
- استخدم المعلومات الموجودة فقط. لو مش متأكد، وجّه العميل لواتساب 01151605515.
- متخترعش أسعار.
- لو طلب مقارنة، قارن بين المنتجات بالتفصيل (السعر، النوع، المميزات).
- خلي ردودك 2-4 جمل.

المنتجات والأسعار:
${productLines}

سياسات المتجر:
${policyText}`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY مش موجود");
    res.status(500).json({ error: "GEMINI_API_KEY غير موجود في البيئة" });
    return;
  }

  const { message, history } = req.body || {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }

  try {
    const systemPrompt = await buildSystemPrompt();
    
    const cleanHistory = Array.isArray(history)
      ? history.slice(-6).map((h: any) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        }))
      : [];

    const contents = [
      ...cleanHistory,
      { role: "user", parts: [{ text: message }] }
    ];

    console.log("📤 Calling Gemini API...");

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("❌ Gemini error:", geminiRes.status, errText);
      res.status(502).json({ error: "مشكلة في التواصل مع الذكاء الاصطناعي" });
      return;
    }

    const data = await geminiRes.json();
    console.log("✅ Gemini response received");

    const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim()
      || "معلش، مقدرتش أفهم سؤالك. جرب تاني.";

    res.status(200).json({ reply });
  } catch (err: any) {
    console.error("💥 Chat error:", err.message);
    res.status(500).json({ error: "حصل خطأ غير متوقع" });
  }
}
