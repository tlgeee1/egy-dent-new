import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebase.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number; products: Product[] } | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchLiveProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (snap.empty) return DEFAULT_PRODUCTS;
    return snap.docs.map((d) => d.data() as Product);
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

async function fetchLiveCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(liteDb, "categories"));
    if (snap.empty) return DEFAULT_CATEGORIES;
    return snap.docs.map((d) => d.data() as Category);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

async function getStoreContext() {
  if (cache && cache.expiresAt > Date.now()) {
    return { prompt: cache.prompt, products: cache.products };
  }

  const [products, categories] = await Promise.all([fetchLiveProducts(), fetchLiveCategories()]);

  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

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

  const prompt = `أنت "مساعد إيجي دنت الذكي" — مستشار طبي معتمد وخبير مستلزمات طب الأسنان لمتجر "إيجي دنت" (EgyDent) في مصر.

قواعد واستراتيجية الإجابة:
1. أجب عن أي سؤال يخص طب الأسنان وخاماته (طرق الاستخدام، خطوات العمل الإكلينيكي، المقارنات، الفروق بين المواد والشركات، علاج الجذور، الحشوات، الطبعات، التعقيم، الجراحة، التجميل) بأسلوب علمي راقي بالعامية المصرية الطبية.
2. اشرح الخطوات بالترتيب بأسلوب واضح ومختصر ومنظم (نظام نقاط 1، 2، 3).
3. بعد تقديم الشرح الطبي الكافي، اربط الإجابة بالمنتجات المتاحة لدينا في المتجر بأسعارها المذكورة أدناه.
4. لو سأل عن أسعار منتج موجود في القائمة، أجب بسعره بدقة.
5. للتواصل المباشر مع المبيعات وتأكيد الطلبات: واتساب 01151605515.

قائمة منتجات وأسعار متجر إيجي دنت المتاحة:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر. الشحن متاح لجميع محافظات مصر والدفع عند الاستلام أو انستاباي/فودافون كاش.`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS, products };
  return { prompt, products };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  const { prompt: systemPrompt } = await getStoreContext();
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (apiKey && apiKey !== "") {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            ...(Array.isArray(history) ? history.slice(-6) : []).map((h: any) => ({
              role: h.role === "user" ? "user" : "assistant",
              content: h.text,
            })),
            { role: "user", content: message.trim() },
          ],
          temperature: 0.6,
          max_tokens: 700,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return res.status(200).json({ reply });
        }
      }
    } catch (e) {
      console.error("DeepSeek call error:", e);
    }
  }

  return res.status(200).json({ 
    reply: "أهلاً بك يا دكتور في إيجي دنت! 🦷 تقدر تسألني عن أي خامة أو خطوات استخدام أو أسعار، أو تواصل معنا مباشرة عبر الواتساب على: 01151605515." 
  });
}
