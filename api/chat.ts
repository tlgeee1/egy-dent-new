import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3-flash-preview",
  "gemini-2.0-flash-001",
  "gemini-flash-latest",
];

let promptCache: { prompt: string; expiresAt: number } | null = null;
const TTL = 180_000;

async function buildSystemPrompt(): Promise<string> {
  if (promptCache && promptCache.expiresAt > Date.now()) return promptCache.prompt;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const catSnap = await getDocs(collection(liteDb, "categories"));
  const categories = catSnap.empty ? DEFAULT_CATEGORIES : catSnap.docs.map((d) => d.data() as Category);
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

  const prompt = `أنت "مساعد إيجي دنت الذكي" لمتجر إيجي دنت في مصر.
1. رد بالعامية المصرية الراقية والمختصرة.
2. التزم فقط بالمنتجات والأسعار أدناه ولا تخترع أسعاراً.
3. واتساب المبيعات: 01151605515.

المنتجات:
${productLines}

السياسات:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر.`;

  promptCache = { prompt, expiresAt: Date.now() + TTL };
  return promptCache.prompt;
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

  const systemPrompt = await buildSystemPrompt();
  let lastErr = "";

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `${systemPrompt}\n\nسؤال الدكتور: ${message.trim()}` }] },
            ],
            generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim();
        if (reply) return res.status(200).json({ reply });
      }
      lastErr = data?.error?.message || String(response.status);
    } catch (e: any) {
      lastErr = e.message;
    }
  }

  return res.status(200).json({ reply: `⚠️ ${lastErr}` });
}
