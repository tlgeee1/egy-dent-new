import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firestore/lite";
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
    console.error("فشل قراءة المنتجات من Firestore:", err);
    return DEFAULT_PRODUCTS;
  }
}

async function fetchLiveCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(liteDb, "categories"));
    if (snap.empty) return DEFAULT_CATEGORIES;
    return snap.docs.map((d) => d.data() as Category);
  } catch (err) {
    console.error("فشل قراءة الفئات من Firestore:", err);
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

// ✅ Rate Limiting بسيط
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // 10 رسائل
const RATE_WINDOW = 60000; // في الدقيقة

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default async function handler(req: { 
  method?: string; 
  body?: unknown;
  headers?: Record<string, string>;
}, res: {
  status: (code: number) => { json: (body: unknown) => void };
}) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // ✅ فحص Rate Limit
  const ip = req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "unknown";
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "كتير من الرسائل! استنى شوية وحاول تاني." });
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

  // ✅ حد أقصى لطول الرسالة
  if (message.length > 1000) {
    res.status(400).json({ error: "الرسالة طويلة جداً (الحد الأقصى 1000 حرف)" });
    return;
  }

  try {
    const systemPrompt = await buildSystemPrompt();
    const contents = [
      ...(history ?? []).slice(-10).map((h) => ({ role: h.role, parts: [{ text: h.text }] })), // آخر 10 رسائل فقط
      { role: "user", parts: [{ text: message }] },
    ];

    // ✅ Timeout للطلب
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 ثانية

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { 
              temperature: 0.4, 
              maxOutputTokens: 400,
              topP: 0.8,
              topK: 40
            },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("Gemini API error:", errText);
        res.status(502).json({ error: "حصلت مشكلة في التواصل مع الذكاء الاصطناعي. حاول تاني." });
        return;
      }

      const data = await geminiRes.json();
      const reply: string =
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
        "معلش، مقدرتش أفهم سؤالك. ممكن تجرب تاني أو تكلم فريقنا على واتساب؟";

      res.status(200).json({ reply: reply.trim() });
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        res.status(504).json({ error: "الطلب أخد وقت طويل. حاول تاني." });
      } else {
        throw fetchError;
      }
    }

  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).json({ error: "حصل خطأ غير متوقع. حاول تاني بعد شوية." });
  }
}
