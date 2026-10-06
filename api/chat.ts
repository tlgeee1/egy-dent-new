import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

const MODELS = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-3.8-flash"];

let promptCache: { prompt: string; expiresAt: number } | null = null;
const TTL = 300_000;

async function fetchWithTimeout(url: string, options: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function buildSystemPrompt(): Promise<string> {
  if (promptCache && promptCache.expiresAt > Date.now()) return promptCache.prompt;

  let products: Product[] = DEFAULT_PRODUCTS;
  let categories: Category[] = DEFAULT_CATEGORIES;
  try {
    const pSnap = await getDocs(collection(liteDb, "products"));
    const cSnap = await getDocs(collection(liteDb, "categories"));
    if (!pSnap.empty) products = pSnap.docs.map((d) => d.data() as Product);
    if (!cSnap.empty) categories = cSnap.docs.map((d) => d.data() as Category);
  } catch {
    /* defaults */
  }

  const catNames: Record<string, string> = {};
  categories.forEach((c) => {
    catNames[c.id] = c.name;
  });

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

async function askModel(apiKey: string, model: string, prompt: string, question: string): Promise<string> {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${prompt}\n\nسؤال الدكتور: ${question}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
      }),
    },
    8000
  );
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(data.error?.message || String(response.status));
  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";
  if (!reply) throw new Error("empty");
  return reply;
}

export default async function handler(
  req: { method?: string; body?: { message?: string } },
  res: { status: (n: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const message = req.body?.message;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }
  if (!apiKey) {
    res.status(200).json({ reply: "كلمنا واتساب 01151605515 🦷" });
    return;
  }

  try {
    const prompt = await buildSystemPrompt();
    const q = message.trim();
    for (let i = 0; i < MODELS.length; i++) {
      try {
        const reply = await askModel(apiKey, MODELS[i], prompt, q);
        res.status(200).json({ reply });
        return;
      } catch {
        /* next model */
      }
    }
    res.status(200).json({
      reply: "السيرفر متأخر دلوقتي. ابعت السؤال تاني، أو واتساب 01151605515 🦷",
    });
  } catch {
    res.status(200).json({
      reply: "السيرفر متأخر دلوقتي. ابعت السؤال تاني، أو واتساب 01151605515 🦷",
    });
  }
}
