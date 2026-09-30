import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebase.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // كاش لمدة دقيقة

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

  const prompt = `أنت "مساعد إيجي دنت الذكي" — خبير مستلزمات وطب أسنان وصيدلي لمتجر "إيجي دنت" (EgyDent) في مصر.

معلومات وقواعد مهمة جداً:
1. أنت تفهم كل المصطلحات الطبية الخاصة بطب الأسنان (Bonding, Composites, C-Silicone, A-Silicone, Alginate, Etching, Anterior vs Posterior, etc.).
2. لو العميل سأل عن طريقة استخدام أي خامة، اشرح له الخطوات الطبية السليمة بالترتيب بأسلوب طبي احترافي وودود بالعامية المصرية الراقية.
3. لو العميل سأل عن مقارنة أو فرق، قارن له علمياً وعملياً ومادياً، ورشح له المنتج المناسب من المنتجات المتاحة في المتجر بأسعارها.
4. استخدم فقط الأسعار والمنتجات المذكورة أدناه، ولا تخترع منتجات غير موجودة.
5. خليك دايمًا ودود، ردودك منظمة وواضحة، ومختصرة بدون رغي مفرط.
6. لو العميل طلب التواصل مع المبيعات أو تأكيد أوردر، وجهه للتواصل عبر الواتساب على: 01151605515.

قائمة المنتجات والأسعار الحالية في المتجر:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر.
الشحن متاح لجميع محافظات مصر والدفع عند الاستلام أو انستاباي/فودافون كاش.`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "مفتاح الذكاء الاصطناعي غير متوفر في الإعدادات" });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();
    const contents = [
      ...(Array.isArray(history) ? history.slice(-6) : []).map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      const errBody = await response.text();
      console.error("Gemini Error:", errBody);
      return res.status(502).json({ error: "تعذر الرد من الذكاء الاصطناعي" });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim() ||
      "أهلاً بك! كيف يمكنني مساعدتك اليوم؟";

    return res.status(200).json({ reply });
  } catch (err: any) {
    console.error("Handler Error:", err);
    return res.status(500).json({ error: "حدث خطأ غير متوقع" });
  }
}
