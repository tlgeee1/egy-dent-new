import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-3.8-flash"];
let promptCache: { prompt: string; expiresAt: number } | null = null;
let modelCache: string[] | null = null;
const TTL = 300_000;

const BUSY = "أهلاً يا دكتور، جرّب تبعت السؤال تاني بعد ثواني، أو واتساب 01151605515 🦷";

async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
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
    .slice(0, 80)
    .map((p) => `- ${p.name} | ${p.price}ج`)
    .join("\n");

  const policyText = Object.values(policyPages)
    .map((page) => page.title)
    .join("، ");

  const prompt = `موظف مبيعات إيجي دنت فقط.
- الأسعار من القائمة فقط. ممنوع تخترع سعر أو صنف.
- لو مش في القائمة: "غير متوفر" وواتساب 01151605515.
- عامية مصرية، رد قصير.
- فروع: مدينة نصر، القصر العيني، 6 أكتوبر. سياسات: ${policyText}.

المنتجات:
${productLines}`;

  promptCache = { prompt, expiresAt: Date.now() + TTL };
  return prompt;
}

async function listModels(apiKey: string): Promise<string[]> {
  if (modelCache && modelCache.length) return modelCache;
  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { method: "GET" },
      6000
    );
    if (!res.ok) throw new Error("list");
    const data = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const names = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => String(m.name || "").replace(/^models\//, ""))
      .filter((n) => n.includes("flash") || n.includes("gemini"));
    names.sort((a, b) => {
      const score = (n: string) => {
        if (n.includes("2.0-flash")) return 1;
        if (n.includes("flash-latest")) return 2;
        if (n.includes("3.8")) return 3;
        if (n.includes("flash")) return 4;
        return 9;
      };
      return score(a) - score(b);
    });
    if (names.length) {
      modelCache = names.slice(0, 4);
      return modelCache;
    }
  } catch {
    /* fallback list */
  }
  modelCache = FALLBACK_MODELS;
  return modelCache;
}

async function askOnce(apiKey: string, model: string, prompt: string, question: string): Promise<string> {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${prompt}\n\nسؤال: ${question}` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 350 },
      }),
    },
    12000
  );
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (response.status === 429 || response.status === 503) throw new Error("busy");
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
    const models = await listModels(apiKey);
    const q = message.trim();

    for (let m = 0; m < models.length; m++) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const reply = await askOnce(apiKey, models[m], prompt, q);
          res.status(200).json({ reply });
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (msg === "busy" && attempt === 0) {
            await new Promise((r) => setTimeout(r, 900));
            continue;
          }
          break;
        }
      }
    }

    res.status(200).json({ reply: BUSY });
  } catch {
    res.status(200).json({ reply: BUSY });
  }
}
