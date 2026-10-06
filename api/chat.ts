import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number } | null = null;
const TTL = 120_000;
const MODEL = "gemini-2.0-flash";

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
  if (cache && cache.expiresAt > Date.now()) return cache.prompt;

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

  const prompt = `أنت "مساعد إيجي دنت الذكي" — خبير مستلزمات طب الأسنان لمتجر "إيجي دنت" في مصر.
1. خبير في خامات الأسنان (Composites, Bonding, C-Silicone, A-Silicone, Alginate, Etching).
2. اشرح طريقة الاستخدام بخطوات مرتبة ومختصرة بالعامية المصرية الراقية.
3. عند المقارنة، رشح الأصناف المتاحة بس اللي في القائمة وأسعارها.
4. التزم بالمنتجات والأسعار المذكورة تحت فقط، ولا تخترع أسعاراً.
5. للحجز والتواصل: واتساب 01151605515.

المنتجات والأسعار:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر.`;

  cache = { prompt, expiresAt: Date.now() + TTL };
  return prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({
      reply: "خدمة المساعد بتتجهز حالياً. كلمنا على واتساب 01151605515 واسأل أي حاجة 🦷",
    });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-4)) {
        if (h?.text?.trim()) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.text.trim() }],
          });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    let lastError = "";

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const reply = data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text || "")
            .join("")
            .trim();
          if (reply) return res.status(200).json({ reply });
        }

        lastError = `${response.status} ${(await response.text()).slice(0, 200)}`;
        console.error("Gemini attempt", attempt, lastError);

        if (response.status === 429 || response.status === 503) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        break; // 400/403/404 مش هيتحل بإعادة المحاولة
      } catch (err: any) {
        lastError = err.message;
      }
    }

    console.error("Gemini final error:", lastError);
    return res.status(200).json({
      reply: "عذراً يا دكتور، الخدمة مش متاحة دلوقتي. كلمنا على واتساب 01151605515 واساعدك فوراً 🦷",
    });
  } catch (err: any) {
    console.error("Chat handler error:", err);
    return res.status(200).json({
      reply: "حصلت مشكلة تقنية بسيطة، من فضلك حاول تاني أو كلمنا واتساب 01151605515.",
    });
  }
}
