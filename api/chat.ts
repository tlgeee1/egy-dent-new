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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({ error: "مفتاح GEMINI_API_KEY غير موجود في إعدادات Vercel." });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    // تنسيق المحادثة بنظام التتابع الصارم لجوجل جيميني لمنع أي خطأ 400
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
      {
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
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini Error:", errText);
      return res.status(502).json({ error: "تعذر الحصول على رد من الذكاء الاصطناعي حالياً." });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim() ||
      "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟";

    return res.status(200).json({ reply });
  } catch (err: any) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "حدث خطأ غير متوقع في الخادم." });
  }
}
