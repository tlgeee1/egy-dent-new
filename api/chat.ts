import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; products: Product[]; expiresAt: number } | null = null;
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
    .map((p) => `- ${p.name}: ${p.price} جنيه مصرى`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي" لمتجر مستلزمات طب الأسنان في مصر.
تعليماتك الصارمة:
1. أنت طبيب أسنان خبير، تجيب بالعامية المصرية بوضوح واختصار.
2. ⚠️ تحذير: يمنع منعاً باتاً ذكر أي سعر لأي منتج من خارج القائمة التالية.
3. إذا سألك المستخدم عن "أنواع أخرى" أو "إيه تاني"، اذكر له جميع المنتجات المشابهة المتاحة في القائمة.
4. إذا سألك عن منتج غير موجود، قل: "عذراً يا دكتور، الصنف ده مش متوفر حالياً، تواصل مع المبيعات على واتساب 01151605515".
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

المنتجات والأسعار المتاحة:
${productLines}`;

  storeCache = { prompt, products, expiresAt: Date.now() + TTL };
  return storeCache;
}

// 🚀 محرك بحث ذكي "بذاكرة" بيفتكر سياق الكلام
function smartContextFallback(currentMsg: string, history: any[], products: Product[]): string {
  // تجميع كل الكلام اللي اتقال في الشات عشان يفهم هو بيسأل على "إيه تاني" في أنهي صنف
  const fullContext = [...history.map(h => h.text), currentMsg].join(" ").toLowerCase();
  
  // استخراج الكلمات المهمة
  const searchWords = fullContext.split(" ").filter(w => w.length > 3 && w !== "عايز" && w !== "تاني" && w !== "انواع" && w !== "مفيش");
  
  const matched = products.filter(p => {
    if (p.showcaseOnly) return false;
    const pName = p.name.toLowerCase();
    return searchWords.some(w => pName.includes(w));
  });

  if (matched.length > 0) {
    // لو سأل "إيه تاني؟" هيجيبله كل الأنواع (لحد 10 أنواع)
    const list = matched.slice(0, 10).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
    return `بناءً على استفسارك يا دكتور، دي كل الأصناف المتاحة عندنا من النوع ده:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
  }

  return `أهلاً بك يا دكتور! عشان أقدر أفيدك بدقة أكبر في الأسعار، يرجى التواصل مع المبيعات مباشرة على واتساب: 01151605515 🦷`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message, history } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  const { prompt: systemPrompt, products } = await getStoreData();

  const safeHistory = Array.isArray(history) ? history : [];

  if (!apiKey) {
    return res.status(200).json({ reply: smartContextFallback(message, safeHistory, products) });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 ثواني فقط

  try {
    const contents: any[] = [];
    for (const h of safeHistory.slice(-4)) {
      if (h?.text?.trim()) {
        contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
      }
    }
    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    // 💡 التجربة الأولى: الموديل الحديث
    let targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      }),
      signal: controller.signal
    });

    // 💡 لو الموديل الحديث مش متاح على مفتاحك، هيجرب الموديل الأقدم المضمون (gemini-pro)
    if (response.status === 404) {
      targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
      response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${message.trim()}` }] }], // gemini-pro القديم مش بيقبل systemInstruction منفصل
          generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
        }),
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      // لو جوجل قفلت خالص، الرد الذكي اللي بذاكرة هيشتغل
      return res.status(200).json({ reply: smartContextFallback(message, safeHistory, products) });
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    // لو النت فصل أو الوقت خلص، الرد الذكي اللي بذاكرة هيشتغل
    return res.status(200).json({ reply: smartContextFallback(message, safeHistory, products) });
  }
}
