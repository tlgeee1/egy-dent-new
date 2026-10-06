import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

const MODELS = ["gemini-3.8-flash", "gemini-2.0-flash", "gemini-flash-latest"];
let promptCache: { prompt: string; expiresAt: number } | null = null;
const TTL = 300_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
رد بالعامية المصرية، مختصر.
استخدم المنتجات والأسعار التالية فقط. ممنوع تخترع سعر.
واتساب: 01151605515.

المنتجات:
${productLines}

السياسات:
${policyText}
فروع: مدينة نصر، القصر العيني، 6 أكتوبر.`;

  promptCache = { prompt, expiresAt: Date.now() + TTL };
  return prompt;
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

  const prompt = await buildSystemPrompt();

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { role: "user", parts: [{ text: `${prompt}\n\nسؤال الدكتور: ${message.trim()}` }] },
              ],
              generationConfig: { temperature: 0.3, maxOutputTokens: 450 },
            }),
          }
        );
        const data = await response.json();

        if (response.ok) {
          const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim();
          if (reply) return res.status(200).json({ reply });
        }

        const busy = response.status === 429 || response.status === 503 || String(data?.error?.message || "").includes("high demand");
        if (busy && attempt < 3) {
          await sleep(800 * attempt);
          continue;
        }
        if (!busy) break;
      } catch {
        if (attempt < 3) await sleep(800 * attempt);
      }
    }
  }

  return res.status(200).json({
    reply: "أهلاً يا دكتور، السيرفر عليه زحمة خفيفة دلوقتي. ابعت تاني بعد ثواني، أو واتساب 01151605515 🦷",
  });
}
