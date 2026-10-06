import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

const MODELS = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-3.8-flash"];
const WA = "01151605515";
let cache: {
  products: Product[];
  catNames: Record<string, string>;
  prompt: string;
  at: number;
} | null = null;
const TTL = 120_000;

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadStore() {
  if (cache && Date.now() - cache.at < TTL) return cache;

  let products = DEFAULT_PRODUCTS;
  let categories = DEFAULT_CATEGORIES;
  try {
    const [pSnap, cSnap] = await Promise.all([
      getDocs(collection(liteDb, "products")),
      getDocs(collection(liteDb, "categories")),
    ]);
    if (!pSnap.empty) products = pSnap.docs.map((d) => d.data() as Product);
    if (!cSnap.empty) categories = cSnap.docs.map((d) => d.data() as Category);
  } catch {
    /* defaults */
  }

  products = products.filter((p) => !p.showcaseOnly);
  const catNames: Record<string, string> = {};
  categories.forEach((c) => {
    catNames[c.id] = c.name;
  });

  const productLines = products.map((p) => `- ${p.name} (${catNames[p.cat] ?? ""}): ${p.price}ج`).join("\n");
  const policyText = Object.values(policyPages)
    .map((page) => page.title)
    .join("، ");

  const prompt = `أنت مساعد إيجي دنت الذكي: طبيب أسنان ومستشار مبيعات المتجر.
- عامية مصرية راقية، خطوات مرقمة للأسئلة الطبية (كافتي، بوند، ألجينيت...).
- الأسعار والأصناف من القائمة فقط. ممنوع تخترع.
- لو سأل "عندكم منتجات إيه" أو عرض عام: لخّص الفئات واذكر 8–12 صنف بأسعارهم من القائمة، ومتقلوش اكتب الاسم بوضوح من غير ما تعرض حاجة.
- واتساب ${WA}. فروع: مدينة نصر، القصر العيني، 6 أكتوبر. سياسات: ${policyText}.

المنتجات:
${productLines}`;

  cache = { products, catNames, prompt, at: Date.now() };
  return cache;
}

function formatList(items: Product[], max = 12) {
  return items
    .slice(0, max)
    .map((p) => `• ${p.name} — ${p.price} ج`)
    .join("\n");
}

function catalogReply(store: NonNullable<typeof cache>) {
  const byCat: Record<string, Product[]> = {};
  store.products.forEach((p) => {
    const k = store.catNames[p.cat] || "أصناف";
    if (!byCat[k]) byCat[k] = [];
    if (byCat[k].length < 3) byCat[k].push(p);
  });
  const cats = Object.keys(byCat);
  const lines = cats
    .slice(0, 8)
    .map((c) => `${c}:\n${formatList(byCat[c], 3)}`)
    .join("\n\n");
  return `أهلاً يا دكتور، دي عينة من أصناف إيجي دنت:\n\n${lines}\n\nاكتب اسم الصنف أو الفئة وأجيبلك الباقي بالسعر.\nواتساب ${WA}`;
}

function searchProducts(q: string, products: Product[]) {
  const nq = norm(q);
  const words = nq.split(" ").filter((w) => w.length >= 3);
  return products
    .map((p) => {
      const n = norm(p.name);
      let s = 0;
      words.forEach((w) => {
        if (n.includes(w)) s += 4;
      });
      return { p, s };
    })
    .filter((x) => x.s >= 4)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

async function askGemini(apiKey: string, prompt: string, question: string): Promise<string | null> {
  for (const model of MODELS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${prompt}\n\nسؤال الدكتور: ${question}` }] }],
            generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
          }),
          signal: ctrl.signal,
        }
      );
      clearTimeout(t);
      if (!response.ok) continue;
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
      if (reply && !reply.includes("اكتب اسم الصنف بوضوح")) return reply;
    } catch {
      continue;
    }
  }
  return null;
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

  const store = await loadStore();
  const q = message.trim();
  const nq = norm(q);

  if (/(السلام|اهلا|ازيك|مرحبا)/.test(nq) && nq.split(" ").length <= 5) {
    res.status(200).json({
      reply: `وعليكم السلام يا دكتور 🦷\nأقدر أساعدك في طريقة الاستخدام أو الأسعار. اسأل مثلاً: كافتي إزاي؟ أو كمبوزيت شوفو بكام؟`,
    });
    return;
  }

  if (/(منتجات ايه|عندكم ايه|اصناف|عرض|كتالوج|منتجاتكم)/.test(nq) && nq.length < 40) {
    res.status(200).json({ reply: catalogReply(store) });
    return;
  }

  const hits = searchProducts(q, store.products);
  const wantPrice = /(بكام|سعر|عندكم|كمبوز|بوند|جوان|شوفو|الجين)/.test(nq);
  if (wantPrice && hits.length && !/(ازاي|طريقه|كافتي|cavity|تحضير)/.test(nq)) {
    res.status(200).json({
      reply: `الأصناف المتاحة:\n\n${formatList(hits, 10)}\n\nواتساب ${WA}`,
    });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    const ai = await askGemini(apiKey, store.prompt, q);
    if (ai) {
      res.status(200).json({ reply: ai });
      return;
    }
  }

  if (hits.length) {
    res.status(200).json({
      reply: `الأصناف المتاحة:\n\n${formatList(hits, 10)}\n\nواتساب ${WA}`,
    });
    return;
  }

  res.status(200).json({ reply: catalogReply(store) });
}
