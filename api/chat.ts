import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

// كاش للمنتجات والموديلات لتسريع السيرفر
let promptCache: { prompt: string; products: Product[]; expiresAt: number } | null = null;
let verifiedModel: string | null = null;

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

async function getStoreData() {
  if (promptCache && promptCache.expiresAt > Date.now()) {
    return promptCache;
  }

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

  const prompt = `أنت "مساعد إيجي دنت الذكي" — مستشار متجر مستلزمات طب الأسنان في مصر.
تعليماتك:
1. أنت طبيب وصيدلي خبير، رد بالعامية المصرية الراقية والواضحة والموجزة.
2. التزم فقط بالمنتجات والأسعار المذكورة أدناه ولا تبتكر أسعاراً من عندك.
3. للتواصل والمبيعات وحجز الأوردرات: واتساب 01151605515.

المنتجات والأسعار المتاحة:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر. الشحن متاح لكل مصر.`;

  promptCache = { prompt, products, expiresAt: Date.now() + 180_000 };
  return promptCache;
}

// استخراج الموديلات الفعالة والحقيقية 100% من جوجل
async function getGoogleLiveModels(apiKey: string): Promise<string[]> {
  if (verifiedModel) return [verifiedModel];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const valid = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name as string); // يرجع الاسم الحرفي مثل models/gemini-2.0-flash

      if (valid.length > 0) {
        // ترتيب الموديلات للأفضل والأسرع
        valid.sort((a: string, b: string) => {
          if (a.includes("flash") && !b.includes("flash")) return -1;
          if (!a.includes("flash") && b.includes("flash")) return 1;
          return 0;
        });
        return valid;
      }
    }
  } catch (e) {
    console.error("ListModels failed:", e);
  }

  return ["models/gemini-2.0-flash", "models/gemini-1.5-flash", "models/gemini-pro"];
}

// رد ذكي محلي في حالة حدوث أي طارئ لجوجل
function smartLocalFallback(query: string, products: Product[]): string {
  const q = query.toLowerCase();
  const matched = products.filter((p) =>
    q.split(" ").some((word) => word.length > 2 && p.name.toLowerCase().includes(word))
  );

  if (matched.length > 0) {
    const items = matched.slice(0, 4).map((p) => `• ${p.name} — سعره: ${p.price} ج`).join("\n");
    return `أهلاً بك يا دكتور! بخصوص استفسارك، دي الأصناف والأسعار المتاحة عندنا:\n\n${items}\n\nلطلب الكميات أو أي استفسار، تواصل معنا مباشرة واتساب: 01151605515 🦷`;
  }

  return `أهلاً بك يا دكتور في إيجي دنت! متاح لدينا جميع مستلزمات وخامات الأسنان الأصلية بأفضل الأسعار. لحجز الأوردر فوراً أو الاستفسار تواصل معنا واتساب: 01151605515 🦷`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  const { prompt: systemPrompt, products } = await getStoreData();

  if (!apiKey) {
    return res.status(200).json({ reply: smartLocalFallback(message, products) });
  }

  try {
    const liveModels = await getGoogleLiveModels(apiKey);

    // تجربة الموديلات المستلمة من جوجل مباشرة
    for (const modelPath of liveModels) {
      try {
        const cleanPath = modelPath.startsWith("models/") ? modelPath : `models/${modelPath}`;
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/${cleanPath}:generateContent?key=${apiKey}`;

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nسؤال الطبيب: ${message.trim()}` }],
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
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (reply) {
            verifiedModel = cleanPath; // حفظ الموديل الناجح
            return res.status(200).json({ reply });
          }
        }
      } catch {
        continue;
      }
    }

    // لو جوجل فيها عطل عام، هيرد فوراً الرد الذكي المربوط بمنتجاتك
    return res.status(200).json({ reply: smartLocalFallback(message, products) });

  } catch (err: any) {
    return res.status(200).json({ reply: smartLocalFallback(message, products) });
  }
}
