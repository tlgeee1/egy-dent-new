import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

async function fetchLiveProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    return snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);
  } catch { return DEFAULT_PRODUCTS; }
}

async function fetchLiveCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(liteDb, "categories"));
    return snap.empty ? DEFAULT_CATEGORIES : snap.docs.map((d) => d.data() as Category);
  } catch { return DEFAULT_CATEGORIES; }
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

  return `أنت مساعد متجر إيجي دنت لمستلزمات الأسنان. رد بالعامية المصرية باختصار.
المنتجات:
${productLines}
السياسات:
${policyText}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "❌ مفتاح GEMINI_API_KEY غير موجود في Vercel." });
  }

  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  try {
    const systemPrompt = await buildSystemPrompt();

    // نطلب مباشرة من الموديل السريع
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nسؤال الدكتور: ${message}` }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف أساعدك؟" });
    } else {
      // إظهار سبب رفض جوجل الصريح داخل الشات
      return res.status(200).json({
        reply: `⚠️ جوجل رفضت الطلب:\nالكود: ${response.status}\nالرسالة: ${data?.error?.message || JSON.stringify(data)}`,
      });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: `💥 خطأ اتصال: ${err.message}` });
  }
}
