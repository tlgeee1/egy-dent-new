import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

const PRIMARY = "gemini-3.8-flash";
let promptCache: { prompt: string; expiresAt: number } | null = null;
let liveModel: string | null = null;
const TTL = 300_000;

async function buildSystemPrompt(): Promise<string> {
  if (promptCache && promptCache.expiresAt > Date.now()) return promptCache.prompt;

  const [pSnap, cSnap] = await Promise.all([
    getDocs(collection(liteDb, "products")),
    getDocs(collection(liteDb, "categories")),
  ]);

  const products = pSnap.empty ? DEFAULT_PRODUCTS : pSnap.docs.map((d) => d.data() as Product);
  const categories = cSnap.empty ? DEFAULT_CATEGORIES : cSnap.docs.map((d) => d.data() as Category);
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

  const prompt = `أنت مساعد متجر إيجي دنت لمستلزمات الأسنان في مصر.
- رد بالعامية المصرية، مختصر وواضح.
- استخدم المنتجات والأسعار التالية فقط. ممنوع تخترع صنف أو سعر.
- لو مش متأكد: قول للدكتور يكلم واتساب 01151605515.

المنتجات:
${productLines}

السياسات:
${policyText}
فروع: مدينة نصر، القصر العيني، 6 أكتوبر.`;

  promptCache = { prompt, expiresAt: Date.now() + TTL };
  return prompt;
}

async function pickModel(apiKey: string): Promise<string> {
  if (liveModel) return liveModel;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    );
    if (res.ok) {
      const data = await res.json();
      const names = (data.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => String(m.name).replace(/^models\//, ""));
      const best =
        names.find((n: string) => n === PRIMARY) ||
        names.find((n: string) => n.includes("3.8") && n.includes("flash")) ||
        names.find((n: string) => n.includes("flash")) ||
        names[0];
      if (best) {
        liveModel = best;
        return best;
      }
    }
  } catch {}
  liveModel = PRIMARY;
  return PRIMARY;
}

async function askGemini(apiKey: string, model: string, prompt: string, question: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nسؤال الدكتور: ${question}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 450 },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim() || "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }
  if (!apiKey) {
    return res.status(200).json({ reply: "كلمنا واتساب 01151605515 🦷" });
  }

  try {
    const [prompt, model] = await Promise.all([buildSystemPrompt(), pickModel(apiKey)]);
    const reply = await askGemini(apiKey, model, prompt, message.trim());
    if (reply) return res.status(200).json({ reply });
    return res.status(200).json({ reply: "أهلاً يا دكتور، اكتب اسم الصنف وأقولك السعر. أو واتساب 01151605515 🦷" });
  } catch (err: any) {
    liveModel = null;
    return res.status(200).json({ reply: `⚠️ ${err.message}` });
  }
}
