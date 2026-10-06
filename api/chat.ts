import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; products: Product[]; catNames: Record<string, string>; expiresAt: number } | null = null;
const TTL = 180_000;

async function getStoreData() {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const catSnap = await getDocs(collection(liteDb, "categories"));
  const categories = catSnap.empty ? DEFAULT_CATEGORIES : catSnap.docs.map((d) => d.data() as Category);
  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} جنيه`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي" لمتجر مستلزمات طب الأسنان في مصر.
تعليماتك الصارمة جداً:
1. رد بالعامية المصرية باختصار ووضوح في سطرين كحد أقصى.
2. يمنع منعاً باتاً ذكر أي سعر لأي منتج من خارج القائمة التالية.
3. إذا سألك العميل عن منتج غير موجود، قل: "عذراً يا دكتور، الصنف ده مش متوفر حالياً، يرجى التواصل مع المبيعات على واتساب 01151605515".
4. للتواصل وحجز الأوردرات: واتساب 01151605515.

المنتجات والأسعار المتاحة:
${productLines}`;

  storeCache = { prompt, products, catNames, expiresAt: Date.now() + TTL };
  return storeCache;
}

// 🚀 بحث محلي ذكي وسريع جداً (بيشتغل لو النت فصل أو المفتاح غلط)
function instantLocalSearch(query: string, products: Product[]): string {
  const q = query.toLowerCase().trim();
  const words = q.split(" ").filter(w => w.length > 2);
  
  const matched = products.filter(p => {
    if (p.showcaseOnly) return false;
    const pName = p.name.toLowerCase();
    return words.some(w => pName.includes(w));
  });

  if (matched.length > 0) {
    const list = matched.slice(0, 4).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
    return `أهلاً يا دكتور! دي أسعار الأصناف اللي سألت عليها فوراً:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
  }

  return `أهلاً بك يا دكتور! لمزيد من التفاصيل حول الأسعار والخامات، يرجى التواصل مع المبيعات مباشرة على واتساب: 01151605515 🦷`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message, history } = req.body || {};

  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  const { prompt: systemPrompt, products } = await getStoreData();

  if (!apiKey) {
    return res.status(200).json({ reply: instantLocalSearch(message, products) });
  }

  // ⏱️ تقليل وقت الانتظار لـ 4 ثواني فقط عشان الشات ميعلقش
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); 

  try {
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-4)) {
        if (h?.text?.trim()) {
          contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 }, // دقيق جداً وسريع
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      // لو المفتاح تالف هيرد فوراً من الداتا بيز بدل رسالة الخطأ
      return res.status(200).json({ reply: instantLocalSearch(message, products) });
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    // لو النت بطيء هيرد فوراً من الداتا بيز 
    return res.status(200).json({ reply: instantLocalSearch(message, products) });
  }
}
