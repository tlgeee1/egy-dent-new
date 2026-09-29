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

// Rate Limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW = 60000;

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

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip = req.headers?.["x-forwarded-for"]?.split(',')[0] || req.headers?.["x-real-ip"] || "unknown";
  
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "كتير من الرسائل! استنى شوية وحاول تاني." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY مش موجود");
    res.status(500).json({ error: "إعدادات الذكاء الاصطناعي مش متوفرة" });
    return;
  }

  const { message, history } = req.body || {};

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }

  if (message.length > 1000) {
    res.status(400).json({ error: "الرسالة طويلة جداً" });
    return;
  }

  try {
    const systemPrompt = await buildSystemPrompt();
    
    // ✅ تنظيف الـ history
    const cleanHistory = Array.isArray(history) 
      ? history
          .slice(-8) // آخر 8 رسائل فقط
          .filter(h => h && typeof h.text === 'string' && h.text.trim().length > 0)
          .map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text.trim() }]
          }))
      : [];

    const contents = [
      ...cleanHistory,
      { role: "user", parts: [{ text: message.trim() }] }
    ];

    console.log("📤 Sending to Gemini:", { 
      messageCount: contents.length,
      lastMessage: message.substring(0, 50)
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      // ✅ اسم الموديل الصحيح
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { 
              temperature: 0.7, 
              maxOutputTokens: 500,
              topP: 0.9,
              topK: 40
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
              }
            ]
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("❌ Gemini API Error:", {
          status: geminiRes.status,
          statusText: geminiRes.statusText,
          body: errText.substring(0, 500)
        });
        
        res.status(502).json({ 
          error: "حصلت مشكلة في التواصل مع الذكاء الاصطناعي. حاول تاني." 
        });
        return;
      }

      const data = await geminiRes.json();
      
      console.log("📥 Gemini Response:", {
        hasCandidates: !!data?.candidates,
        candidatesLength: data?.candidates?.length
      });

      if (!data?.candidates?.[0]?.content?.parts) {
        console.error("❌ Invalid response structure:", JSON.stringify(data, null, 2));
        res.status(500).json({ 
          error: "الذكاء الاصطناعي رجع رد غريب. حاول تاني." 
        });
        return;
      }

      const reply = data.candidates[0].content.parts
        .map((p: any) => p.text || "")
        .join("")
        .trim();

      if (!reply) {
        res.status(500).json({ 
          error: "معلش، مقدرتش أفهم سؤالك. حاول تاني أو كلمنا على واتساب." 
        });
        return;
      }

      console.log("✅ Success:", reply.substring(0, 100));
      res.status(200).json({ reply });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === "AbortError") {
        console.error("⏱️ Request timeout");
        res.status(504).json({ error: "الطلب أخد وقت طويل. حاول تاني." });
      } else {
        throw fetchError;
      }
    }

  } catch (err: any) {
    console.error("💥 Chat handler error:", {
      message: err.message,
      stack: err.stack?.substring(0, 500)
    });
    
    res.status(500).json({ 
      error: "حصل خطأ غير متوقع. حاول تاني بعد شوية." 
    });
  }
}
