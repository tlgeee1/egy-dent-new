import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebase.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

// اتصال خفيف بـ Firestore (نسخة lite، مناسبة لدالة serverless بتقرأ وتخلص من غير realtime listener)
const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

/** بيانات الموقع لايف من Firestore، مع كاش قصير (45 ثانية) عشان منقراش Firestore في كل رسالة */
let cache: { prompt: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 45_000;

async function fetchLiveProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (snap.empty) return DEFAULT_PRODUCTS; // لسه محدش دخل الأدمن يضيف حاجة (أول تشغيل) → استخدم القائمة الافتراضية
    return snap.docs.map((d) => d.data() as Product);
  } catch (err) {
    console.error("فشل قراءة المنتجات من Firestore، هيتم استخدام النسخة الافتراضية:", err);
    return DEFAULT_PRODUCTS;
  }
}

async function fetchLiveCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(liteDb, "categories"));
    if (snap.empty) return DEFAULT_CATEGORIES;
    return snap.docs.map((d) => d.data() as Category);
  } catch (err) {
    console.error("فشل قراءة الفئات من Firestore، هيتم استخدام النسخة الافتراضية:", err);
    return DEFAULT_CATEGORIES;
  }
}

// نبني برومبت من بيانات الموقع الحية (المنتجات + الفئات من Firestore، والسياسات ثابتة)
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

  const prompt = `إنت "مساعد إيجي دنت" — شات بوت خدمة عملاء لموقع إيجي دنت، متجر بيع مستلزمات طب الأسنان بالجملة في مصر (3 فروع: مدينة نصر، القصر العيني، 6 أكتوبر).

تعليمات مهمة:
- رد دايمًا بالعامية المصرية، بشكل ودود ومختصر ومباشر.
- استخدم فقط المعلومات الموجودة تحت (المنتجات والسياسات). لو السؤال عن حاجة مش موجودة عندك، قول بصراحة إنك مش متأكد ووجّه العميل للتواصل على واتساب 0115 160 5515.
- متخترعش أسعار أو منتجات مش موجودة في القائمة.
- لو العميل عايز يأكد طلب فعلي أو يتكلم مع حد حقيقي، وجّهه لواتساب على نفس الرقم.
- خلي ردودك قصيرة (2-4 جمل) إلا لو السؤال محتاج تفصيل أكتر.

قائمة المنتجات والأسعار:
${productLines}

سياسات المتجر:
${policyText}`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}

export default async function handler(req: { method?: string; body?: unknown }, res: {
  status: (code: number) => { json: (body: unknown) => void };
}) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY غير موجود في إعدادات Vercel" });
    return;
  }

  const { message, history } = req.body as {
    message?: string;
    history?: { role: "user" | "model"; text: string }[];
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }

  try {
    const systemPrompt = await buildSystemPrompt();
    const contents = [
      ...(history ?? []).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: "user", parts: [{ text: message }] },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      res.status(502).json({ error: "حصلت مشكلة في التواصل مع الذكاء الاصطناعي" });
      return;
    }

    const data = await geminiRes.json();
    const reply: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
      "معلش، مقدرتش أفهم سؤالك. ممكن تجرب تاني أو تكلم فريقنا على واتساب؟";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).json({ error: "حصل خطأ غير متوقع" });
  }
}
