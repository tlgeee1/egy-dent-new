import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_PRODUCTS, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

const WA = "01151605515";
const MODEL = "gemini-3.8-flash";

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/كافيتي|كافيتى/g, "كافتي")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as Product).filter((p) => !p.showcaseOnly);
    }
  } catch {
    /* defaults */
  }
  return DEFAULT_PRODUCTS.filter((p) => !p.showcaseOnly);
}

function format(list: Product[]) {
  return list.slice(0, 10).map((p) => `• ${p.name} — ${p.price} ج`).join("\n");
}

async function askGemini(apiKey: string, question: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `مساعد إيجي دنت. عامية مصرية مختصرة. خطوات طبية مرقمة. لا تخترع أسعار. واتساب ${WA}.\nسؤال: ${question}`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(t);
    if (!r.ok) return null;
    const data = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}

export default async function handler(
  req: { method?: string; body?: { message?: string } },
  res: { status: (n: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const message = req.body?.message;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }

  const q = norm(message);
  const all = await loadProducts();

  if (/(السلام|اهلا|ازيك|مرحبا)/.test(q) && q.split(" ").length <= 6) {
    res.status(200).json({
      reply: `وعليكم السلام يا دكتور 🦷\nاسأل عن طريقة كافتي أو سعر صنف بالاسم.`,
    });
    return;
  }

  if (/(كافتي|cavity)/.test(q)) {
    res.status(200).json({
      reply: `تحضير كافتي — خطوات عامة:
1) كشف + تخدير.
2) عزل السن.
3) فتح بتبريد مائي.
4) إزالة التسوس بحذر.
5) تشكيل الحفرة.
6) غسيل وliner لو محتاج.
7) إتش + بوند + كمبوزيت طبقات.
8) إطباق وتلميع.
حسب حالة المريض. واتساب ${WA}`,
    });
    return;
  }

  if (/(منتجات ايه|عندكم ايه|اصناف)/.test(q) && q.length < 50) {
    res.status(200).json({
      reply: `عينة من الأصناف:\n${format(all)}\n\nاكتب اسم الماركة. واتساب ${WA}`,
    });
    return;
  }

  const words = q.split(" ").filter((w) => w.length >= 4);
  const hits = all.filter((p) => words.some((w) => norm(p.name).includes(w)));
  if (hits.length && /(بكام|سعر|عندكم|شوفو|كمبوز|بوند|جوان)/.test(q)) {
    res.status(200).json({ reply: `الأصناف:\n${format(hits)}\n\nواتساب ${WA}` });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    const ai = await askGemini(apiKey, message.trim());
    if (ai) {
      res.status(200).json({ reply: ai });
      return;
    }
  }

  if (hits.length) {
    res.status(200).json({ reply: `الأصناف:\n${format(hits)}\n\nواتساب ${WA}` });
    return;
  }

  res.status(200).json({
    reply: `اكتب "طريقة كافتي" أو اسم الصنف. واتساب ${WA}`,
  });
}
