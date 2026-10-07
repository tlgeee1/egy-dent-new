import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_PRODUCTS, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

// 1. جلب المنتجات
async function getLiveProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    return snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);
  } catch { return DEFAULT_PRODUCTS; }
}

// 2. المساعد المحلي الذكي جداً (لو جوجل وبدائلها وقعوا)
function localSmartAI(message: string, products: Product[]): string {
  const q = message.toLowerCase().trim();
  if (q.includes("كافيتي") || q.includes("تحضير")) {
    return `يا دكتور، خطوات تحضير الكافيتي (Cavity Prep) الصح: 1. إزالة التسوس بـ Round bur. 2. عمل Outline form. 3. تنظيف وتجفيف (Moist dentin). 4. تطبيق الـ Etch والـ Bond. متاح عندنا أفضل أنواع الكومبوزيت، تحب تشوف الأسعار؟ 🦷`;
  }
  if (q.includes("فرق") || q.includes("افضل") || q.includes("أفضل")) {
    return `بص يا دكتور، الفرق دايماً بيكون في اللزوجة وقوة التحمل. الـ Flowable للتجاويف الصغيرة والـ Packable للأسنان الخلفية عشان بيتحمل الضغط. متاح عندنا ماركات (شوفو، ميتا، وبرازيلي) بأسعار ممتازة. 🦷`;
  }
  const searchWords = q.split(" ").filter(w => w.length > 2 && !["عايز","بكام","سعر"].includes(w));
  const matched = products.filter(p => searchWords.some(w => p.name.toLowerCase().includes(w)));
  if (matched.length > 0) {
    const list = matched.slice(0, 6).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
    return `دي الأصناف المتاحة عندنا بناءً على سؤالك:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
  }
  return `أهلاً بك يا دكتور! متاح عندنا كل خامات ومستلزمات الأسنان الأصلية بأفضل أسعار. اطلب اللي محتاجه أو اسألني عن أي خامة وهرد عليك فوراً. 🦷`;
}

// 3. الهاندلر الرئيسي (بيجرب جوجل -> ثم البديل المجاني -> ثم المحلي)
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { message } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const products = await getLiveProducts();

  const productLines = products.slice(0, 50).map(p => `- ${p.name}: ${p.price} ج`).join("\n");
  const systemPrompt = `أنت طبيب أسنان ومساعد متجر إيجي دنت. رد بالعامية المصرية باختصار. المنتجات: \n${productLines}`;

  // --- المحاولة 1: جوجل (بالمسار الجديد v1 المستقر) ---
  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nسؤال الدكتور: ${message}` }] }] })
      });
      const data = await response.json();
      if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ reply: data.candidates[0].content.parts[0].text.trim() });
      }
    } catch (e) { console.error("Gemini v1 failed"); }
  }

  // --- المحاولة 2: البديل الاحترافي (GPT-4o Proxy) ---
  try {
    const fallbackRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
        model: "openai",
        temperature: 0.3
      })
    });
    if (fallbackRes.ok) {
      const reply = await fallbackRes.text();
      return res.status(200).json({ reply: reply.trim() });
    }
  } catch (e) { console.error("Fallback AI failed"); }

  // --- المحاولة 3: الرد المحلي (مستحيل يفشل) ---
  return res.status(200).json({ reply: localSmartAI(message, products) });
}
